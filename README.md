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

| Area                                             | Status   | Evidence                                                                                                                                                                             |
| ------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Docker Compose with Node, Postgres, Mongo, Redis | Complete | [docker-compose.yml](docker-compose.yml)                                                                                                                                             |
| CI: lint, build, tests, Docker build             | Complete | [.github/workflows/ci.yml](.github/workflows/ci.yml)                                                                                                                                 |
| Clean architecture and separation                | Complete | [src](src)                                                                                                                                                                           |
| Centralized error handling                       | Complete | [src/shared/errors/BaseError.ts](src/shared/errors/BaseError.ts), [src/infrastructure/http/middlewares/error.middleware.ts](src/infrastructure/http/middlewares/error.middleware.ts) |
| Structured logging                               | Complete | [src/infrastructure/logger/logger.ts](src/infrastructure/logger/logger.ts)                                                                                                           |
| Metrics endpoint and HTTP metrics                | Complete | [src/infrastructure/observability/metrics.ts](src/infrastructure/observability/metrics.ts)                                                                                           |
| Async Excel processing with retries and DLQ      | Complete | [src/infrastructure/queue](src/infrastructure/queue), [src/infrastructure/workers/ticketProcessor.worker.ts](src/infrastructure/workers/ticketProcessor.worker.ts)                   |
| Reports from MongoDB                             | Complete | [src/application/services/ReportService.ts](src/application/services/ReportService.ts)                                                                                               |
| Ticket CRUD and SLA logic                        | Partial  | Create, list with filters and pagination, soft delete, status change, and assignment are implemented; SLA scheduler runs in-process                                                  |
| Auth endpoints and roles                         | Partial  | Login/refresh/logout/register implemented; user management is still in-memory                                                                                                        |
| ADRs documented                                  | Complete | [docs/adr](docs/adr)                                                                                                                                                                 |

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

### Prerequisites

Before you start, make sure you have the following installed:

- **Docker** and **Docker Compose** (v2.x or higher)
- **Node.js** 20.x or higher
- **npm** 10.x or higher
- **Git**

### Clone the repository

```bash
git clone https://github.com/Diegoval-Dev/TechSupport-Backend.git
cd TechSupport-Backend
```

### Environment setup

The project includes an `.env.example` file with all required variables. Copy it to create your local configuration:

```bash
cp .env.example .env
```

Default `.env` configuration for Docker:

```env
NODE_ENV=development
PORT=3000

DATABASE_URL=postgresql://techsupport:techsupport@postgres:5432/techsupport
REDIS_HOST=redis
REDIS_PORT=6379
MONGO_URI=mongodb://mongo:27017/techsupport
JWT_SECRET=supersecret
REFRESH_TOKEN_SECRET=supersecret-refresh

SLA_SCHEDULER_INTERVAL_MS=60000
```

### Quick start with Docker (recommended)

This is the fastest way to get the entire stack running:

```bash
# Build and start all services (API, PostgreSQL, Redis, MongoDB)
docker compose up --build

# Or run in detached mode
docker compose up -d --build
```

The API will be available at `http://localhost:3000`

**First time setup:**

The database schema is automatically created on startup via the `start.sh` entrypoint script.

**Default credentials:**

- Email: `admin@techsupport.pro`
- Password: `admin123`

### Verify everything is working

```bash
# Check health endpoint
curl http://localhost:3000/health

# Login with default admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@techsupport.pro","password":"admin123"}'
```

You should see an access token in the response.

### Local development (without Docker)

If you prefer to run the API locally while using Dockerized databases:

**1. Start only the databases:**

```bash
docker compose up postgres redis mongo -d
```

**2. Update `.env` to use localhost:**

```env
DATABASE_URL=postgresql://techsupport:techsupport@localhost:5432/techsupport
REDIS_HOST=localhost
MONGO_URI=mongodb://localhost:27017/techsupport
```

**3. Install dependencies and run migrations:**

```bash
npm install
npx prisma generate
npx prisma db push
```

**4. Start the development server:**

```bash
npm run dev
```

The API will start on `http://localhost:3000` with hot reload enabled.

### Running tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Useful commands

```bash
# Linting
npm run lint

# Format code with Prettier
npm run format

# Build TypeScript
npm run build

# Run production build
npm start

# Generate sample Excel file (5000 tickets)
npm run generate:excel

# View Docker logs
docker compose logs -f api

# Stop all containers
docker compose down

# Rebuild without cache
docker compose build --no-cache
```

### Database management

```bash
# Access PostgreSQL
docker compose exec postgres psql -U techsupport -d techsupport

# Access MongoDB shell
docker compose exec mongo mongosh techsupport

# View Prisma Studio (database GUI)
npx prisma studio
```

### Project structure

```
src/
├── domain/          # Business entities and rules
├── application/     # Use cases and services
├── infrastructure/  # External adapters (DB, queue, HTTP)
└── shared/          # Cross-cutting concerns
```
