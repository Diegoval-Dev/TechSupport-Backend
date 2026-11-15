import { NextFunction, Request, Response } from 'express';
import { BaseError } from '../../../shared/errors/BaseError';
import { logger } from '../../logger/logger';

// The error is also left in res.locals so the http_request log line can explain the failure.
export const LOGGED_ERROR_KEY = 'loggedError';

export interface LoggedError {
  type: string;
  message: string;
  code?: string;
  stack_trace?: string;
  // Raw text of a request body that failed to parse (set by body-parser).
  rawBody?: string;
}

const toEcsError = (err: Error) => ({
  type: err.name,
  message: err.message,
  stack_trace: err.stack,
});

const toLoggedError = (err: Error): LoggedError => {
  const { code, body, type } = err as Error & { code?: unknown; body?: unknown; type?: unknown };
  const errorCode = code ?? type; // Prisma: P2003...; body-parser: entity.parse.failed...
  return {
    ...toEcsError(err),
    code:
      typeof errorCode === 'string' || typeof errorCode === 'number'
        ? String(errorCode)
        : undefined,
    rawBody: typeof body === 'string' ? body : undefined,
  };
};

// Express identifies error handlers by their 4-argument arity
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorMiddleware = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.locals[LOGGED_ERROR_KEY] = toLoggedError(err);

  if (err instanceof BaseError) {
    logger.warn({ error: toEcsError(err) }, err.message);

    return res.status(err.statusCode).json({
      message: err.message,
    });
  }

  logger.error({ error: toEcsError(err) }, 'Unexpected error');

  return res.status(500).json({
    message: 'Internal server error',
  });
};
