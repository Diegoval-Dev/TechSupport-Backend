import { NodeSDK } from '@opentelemetry/sdk-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { IORedisInstrumentation } from '@opentelemetry/instrumentation-ioredis';
import { MongoDBInstrumentation } from '@opentelemetry/instrumentation-mongodb';
import { SERVICE_NAME } from './serviceInfo';

const IGNORED_PATHS = ['/health', '/metrics'];

const isIgnoredPath = (url?: string) => IGNORED_PATHS.some((path) => url?.startsWith(path));

export const startTracing = () => {
  const sdk = new NodeSDK({
    resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: SERVICE_NAME }),
    traceExporter: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ? new OTLPTraceExporter() : undefined,
    instrumentations: [
      new HttpInstrumentation({ ignoreIncomingRequestHook: (req) => isIgnoredPath(req.url) }),
      new ExpressInstrumentation(),
      new PgInstrumentation(),
      new IORedisInstrumentation(),
      // Postgres queries go through Prisma's query engine, not the `pg` driver: they are traced by the
      // Prisma middleware in infrastructure/database/prisma.ts instead.
      new MongoDBInstrumentation({
        enhancedDatabaseReporting: false,
        // The instrumentation only emits the new `db.system.name`; Elastic APM 8.15 needs the older
        // `db.system` to classify the span as a MongoDB database call.
        responseHook: (span) => span.setAttribute('db.system', 'mongodb'),
      }),
    ],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk.shutdown().catch(() => undefined);
  });
};
