import { Request, Response, NextFunction } from 'express';
import {
  httpErrorCounter,
  httpRequestCounter,
  httpRequestDuration,
  httpRequestsInFlight,
} from '../../observability/metrics';

const UNMATCHED_ROUTE = 'unmatched';
const SERVER_ERROR_STATUS = 500;

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime();
  httpRequestsInFlight.inc();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const duration = diff[0] + diff[1] / 1e9;

    const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : UNMATCHED_ROUTE;

    httpRequestsInFlight.dec();

    httpRequestCounter.inc({
      method: req.method,
      route,
      status: res.statusCode,
    });

    httpRequestDuration.observe({ method: req.method, route }, duration);

    if (res.statusCode >= SERVER_ERROR_STATUS) {
      httpErrorCounter.inc({ method: req.method, route });
    }
  });

  next();
};
