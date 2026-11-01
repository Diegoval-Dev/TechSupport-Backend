import fs from 'fs';
import path from 'path';
import pino, { StreamEntry } from 'pino';
import pretty from 'pino-pretty';
import { trace } from '@opentelemetry/api';
import { SERVICE_NAME } from '../observability/serviceInfo';

const LOG_FILE_PATH = process.env.LOG_FILE_PATH || 'logs/app.log';
const DEFAULT_LEVELS: Record<string, string> = { production: 'info', test: 'silent' };
const ECS_VERSION = '8.11.0';

const buildStreams = (): StreamEntry[] => {
  const usePretty = process.env.NODE_ENV === 'development' && process.stdout.isTTY;
  const streams: StreamEntry[] = [
    {
      stream: usePretty
        ? pretty({ colorize: true, translateTime: 'SYS:standard', messageKey: 'message' })
        : process.stdout,
    },
  ];

  if (process.env.NODE_ENV === 'test' || process.env.LOG_TO_FILE === 'false') {
    return streams;
  }

  fs.mkdirSync(path.dirname(LOG_FILE_PATH), { recursive: true });
  streams.push({ stream: pino.destination({ dest: LOG_FILE_PATH, sync: false }) });
  return streams;
};

const traceContextMixin = () => {
  const spanContext = trace.getActiveSpan()?.spanContext();
  if (!spanContext) return {};
  return { trace: { id: spanContext.traceId }, span: { id: spanContext.spanId } };
};

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || DEFAULT_LEVELS[process.env.NODE_ENV ?? ''] || 'debug',
    messageKey: 'message',
    base: { service: { name: SERVICE_NAME }, ecs: { version: ECS_VERSION } },
    timestamp: () => `,"@timestamp":"${new Date().toISOString()}"`,
    formatters: {
      level: (label) => ({ log: { level: label } }),
    },
    mixin: traceContextMixin,
  },
  pino.multistream(buildStreams()),
);
