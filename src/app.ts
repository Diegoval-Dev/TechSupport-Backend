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

export const app = express();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
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
