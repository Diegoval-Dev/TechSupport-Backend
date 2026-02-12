# ADR 001: Adoption of Clean Architecture

## Status

Accepted

## Date

2026-02-10

## Context

The TechSupport Pro backend integrates multiple external systems:

- PostgreSQL (transactional data)
- MongoDB (historical logs and reporting)
- Redis (queue and rate limiting)
- BullMQ (asynchronous processing)
- Express (HTTP layer)

The system contains non-trivial business rules:

- SLA enforcement (VIP 2h, Normal 24h)
- Automatic escalation
- Agent level restrictions
- Concurrency control for ticket state changes

Without a clear architectural boundary, the codebase would quickly become tightly coupled to frameworks and infrastructure concerns, making testing and evolution difficult.

We need:

- Clear separation of business rules
- Framework-agnostic domain logic
- Replaceable infrastructure components
- High testability

## Decision

Adopt Clean Architecture with the following layers:

- **Domain** → Entities and business rules
- **Application** → Use cases and orchestration
- **Infrastructure** → Database, queues, external services
- **Interfaces (HTTP)** → Express controllers and routes

Dependency direction strictly follows:

Controller → Application → Domain  
Infrastructure implements Application ports.

No domain object depends on Express, Prisma, Mongoose, BullMQ, or Redis.

## Alternatives Considered

### 1. Layered MVC (Controller → Service → Repository)

Rejected because:

- Tends to leak infrastructure into services
- Weak domain isolation
- Harder to scale with asynchronous processing

### 2. Feature-based modular architecture

Rejected because:

- Risk of cross-cutting coupling
- Harder to maintain strict domain boundaries

## Consequences

### Positive

- Business logic is isolated and testable
- Infrastructure can be replaced (e.g., Prisma → TypeORM)
- Clear mental model of responsibilities
- Easier to introduce CQRS patterns for reporting

### Negative

- More initial boilerplate
- Slightly higher learning curve
- Requires discipline to maintain boundaries

## Notes

This structure prepares the system for future scalability and team growth.

## Evolution

The clean architecture has proved its value through subsequent improvements:

### ADR 004: Transactional Concurrency & Auth Persistence

The domain layer's independence enabled safe migration from in-memory to persistent authentication:

- **Before:** User and token logic tightly coupled to Express session middleware
- **After:** Pure domain `User` entity + application services that are Infrastructure-agnostic
- **Result:** Swapped from `InMemoryUserRepository` to `PrismaUserRepository` with zero domain changes

Transactional safety (Prisma `$transaction`) isolated to infrastructure layer without affecting business rules.

### ADR 005: Event-Driven SLA Architecture

Clean separation enabled decoupling of SLA checking from notification delivery:

- **Before:** SLA scheduler directly updated database and triggered notifications (tightly coupled)
- **After:** `SLAService` returns pure event objects (testable without I/O), async workers consume events independently
- **Result:** New notification channels (email, Slack, webhook) can be added without touching domain or application logic

The event-driven pattern was possible because application services were already port-based (dependent on abstractions, not implementations).

### Key Evidence of Architecture Strength

| Change | Impact on Domain | Impact on Application | Impact on Infrastructure |
|--------|------------------|----------------------|--------------------------|
| In-memory → PostgreSQL auth | Zero | Zero | Complete replacement |
| Synchronous → Async SLA notifications | Zero | Pure function return | Complete overhaul |
| Ticket update locking | Zero | No changes needed | Added `$transaction()` only |

This demonstrates the value of discipline: **no hack-friendly "quick shortcuts" means future changes are safe and traceable.**


