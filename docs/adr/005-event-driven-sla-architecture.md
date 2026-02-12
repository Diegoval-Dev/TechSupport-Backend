# ADR 005: Event-Driven SLA Architecture with Async Processing

## Status

Accepted

## Date

2026-02-12

## Context

Initial SLA implementation had a critical flaw:

- SLA scheduler **directly modified the database** during checking
- Running in a single process (`setInterval()`)
- Blocking I/O: if DB is slow, next iteration missed deadline
- No separation between "checking" and "notifying"
- Notifications (email, webhook, supervisor alert) could not be added without hardcoding

**Problem Example:**

```typescript
// OLD: Tightly coupled, blocking
const run = async () => {
  for (const ticket of openTickets) {
    if (isBreached) {
      // Direct update - blocks scheduler
      await prisma.ticket.update(...);  
      // Direct send - not idempotent
      await email.send(...);
    }
  }
};
setInterval(run, 60000);  // Must complete in < 60s or next check is dropped
```

Three requirements emerged:

1. **Decoupling:** Separate SLA checking from notification delivery
2. **Scalability:** Multiple workers can process notifications independently
3. **Extensibility:** New notification channels (email, Slack, webhook) without modifying scheduler

## Decision

Implement **Event-Driven Architecture** with asynchronous queue processing:

### 1. Pure SLA Service

`SLAService` becomes a **pure function** that computes SLA state without side effects:

```typescript
interface SLACheckResult {
  escalated: boolean;
  needsSupervisorNotif: boolean;
  ticketId: string;
  clientType: ClientType;
  slaHoursElapsed?: number;
}

class SLAService {
  check(ticket: Ticket, clientType: ClientType): SLACheckResult {
    const diffHours = (now - ticket.createdAt) / 3600000;
    const result = { ticketId, clientType, escalated: false, needsSupervisorNotif: false };
    
    // VIP: 2 hours SLA
    if (clientType === 'VIP' && diffHours >= 2) {
      ticket.escalate();  // Domain state transition
      result.escalated = true;
    }
    
    // NORMAL: 24 hours SLA
    if (clientType === 'NORMAL' && diffHours >= 24) {
      result.needsSupervisorNotif = true;
    }
    
    return result;
  }
}
```

**Advantages:**

- Pure function (no I/O) → testable without database
- Returns event data → extensible to multiple channels
- No side effects → composable with event handlers

### 2. Event Queue (BullMQ)

Create dedicated queue `sla-events` for async event processing:

```typescript
export const getSlaEventQueue = () => {
  if (!slaEventQueue) {
    slaEventQueue = new Queue('sla-events', {
      connection: redisConfig,
      // No retries (non-critical, fire-and-forget)
      // No concurrency limit (events can run in parallel)
    });
  }
  return slaEventQueue;
};
```

### 3. Event Worker

Dedicated worker consumes events and triggers notifications:

```typescript
const worker = new Worker('sla-events', 
  async (job) => {
    const event = job.data;
    
    // Log for observability
    if (event.escalated) {
      logger.info({
        type: 'SLA_ESCALATED',
        ticketId: event.ticketId,
        clientType: event.clientType
      });
      // Future: await escalationService.notify(event);
    }
    
    // Supervisor notification
    if (event.needsSupervisorNotif) {
      logger.warn({
        type: 'SLA_BREACH_NOTIFICATION',
        ticketId: event.ticketId,
        message: `24h SLA breached for ticket (${event.clientType})`
      });
      // Future: await slack.notify('supervisors', event);
    }
  },
  { connection: redisConfig, concurrency: 5 }
);
```

### 4. Refactored Scheduler

Scheduler now **emits events** instead of direct updates:

```typescript
const run = async () => {
  const threshold = new Date(Date.now() - 2 * 60 * 60 * 1000);  // 2h ago
  const tickets = await prisma.ticket.findMany({
    where: { deletedAt: null, status: 'OPEN', createdAt: { lte: threshold } },
    include: { client: true }
  });
  
  const eventQueue = getSlaEventQueue();
  const slaUpdates = [];
  
  for (const item of tickets) {
    const ticket = TicketMapper.toDomain(item);
    const slaResult = slaService.check(ticket, item.client.type);
    
    // 1. Emit event (async, non-blocking)
    await eventQueue.add('process-sla-event', {
      ticketId: slaResult.ticketId,
      clientType: slaResult.clientType,
      escalated: slaResult.escalated,
      needsSupervisorNotif: slaResult.needsSupervisorNotif
    });
    
    // 2. Collect DB updates
    if (ticket.status !== domainTicket.status) {
      slaUpdates.push({
        id: item.id,
        status: ticket.status,
        escalationLevel: ticket['props'].escalationLevel
      });
    }
  }
  
  // 3. Batch DB updates after events sent
  for (const update of slaUpdates) {
    await prisma.ticket.update({
      where: { id: update.id },
      data: update
    });
  }
};

setInterval(run, 60000);  // Runs every 60 seconds (default configurable)
```

**Control Flow:**

