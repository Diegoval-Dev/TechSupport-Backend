import { Request, Response, NextFunction } from 'express';
import { logger } from '../../logger/logger';
import { toLoggableBody, toLoggableQuery } from '../../logger/logPayload';
import { LOGGED_ERROR_KEY, LoggedError } from './error.middleware';

const SERVER_ERROR_STATUS = 500;
const CLIENT_ERROR_STATUS = 400;
// Monitoring endpoints are hit every few seconds: keep their lines small (no bodies).
const MONITORING_PATHS = new Set(['/health', '/health/metrics', '/metrics']);

const levelForStatus = (status: number) => {
  if (status >= SERVER_ERROR_STATUS) return 'error';
  if (status >= CLIENT_ERROR_STATUS) return 'warn';
  return 'info';
};

const toBytes = (header: string | number | string[] | undefined) => {
  const bytes = Number(Array.isArray(header) ? header[0] : header);
  return Number.isFinite(bytes) && header !== undefined && header !== '' ? bytes : undefined;
};

const mimeType = (header: string | number | string[] | undefined) =>
  typeof header === 'string' ? header.split(';')[0].trim() || undefined : undefined;

// Drops objects whose fields are all undefined so lines without bodies stay small.
const compact = <T extends Record<string, unknown>>(fields: T) =>
  Object.values(fields).some((value) => value !== undefined) ? fields : undefined;

// Captures what the handler answers by wrapping res.json/res.send before it runs.
const captureResponseBody = (res: Response) => {
  const captured: { body?: unknown; done: boolean } = { done: false };
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);

  res.json = (body?: unknown) => {
    if (!captured.done) Object.assign(captured, { body, done: true });
    return originalJson(body);
  };
  res.send = (body?: unknown) => {
    if (!captured.done) Object.assign(captured, { body, done: true });
    return originalSend(body);
  };

  return captured;
};

const errorFields = (err: LoggedError | undefined, status: number) => {
  if (!err) return undefined;
  return {
    type: err.type,
    message: err.message,
    code: err.code,
    stack_trace: status >= SERVER_ERROR_STATUS ? err.stack_trace : undefined,
  };
};

export const httpLoggingMiddleware = (
  req: Request & { user?: { sub: string; role?: string } },
  res: Response,
  next: NextFunction,
) => {
  const start = process.hrtime.bigint();
  const [urlPath, ...queryParts] = req.originalUrl.split('?');
  const isMonitoring = MONITORING_PATHS.has(urlPath);
  const responseBody = isMonitoring ? undefined : captureResponseBody(res);

  res.on('finish', () => {
    const durationNs = Number(process.hrtime.bigint() - start);
    const status = res.statusCode;
    const err = res.locals[LOGGED_ERROR_KEY] as LoggedError | undefined;
    // A body that failed to parse never reaches req.body; body-parser keeps the raw text on the error.
    const requestBody = req.body ?? err?.rawBody;

    logger[levelForStatus(status)](
      {
        event: { category: 'web', action: 'http_request', duration: durationNs },
        http: {
          request: {
            method: req.method,
            mime_type: isMonitoring ? undefined : mimeType(req.get('content-type')),
            body: isMonitoring
              ? undefined
              : compact({
                  bytes: toBytes(req.get('content-length')),
                  content: toLoggableBody(requestBody),
                }),
          },
          response: {
            status_code: status,
            mime_type: isMonitoring ? undefined : mimeType(res.getHeader('content-type')),
            body: isMonitoring
              ? undefined
              : compact({
                  bytes: toBytes(res.getHeader('content-length')),
                  content: toLoggableBody(responseBody?.body),
                }),
          },
        },
        url: { path: urlPath, query: toLoggableQuery(queryParts.join('?')) },
        user_agent: { original: req.get('user-agent') },
        user: { id: req.user?.sub, roles: req.user?.role ? [req.user.role] : undefined },
        client: { ip: req.ip },
        route: req.route?.path,
        error: errorFields(err, status),
      },
      `${req.method} ${urlPath} ${status}`,
    );
  });

  next();
};
