import request from 'supertest';
import type { Express } from 'express';

const loadAppWithLimit = (max: string): Express => {
  process.env.RATE_LIMIT_MAX = max;
  let loaded: Express | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = require('../src/app').app;
  });
  delete process.env.RATE_LIMIT_MAX;
  return loaded as Express;
};

describe('Rate limiter', () => {
  it('honours RATE_LIMIT_MAX on /api routes', async () => {
    const app = loadAppWithLimit('2');
    await request(app).get('/api/nonexistent').expect(404);
    await request(app).get('/api/nonexistent').expect(404);
    await request(app).get('/api/nonexistent').expect(429);
  });

  it('never limits the monitoring endpoints', async () => {
    const app = loadAppWithLimit('1');
    for (let i = 0; i < 3; i++) {
      await request(app).get('/health').expect(200);
    }
  });
});
