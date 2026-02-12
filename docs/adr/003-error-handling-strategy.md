# ADR 003: Centralized Error Handling Strategy

## Status
Accepted

## Date
2026-02-10

## Context

The application includes:

- Domain rule violations (e.g., invalid state transition)
- Application errors (e.g., unauthorized access)
- Infrastructure failures (e.g., DB or Redis failure)
- Validation errors (Zod schemas)

Without structured error handling:

- Responses become inconsistent
- HTTP logic leaks into business layer
- Debugging becomes difficult
- Logging becomes fragmented

We need:

- Predictable HTTP responses
- Separation between operational errors and programming errors
- Structured logging
- Extensibility

## Decision

Implement:

1. `BaseError` abstract class
2. `DomainError` for business rule violations
3. `ApplicationError` for use-case level failures
4. Centralized Express error middleware
5. Structured logging via Pino (JSON format)

Error flow:

- Domain throws DomainError
- Application converts to HTTP semantics
- Middleware formats final response

Operational vs unexpected errors are distinguished.

## Alternatives Considered

### 1. Throwing generic Error everywhere
Rejected:
- No status control
- No structured classification
- Poor observability

### 2. Returning Result objects instead of throwing
Rejected:
- Adds verbosity
- Increases cognitive load
- Less idiomatic in Express ecosystem

## Consequences

### Positive
- Clean separation of concerns
- Consistent HTTP responses
- Centralized logging
- Improved observability
- Easier monitoring integration

### Negative
- Requires discipline to avoid throwing raw errors
- Slightly more boilerplate

## Observability Integration

Errors are logged in structured JSON format and compatible with log aggregation systems (ELK, Datadog).