import { Request, Response, NextFunction } from 'express';
import { logger } from '../../logger/logger';

export const httpLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    logger.info(
      {
        type: 'http_request',
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration_ms: duration,
        userId: (req as any).user?.sub,
        userRole: (req as any).user?.role,
      },
      `${req.method} ${req.path} ${res.statusCode}`,
    );
  });

  next();
};
