import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { errorMiddleware } from './infrastructure/http/middlewares/error.middleware';
import { notFoundMiddleware } from './infrastructure/http/middlewares/notFound.middleware';
import router from './infrastructure/http/routes';
import { metricsMiddleware } from './infrastructure/http/middlewares/metrics.middleware';
import { httpLoggingMiddleware } from './infrastructure/http/middlewares/httpLogging.middleware';
import { register } from './infrastructure/observability/metrics';

const MONITORING_PATHS = ['/health', '/metrics'];
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_RATE_LIMIT_MAX = 100;

export const app = express();
const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: Number(process.env.RATE_LIMIT_MAX) || DEFAULT_RATE_LIMIT_MAX,
  // IPv4 clients arrive as IPv4-mapped IPv6 (::ffff:a.b.c.d); the default /56 mask
  // would put every one of them under the same key, so key by the full address.
  ipv6Subnet: false,
  skip: (req) => MONITORING_PATHS.some((path) => req.path.startsWith(path)),
});

app.use(httpLoggingMiddleware);
app.use(metricsMiddleware);
app.use(limiter);
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req: Request, res: Response, next: (err?: unknown) => void) => {
  req.setTimeout(30000, () => {
    res.status(503).json({ message: 'Request timeout' });
  });
  res.setTimeout(30000, () => {
    res.status(503).json({ message: 'Request timeout' });
  });
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/health/metrics', async (_req, res) => {
  res.json({
    uptimeSeconds: process.uptime(),
    memoryUsage: process.memoryUsage(),
  });
});

app.get('/metrics', async (_req, res) => {
  res.setHeader('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use('/api', router);
app.use(notFoundMiddleware);
app.use(errorMiddleware);
