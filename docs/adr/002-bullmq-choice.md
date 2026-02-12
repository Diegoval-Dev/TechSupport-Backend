# ADR 002: Use BullMQ for Asynchronous Processing

## Status

Accepted

## Date

2026-02-10

## Context

The system must handle multiple asynchronous workloads:

### 1. Excel File Ingestion

Requirements:

- Parallel processing (10 concurrent workers)
- Retry mechanism (max 3 attempts)
- Dead Letter Queue for failed jobs
- Progress tracking (X of Y processed)
- Non-blocking HTTP endpoint
- Redis-backed durability

### 2. SLA Event Processing

Requirements:

- Fire-and-forget event delivery (no retries)
- Multiple concurrent workers (5 parallel)
- Extensible notification channels (email, Slack, webhook)
- Non-blocking scheduler
- Decoupled from SLA checking logic

This eliminates simple in-memory queues, naive background tasks, or blocking synchronous processing.

## Decision

Use **BullMQ** with Redis as the unified queue infrastructure.

### Ticket Processing Queue (`ticket-jobs`)

Configuration:

- Queue name: `ticket-jobs`
- Concurrency: 10
- Exponential backoff: 2^attempt * 1000ms
- Max retries: 3
- Dedicated Dead Letter Queue
- Job progress tracking via MongoDB
- Lazy loading to avoid test connections

### SLA Event Queue (`sla-events`)

Configuration:

- Queue name: `sla-events`
- Concurrency: 5
- No retries (fire-and-forget)
- No DLQ (non-critical notifications)
- Lazy loading controlled by scheduler

Both queues share Redis connection pool for efficiency.

## Alternatives Considered

### 1. Bull (legacy version)

Rejected:

- BullMQ is the maintained successor
- Better TypeScript support

### 2. Node.js worker threads

Rejected:

- No persistence
- No retry or backoff built-in
- Complex error handling

### 3. RabbitMQ / Kafka

Rejected:

- Overkill for scope
- Higher operational complexity
- Requires additional infrastructure management

## Consequences

### Positive

- Single queue infrastructure for multiple use cases
- Built-in retry logic for critical paths (Excel processing)
- Fire-and-forget semantics for non-critical events (SLA notifications)
- Concurrency control per queue
- Production-grade durability via Redis
- DLQ implementation straightforward
- Redis already required for rate limiting (no additional infra)
- Easy horizontal scaling (multiple workers consume same Redis queue)

### Negative

- Requires Redis availability
- Additional complexity in testing (handled via environment isolation)
- Redis persistence must be configured appropriately

## Future Improvements

- Add queue monitoring dashboard (Bull Board)
- Implement queue metrics export (Prometheus)
- Archive old events to cold storage (S3/Glacier)
- Horizontal scaling with worker process pool per instance
- Email notifications via SLA event worker
- Slack/webhook integrations for real-time alerts
