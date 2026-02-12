# TechSupport Pro — Backend System

## Summary
TechSupport Pro is a backend system for technical support tickets with SLA enforcement, asynchronous Excel ingestion, and production-grade observability. It was built for a technical assessment to demonstrate clean architecture, system design, and operational maturity.

## Problem context
The company serves two client tiers:
- VIP: 2-hour SLA with automatic escalation when breached
- Normal: 24-hour SLA with a supervisor notification when breached

In addition, the company needs to process large historical Excel files to generate performance reports.

## Architecture
Clean Architecture with explicit boundaries:

Controller → Application Service → Repository → Infrastructure

Layers:
- Domain: entities and business rules
- Application: use cases and ports
- Infrastructure: persistence, queues, http, logging
- Interfaces: Express controllers and routes

ADRs live in [docs/adr](docs/adr).

Simple diagram:

```mermaid
graph TD
  A[HTTP Controller] --> B[Application Service]
  B --> C[Repository Port]
  C --> D[Infrastructure Adapter]
  D --> E[(PostgreSQL / MongoDB / Redis)]
```

## Coverage vs requirements
This table reflects the current codebase and is intentionally honest.

| Area | Status | Evidence |
| --- | --- | --- |
| Docker Compose with Node, Postgres, Mongo, Redis | Complete | [docker-compose.yml](docker-compose.yml) |
| CI: lint, build, tests, Docker build | Complete | [.github/workflows/ci.yml](.github/workflows/ci.yml) |
| Clean architecture and separation | Complete | [src](src) |
| Centralized error handling | Complete | [src/shared/errors/BaseError.ts](src/shared/errors/BaseError.ts), [src/infrastructure/http/middlewares/error.middleware.ts](src/infrastructure/http/middlewares/error.middleware.ts) |
| Structured logging | Complete | [src/infrastructure/logger/logger.ts](src/infrastructure/logger/logger.ts) |
| Metrics endpoint and HTTP metrics | Complete | [src/infrastructure/observability/metrics.ts](src/infrastructure/observability/metrics.ts) |
| Async Excel processing with retries and DLQ | Complete | [src/infrastructure/queue](src/infrastructure/queue), [src/infrastructure/workers/ticketProcessor.worker.ts](src/infrastructure/workers/ticketProcessor.worker.ts) |
| Reports from MongoDB | Complete | [src/application/services/ReportService.ts](src/application/services/ReportService.ts) |
| Ticket CRUD and SLA logic | Partial | Create, list with filters and pagination, soft delete, status change, and assignment are implemented; SLA scheduler runs in-process |
| Auth endpoints and roles | Partial | Login/refresh/logout/register implemented; user management is still in-memory |
| ADRs documented | Complete | [docs/adr](docs/adr) |

## Tech stack
- Runtime: Node.js, TypeScript, Express
- Datastores: PostgreSQL (Prisma), MongoDB (logs and reports)
- Queue: BullMQ + Redis
- Auth: JWT, bcrypt
- Observability: prom-client, pino
- Testing: Jest, Supertest

## Data model and indices
PostgreSQL (Prisma):
- Ticket indexes: status, clientId, createdAt

MongoDB:
- TicketLog indexes: createdAt, clientType, agentId, escalationLevel

## Security and quality controls
- Global rate limiting: 100 requests per 15 minutes
- Security headers via helmet
- Zod validation for auth and ticket endpoints
- Centralized error handling with typed errors

Not implemented yet:
- Request timeout middleware (package is installed but not wired)
- SQL injection protection is provided by Prisma, but validation is still needed

## API endpoints
Base URL: `/api`

Health and metrics:
- `GET /health`
- `GET /health/metrics`
- `GET /metrics`

Auth:
- `POST /api/auth/login`
- `POST /api/auth/register` (admin only)
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

Tickets:
- `POST /api/tickets` (create)
- `GET /api/tickets` (list with filters)
- `PATCH /api/tickets/:id/status` (status change)
- `PATCH /api/tickets/:id/assign` (assign agent)
- `DELETE /api/tickets/:id` (soft delete)

Ticket list filters:
- `status`: `OPEN` | `IN_PROGRESS` | `RESOLVED` | `CLOSED` | `ESCALATED`
- `priority`: number
- `clientId`: uuid
- `from`: ISO date
- `to`: ISO date
- `page`: number (default 1)
- `pageSize`: number (default 20, max 100)

Files:
- `POST /api/files/upload` (multipart, field `file`)
- `GET /api/files/status/:processId`

Queue:
- `GET /api/queue/stats`
- `GET /api/queue/dlq`

Reports:
- `GET /api/reports/avg-resolution`
- `GET /api/reports/escalated-per-month`
- `GET /api/reports/top-agents`
- `GET /api/reports/weekly-status`
- `GET /api/reports/last-processes`

## Implementation highlights
Async Excel pipeline:
- Upload creates a FileProcess document and enqueues each row as a job
- Worker concurrency set to 10
- Jobs retry up to 3 times with exponential backoff
- Failed jobs move to a DLQ after retries
- Processing status is persisted in MongoDB

SLA and domain rules:
- SLA breach handling is implemented in `SLAService`
- Domain entity enforces legal state transitions
- Status update uses a transaction to prevent race conditions

Authentication:
- JWT access tokens + refresh tokens
- In-memory user and refresh token repositories (swap-ready)
- Default admin user for local testing: `admin@techsupport.pro` / `admin123`

## Getting started
### Requirements
- Docker and Docker Compose
- Node.js 18+

### Environment
Create a `.env` file in the project root:

```env
NODE_ENV=development
PORT=3000

DATABASE_URL=postgresql://techsupport:techsupport@postgres:5432/techsupport
REDIS_HOST=redis
REDIS_PORT=6379
MONGO_URI=mongodb://mongo:27017/techsupport
JWT_SECRET=supersecret
```

### Run with Docker
```bash
docker compose up --build
```

### Run locally
```bash
npm install
npm run dev
```

### Tests
```bash
npm test
```

## Scripts
```bash
npm run dev
npm run build
npm run start
npm run lint
npm run format
npm run test
npm run generate:excel
```

`npm run generate:excel` creates a sample `tickets_5000.xlsx` file.


