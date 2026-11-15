import { NextFunction, Request, Response } from 'express';
import { BaseError } from '../../../shared/errors/BaseError';
import { logger } from '../../logger/logger';

// The error is also left in res.locals so the http_request log line can explain the failure.
export const LOGGED_ERROR_KEY = 'loggedError';

export interface LoggedError {
  type: string;
  message: string;
  // One-line cause, e.g. "PrismaClientKnownRequestError (P2003): Foreign key constraint violated: ..."
  summary: string;
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

const MAX_SUMMARY_LENGTH = 300;

// Prisma messages embed the calling code ("Invalid `prisma.x()` invocation in <file>", numbered
// source lines); keep only the lines that say what went wrong.
const isPrismaNoise = (line: string) =>
  /^Invalid `.*` invocation/.test(line) ||
  /^(→\s*)?\d+\s/.test(line) ||
  /^\/\S+:\d+:\d+$/.test(line);

const summarizeMessage = (message: string) => {
  const lines = message
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !isPrismaNoise(line));
  const summary = (lines.length ? lines : [message.trim()]).join(' ');
  return summary.length > MAX_SUMMARY_LENGTH
    ? `${summary.slice(0, MAX_SUMMARY_LENGTH)}...`
    : summary;
};

const toLoggedError = (err: Error): LoggedError => {
  const { code, body, type } = err as Error & { code?: unknown; body?: unknown; type?: unknown };
  const errorCode = code ?? type; // Prisma: P2003...; body-parser: entity.parse.failed...
  const codeText =
    typeof errorCode === 'string' || typeof errorCode === 'number' ? String(errorCode) : undefined;
  return {
    ...toEcsError(err),
    summary: `${err.name}${codeText ? ` (${codeText})` : ''}: ${summarizeMessage(err.message)}`,
    code: codeText,
    rawBody: typeof body === 'string' ? body : undefined,
  };
};

// Express identifies error handlers by their 4-argument arity
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorMiddleware = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  const loggedError = toLoggedError(err);
  res.locals[LOGGED_ERROR_KEY] = loggedError;

  if (err instanceof BaseError) {
    logger.warn({ error: toEcsError(err) }, err.message);

    return res.status(err.statusCode).json({
      message: err.message,
    });
  }

  logger.error(
    { error: toEcsError(err) },
    `Unexpected error on ${req.method} ${req.originalUrl.split('?')[0]}: ${loggedError.summary}`,
  );

  return res.status(500).json({
    message: 'Internal server error',
  });
};
