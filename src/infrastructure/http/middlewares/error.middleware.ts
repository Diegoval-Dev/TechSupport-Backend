import { Request, Response } from 'express';
import { BaseError } from '../../../shared/errors/BaseError';
import { logger } from '../../logger/logger';

export const errorMiddleware = (err: Error, _req: Request, res: Response) => {
  if (err instanceof BaseError) {
    logger.warn({ err }, err.message);

    return res.status(err.statusCode).json({
      message: err.message,
    });
  }

  logger.error({ err }, 'Unexpected error');

  return res.status(500).json({
    message: 'Internal server error',
  });
};