```
┌─────────────────┐
│  SLA Scheduler  │ (runs every 60s)
└────────┬────────┘
         │
         ▼
    ┌─────────────────────────────┐
    │ Check SLA on OPEN tickets   │
    │ (compute state changes)     │
    └────────┬────────────────────┘
             │
             ├─────────────────────────────────┐
             │                                 │
             ▼                                 ▼
      ┌──────────────┐            ┌────────────────────┐
      │ Emit events  │            │ Batch DB updates   │
      │ to Redis     │            │ (status/escalation)│
      └──────┬───────┘            └────────────────────┘
             │
             ▼
      ┌──────────────────────────────┐
      │ Event Worker (Redis -> BullMQ)│
      │ Concurrency: 5               │
      └──────┬───────────────────────┘
             │
             ├─────────────┬──────────────┐
             ▼             ▼              ▼
        ┌──────────┐  ┌────────┐  ┌──────────────┐
        │ Log JSON │  │ Slack  │  │ Email        │
        │ (now)    │  │ (defer)│  │ (defer)      │
        └──────────┘  └────────┘  └──────────────┘
```

## Consequences

### Positive

**Decoupling:**

- Scheduler doesn't care where notifications go
- New notification channels added without touching scheduler

**Scalability:**

- Event processing can scale independently (more workers if backlogged)
- SLA checking not blocked by slow notifications
- Multiple subscribers possible (email, Slack, webhook, SMS)

**Reliability:**

- Events persisted in Redis (not lost on crash)
- Failed notifications don't corrupt ticket state
- Event handling can retry independently

**Observability:**

- Every SLA event logged in structured JSON
- Easy to monitor escalations/notifications with log aggregation
- Slack/email delivery tracked separately (decoupled telemetry)

**Extensibility:**

- Add email notifications: Add new worker consumer
- Add Slack alerts: Add new worker consumer
- Add webhook: Add new worker consumer
- **No changes to SLA logic or scheduler**

### Negative

- Redis dependency (another service to operate)
- Event processing has slight latency (≤ 5 seconds typical)
- Requires monitoring of event queue depth (to detect backlog)

**Mitigation:**

- Redis already required for rate limiting → no extra infra
- Async nature is acceptable (notifications don't need to be instant)
- BullMQ includes queue monitoring dashboard

## Alternatives Considered

### 1. Synchronous notifications from scheduler

Rejected:

- Blocks scheduler (if email service is slow, next check is missed)
- Tight coupling (notification code in scheduler)
- No retry mechanism

### 2. Database-backed event log

Rejected:

- Slower than Redis for high-frequency events
- More complex cleanup (archive old events)
- Redis sufficient for SLA events (not long-term requirement)

### 3. Kafka / RabbitMQ for events

Rejected for this scope:

- Overkill (SLA events are not mission-critical)
- Additional operational complexity
- BullMQ + Redis simpler for team size

## Implementation Details

**Queue Configuration:**

```typescript
new Queue('sla-events', {
  connection: redisConfig,
  // No defaultJobOptions (fire-and-forget)
  // All events are processed, none are critical
})
```

**Worker Configuration:**

```typescript
new Worker('sla-events', handler, {
  connection: redisConfig,
  concurrency: 5,  // 5 parallel notifications
  // No retries (notifications are not idempotent)
})
```

**Event Schema:**

```typescript
interface SLAEvent {
  ticketId: string;
  clientType: 'VIP' | 'NORMAL';
  escalated: boolean;
  needsSupervisorNotif: boolean;
  slaHoursElapsed?: number;
  timestamp: string;  // ISO-8601
}
```

**Adding Email Notifications (Future):**

```typescript
// In slaEventWorker.ts
if (event.escalated) {
  await emailService.sendEscalationNotice({
    ticketId: event.ticketId,
    clientType: event.clientType,
    to: 'escalation-team@company.com'
  });
}
```

## Testing Strategy

**Unit Tests (SLAService):**

```typescript
it('should mark VIP ticket as escalated after 2 hours', () => {
  const ticket = createTicket({ createdAt: 3h ago });
  const result = slaService.check(ticket, 'VIP');
  expect(result.escalated).toBe(true);
});
```

**Integration Tests (Scheduler + Queue):**

```typescript
it('should emit SLA_ESCALATED event for breached VIP ticket', async () => {
  const ticket = createTicket({ createdAt: 3h ago, clientType: 'VIP' });
  await scheduler.run();
  
  const event = await eventQueue.getJob(jobId);
  expect(event.data.escalated).toBe(true);
});
```

**Worker Tests (Event Consumption):**

```typescript
it('should log escalation when event is consumed', async () => {
  const event = { escalated: true, ticketId: '123', ... };
  await worker.handle({ data: event });
  expect(logger.info).toHaveBeenCalledWith(
    expect.objectContaining({ type: 'SLA_ESCALATED' })
  );
});
```

## References

- [Event Sourcing Pattern](https://martinfowler.com/eaaDev/EventSourcing.html)
- [BullMQ Job Queues](https://docs.bullmq.io/)
- [Asynchronous Patterns in Node.js](https://nodejs.org/en/docs/guides/nodejs-performance-on-windows/)
- [Apache Kafka vs Redis Streams vs RabbitMQ](https://www.confluent.io/blog/apache-kafka-vs-rabbitmq-vs-redis/)
