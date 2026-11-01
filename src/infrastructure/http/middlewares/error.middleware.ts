import { NextFunction, Request, Response } from 'express';
import { BaseError } from '../../../shared/errors/BaseError';
import { logger } from '../../logger/logger';

const toEcsError = (err: Error) => ({
  type: err.name,
  message: err.message,
  stack_trace: err.stack,
});

// Express identifies error handlers by their 4-argument arity
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorMiddleware = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
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
