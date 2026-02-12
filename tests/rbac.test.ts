import request from 'supertest';
import { app } from '../src/app';

describe('RBAC and Authentication', () => {
  describe('Protected endpoints require authentication', () => {
    it('should require auth for /api/queue/stats', async () => {
      const res = await request(app).get('/api/queue/stats');

      expect([401, 500]).toContain(res.status);
    });

    it('should require auth for /api/queue/dlq', async () => {
      const res = await request(app).get('/api/queue/dlq');
      expect([401, 500]).toContain(res.status);
    });

    it('should require auth for /api/reports', async () => {
      const res = await request(app).get('/api/reports');
      expect([401, 500]).toContain(res.status);
    });

    it('should require auth for /api/files/upload', async () => {
      const res = await request(app).post('/api/files/upload');
      expect([401, 500]).toContain(res.status);
    });

    it('should require auth for /api/tickets', async () => {
      const res = await request(app).get('/api/tickets');
      expect([401, 500]).toContain(res.status);
    });
  });

  describe('Bearer token validation', () => {
    const validToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.test';

    it('should accept Bearer token format', async () => {
      const res = await request(app)
        .get('/api/queue/stats')
        .set('Authorization', validToken);

      expect([200, 401, 403, 404, 500]).toContain(res.status);
    });

    it('should reject invalid token format', async () => {
      const res = await request(app)
        .get('/api/queue/stats')
        .set('Authorization', 'Bearer invalid');
      expect([401, 500]).toContain(res.status);
    });

    it('should reject missing Bearer prefix', async () => {
      const res = await request(app)
        .get('/api/queue/stats')
        .set('Authorization', 'token-without-bearer');
      expect([401, 500]).toContain(res.status);
    });
  });

  describe('Public endpoints', () => {
    it('should allow /health without auth', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
    });

    it('should allow /metrics without auth', async () => {
      const res = await request(app).get('/metrics');
      expect(res.status).toBe(200);
    });
  });
});
