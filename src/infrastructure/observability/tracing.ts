import { NodeSDK } from '@opentelemetry/sdk-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { IORedisInstrumentation } from '@opentelemetry/instrumentation-ioredis';
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
    ],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk.shutdown().catch(() => undefined);
  });
};
