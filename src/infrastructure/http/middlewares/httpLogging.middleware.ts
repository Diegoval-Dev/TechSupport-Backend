import { Request, Response, NextFunction } from 'express';
import { logger } from '../../logger/logger';

const SERVER_ERROR_STATUS = 500;
const CLIENT_ERROR_STATUS = 400;

const levelForStatus = (status: number) => {
  if (status >= SERVER_ERROR_STATUS) return 'error';
  if (status >= CLIENT_ERROR_STATUS) return 'warn';
  return 'info';
};

export const httpLoggingMiddleware = (
  req: Request & { user?: { sub: string; role?: string } },
  res: Response,
  next: NextFunction,
) => {
  const start = process.hrtime.bigint();
  const urlPath = req.originalUrl.split('?')[0];

  res.on('finish', () => {
    const durationNs = Number(process.hrtime.bigint() - start);
    const status = res.statusCode;

    logger[levelForStatus(status)](
      {
        event: { category: 'web', action: 'http_request', duration: durationNs },
        http: {
          request: { method: req.method },
          response: { status_code: status },
        },
        url: { path: urlPath },
        user_agent: { original: req.get('user-agent') },
        user: { id: req.user?.sub, roles: req.user?.role ? [req.user.role] : undefined },
        client: { ip: req.ip },
        route: req.route?.path,
      },
      `${req.method} ${urlPath} ${status}`,
    );
  });

  next();
};
