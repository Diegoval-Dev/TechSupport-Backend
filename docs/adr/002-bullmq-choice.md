# ADR 002: Use BullMQ for Asynchronous Excel Processing

## Status

Accepted

## Date

2026-02-10

## Context

The system must process large Excel files (minimum 5,000 records) asynchronously.

Requirements:

- Parallel processing (10 concurrent workers)
- Retry mechanism (max 3 attempts)
- Dead Letter Queue for failed jobs
- Progress tracking (X of Y processed)
- Non-blocking HTTP endpoint
- Redis-backed durability

This eliminates simple in-memory queues or naive background tasks.

## Decision

Use **BullMQ** with Redis.

Configuration includes:

- Concurrency = 10
- Exponential backoff
- 3 retries per job
- Dedicated Dead Letter Queue
- Job progress tracking via MongoDB

Queue initialization uses lazy loading to avoid unwanted connections during tests.

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

- Built-in retry logic
- Concurrency control
- Production-grade durability
- DLQ implementation straightforward
- Redis already required for rate limiting

### Negative

- Requires Redis availability
- Additional complexity in testing (handled via environment isolation)

## Future Improvements

- Move SLA checks to background jobs
- Add queue monitoring dashboard
- Horizontal scaling via multiple worker instances
