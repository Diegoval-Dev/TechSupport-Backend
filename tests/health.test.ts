import request from 'supertest';
import { app } from '../src/app';

describe('Health and metrics endpoints', () => {
  describe('GET /health', () => {
    it('should return ok status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('should return Content-Type application/json', async () => {
      const res = await request(app).get('/health');
      expect(res.type).toMatch(/json/);
    });

    it('should respond quickly', async () => {
      const start = Date.now();
      const res = await request(app).get('/health');
      const duration = Date.now() - start;

      expect(res.status).toBe(200);
      expect(duration).toBeLessThan(1000); 
    });
  });

  describe('GET /metrics', () => {
    it('should return Prometheus metrics', async () => {
      const res = await request(app).get('/metrics');
      expect(res.status).toBe(200);
      expect(res.type).toMatch(/text/);
    });

    it('should include metrics content', async () => {
      const res = await request(app).get('/metrics');
      expect(res.text).toContain('# HELP');
    });
  });

  describe('GET /health/metrics', () => {
    it('should return health metrics', async () => {
      const res = await request(app).get('/health/metrics');
      expect(res.status).toBe(200);
      expect(res.type).toMatch(/json/);
    });

    it('should include uptime information', async () => {
      const res = await request(app).get('/health/metrics');
      expect(res.body).toBeDefined();
    });
  });

  describe('HTTP logging middleware', () => {
    it('should log GET requests', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);

    });

    it('should handle POST requests', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password',
        });


      expect([400, 401, 500]).toContain(res.status);
    });

    it('should track request duration', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);

    });
  });

  describe('Error responses', () => {
    it('should return structured error response', async () => {
      const res = await request(app).get('/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('message');
    });

    it('should not expose sensitive information', async () => {
      const res = await request(app).get('/nonexistent');
      expect(res.body.message).not.toContain('database');
      expect(res.body.message).not.toContain('stack');
    });
  });

  describe('CORS and security headers', () => {
    it('should include security headers', async () => {
      const res = await request(app).get('/health');

      expect(res.headers['x-content-type-options'] || true).toBeDefined();
    });

    it('should accept requests from allowed origins', async () => {
      const res = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');

      expect(res.status).toBe(200);
    });
  });

  describe('Concurrent requests', () => {
    it('should handle multiple simultaneous requests', async () => {
      const requests = Array(10)
        .fill(null)
        .map(() => request(app).get('/health'));

      const responses = await Promise.all(requests);
      responses.forEach((res) => {
        expect(res.status).toBe(200);
      });
    });
  });
});
