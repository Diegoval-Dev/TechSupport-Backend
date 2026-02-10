import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { errorMiddleware } from './infrastructure/http/middlewares/error.middleware';
import { notFoundMiddleware } from './infrastructure/http/middlewares/notFound.middleware';

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});

app.use(notFoundMiddleware);
app.use(errorMiddleware);