import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { errorMiddleware } from './infrastructure/http/middlewares/error.middleware';
import { notFoundMiddleware } from './infrastructure/http/middlewares/notFound.middleware';
import router from './infrastructure/http/routes';
import { metricsMiddleware } from './infrastructure/http/middlewares/metrics.middleware';
import { register } from './infrastructure/observability/metrics';

export const app = express();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use(limiter);
app.use(metricsMiddleware);
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});
app.get('/health/metrics', async (_req, res) => {
  res.json({
    uptimeSeconds: process.uptime(),
    memoryUsage: process.memoryUsage(),
  });
});
app.use('/api', router);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

app.get('/metrics', async (_req, res) => {
  res.setHeader('Content-Type', register.contentType);
  res.end(await register.metrics());
});
