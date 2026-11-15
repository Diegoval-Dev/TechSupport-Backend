import { PrismaClient } from '@prisma/client';
import { SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';

export const prisma = new PrismaClient();

// One CLIENT span per Prisma query, child of the current request span, so APM traces show which
// Postgres operations a request ran and how long each took. @prisma/instrumentation 5.x is not
// compatible with the OpenTelemetry SDK used here, hence this middleware. Without a started SDK
// (e.g. in tests) the global tracer is a no-op.
const tracer = trace.getTracer('prisma-client');

const dbHost = (() => {
  try {
    const url = new URL(process.env.DATABASE_URL ?? '');
    return {
      name: url.hostname,
      port: Number(url.port) || 5432,
      db: url.pathname.replace('/', ''),
    };
  } catch {
    return undefined;
  }
})();

prisma.$use((params, next) => {
  const target = params.model ? `${params.model}.${params.action}` : params.action;
  return tracer.startActiveSpan(
    `prisma ${target}`,
    {
      kind: SpanKind.CLIENT,
      attributes: {
        'db.system': 'postgresql',
        'db.operation': params.action,
        ...(params.model ? { 'db.sql.table': params.model } : {}),
        ...(dbHost
          ? { 'db.name': dbHost.db, 'server.address': dbHost.name, 'server.port': dbHost.port }
          : {}),
      },
    },
    async (span) => {
      try {
        return await next(params);
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    },
  );
});
