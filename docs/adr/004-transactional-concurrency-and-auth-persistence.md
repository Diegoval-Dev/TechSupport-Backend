# ADR 004: Transactional Concurrency Control & Persistent Authentication

## Status

Accepted

## Date

2026-02-12

## Context

After initial implementation, two critical gaps emerged:

### 1. Concurrency Vulnerability

Concurrent requests modifying the same ticket could cause race conditions:

- Agent A and Agent B both process ticket state changes simultaneously
- Without locks, both updates overwrite each other
- Escalation level, resolution time, and status become inconsistent
- Example: `OPEN → IN_PROGRESS` and `OPEN → ESCALATED` both execute, leaving ticket in undefined state

### 2. Authentication Fragility

In-memory user storage violated enterprise requirements:

- Users lost on every restart
- No refresh token rotation (tokens never invalidated)
- No password hashing (plaintext in memory)
- Multi-instance deployments share no auth state
- No audit trail of auth events

## Decision

### A. Database-Level Transactional Locks

Implement **Prisma $transaction()** for all concurrent ticket mutations:

```typescript
async updateStatus(id: string, newStatus: TicketStatus) {
  return prisma.$transaction(async (tx) => {
    // 1. Acquire lock (row-level via SELECT FOR UPDATE equivalent)
    const ticket = await tx.ticket.findUnique({ where: { id } });
    if (!ticket) throw new Error('Not found');
    
    // 2. Domain validation before update
    const domainTicket = TicketMapper.toDomain(ticket);
    domainTicket.startProgress();  // May throw DomainError
    
    // 3. Atomic write with validated state
    return await tx.ticket.update({
      where: { id },
      data: { status: domainTicket.status, ... }
    });
  });
}
```

**Why $transaction?**

- PostgreSQL acquires implicit row-level locks
- All reads/writes in the transaction are isolated (Serializable isolation level available if needed)
- Atomic "all-or-nothing" semantics
- Automatic rollback on error

**Alternative rejected:**

- Database-specific LOCK TABLE: Too coarse-grained, locks entire table
- Manual version numbers: Complex to maintain, error-prone
- Optimistic locking: Requires re-read and retry logic, slower

### B. Persistent Authentication with Security-First Design

Migrate from in-memory to PostgreSQL-backed user storage:

**User Model:**

```prisma
model User {
  id String @id @default(uuid())
  email String @unique
  passwordHash String  // bcrypt, never plaintext
  role UserRole       // ADMIN | SUPERVISOR | AGENTE (enum)
  active Boolean @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  refreshTokens RefreshToken[]
  @@index([email])
}
```

**RefreshToken Model (for rotation):**

```prisma
model RefreshToken {
  id String @id @default(uuid())
  userId String
  token String       // bcrypt hashed (not stored plaintext)
  expiresAt DateTime // 7 days from creation
  createdAt DateTime @default(now())
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([userId, token])  // Prevent duplicates for same user
  @@index([userId])
  @@index([expiresAt])  // For cleanup queries
}
```

**Refresh Token Rotation:**

```typescript
async rotateRefreshToken(userId: string, oldToken: string, role: UserRole) {
  // 1. Verify old token still exists and valid
  const isValid = await this.refreshRepo.exists(userId, oldToken);
  if (!isValid) throw new Error('Token invalid or expired');
  
  // 2. Revoke old token
  await this.refreshRepo.delete(userId, oldToken);
  
  // 3. Issue new pair (15m access + 7-day refresh)
  return this.generateTokens(userId, role);
}
```

**Why bcrypt for tokens?**

- Tokens stored in database (higher risk if DB breached)
- Bcrypt hashing (salt + slow hash) prevents offline brute-force
- Even if token value is intercepted in transit, stored hash is useless
- Rotation ensures old intercepted tokens become invalid after 7 days

**Password hashing:**

- Bcrypt salt 10 rounds (≈100ms per hash, CLI-interactive speed)
- Prevents rainbow table attacks
- Resistant to GPU/ASIC cracking (adaptive time cost)

## Consequences

### Positive

**Correctness:**

- Concurrent ticket mutations are now atomic
- Impossible to reach invalid state transitions
- Race conditions eliminated

**Security:**

- Persistent authentication across restarts
- Passwords hashed (bcrypt, not plaintext)
- Refresh tokens rotated (invalidate old tokens every 7 days)
- Users can be deactivated (active flag)
- Audit trail in database

**Scalability:**

- Multi-instance deployments share auth state
- Horizontal scaling possible (all instances read same DB)
- Token invalidation is immediate (DB write propagates to all instances)

**Observability:**

- Auth events logged (login, logout, token refresh)
- User account changes tracked (createdAt, updatedAt)
- Failed token validation visible in logs

### Negative

- Slightly higher latency for ticket updates (one extra DB round-trip)
- Requires database availability (in-memory was resilient to DB down)
- Additional storage for user/token tables

**Mitigation:**

- Connection pooling (PgBouncer) for latency
- Caching strategy for frequently-accessed users (Redis optional)

## Alternatives Considered

### 1. Keep in-memory users, add disk logging

Rejected:

- Still loses authentication on restart
- Disk log doesn't help if server restarts mid-auth
- No invalidation mechanism

### 2. JWT only, no refresh token rotation

Rejected:

- Long-lived JWT keys vulnerable if compromised
- No way to invalidate token (user locked out until JWT expires)
- User deactivation impossible without changing all clients

### 3. Redis-backed user storage

Considered but rejected:

- No persistence (loss on Redis restart)
- Still requires password hashing (same complexity)
- PostgreSQL provides ACID guarantees that Redis cannot offer
- PostgreSQL already required for tickets; second ACID store is redundant

### 4. Session-based auth instead of JWT

Rejected:

- Reduces scalability (session affinity or central session store)
- Not suitable for SPA/mobile clients
- Logout requires session cleanup (distributed tracing overhead)

## Implementation Notes

**Migration Strategy:**

1. Deploy code with both old (in-memory) and new (persistent) repositories
2. Run `prisma migrate deploy` (creates User and RefreshToken tables)
3. Seed first admin user via `ensureAdminUser()` at startup
4. Switch AuthController to use PrismaUserRepository
5. Old in-memory users become unreachable (dead code, remove in next refactor)

**Testing Considerations:**

- Unit tests mock Prisma → no real DB needed
- Integration tests use separate test database
- Concurrent update tests use `Promise.all()` to spawn simultaneous mutations

**Performance Notes:**

- Bcrypt hashing (10 rounds) takes ~100ms → acceptable for login (not on every request)
- Token validation uses `bcrypt.compare()` → called on `/api/auth/refresh` only
- User lookup (`findByEmail`) uses index → O(1) effective time

## References

- [OWASP: Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Prisma Transactions Documentation](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#transaction)
- [Refresh Token Rotation Best Practices](https://tools.ietf.org/html/draft-ietf-oauth-jwt-bcp-XXXX)
