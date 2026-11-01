import { startTracing } from './tracing';

if (process.env.NODE_ENV !== 'test') {
  startTracing();
}
