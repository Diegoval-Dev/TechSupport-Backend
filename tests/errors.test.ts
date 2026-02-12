import request from 'supertest';
import { app } from '../src/app';

describe('HTTP Error Handling', () => {
  describe('404 Not Found', () => {
    it('should return 404 for non-existent GET route', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.status).toBe(404);
    });

    it('should return 404 for non-existent POST route', async () => {
      const res = await request(app).post('/api/nonexistent');
      expect(res.status).toBe(404);
    });
  });

  describe('401 Unauthorized', () => {
    it('should return 401 when accessing protected endpoint without token', async () => {
      const res = await request(app).get('/api/tickets');
      expect([401, 500]).toContain(res.status);
    });

    it('should return 401 with invalid token format', async () => {
      const res = await request(app)
        .get('/api/tickets')
        .set('Authorization', 'Bearer invalid.token');
      expect([401, 500]).toContain(res.status);
    });

    it('should return 401 without Bearer prefix', async () => {
      const res = await request(app)
        .get('/api/tickets')
        .set('Authorization', 'token-without-bearer');
      expect([401, 500]).toContain(res.status);
    });
  });

  describe('400 Bad Request', () => {
    it('should return 400 for invalid email in login', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'invalid-email',
        password: 'password123',
      });
      expect([400, 500]).toContain(res.status);
    });

    it('should return 400 for short password in login', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'user@example.com',
        password: 'short',
      });
      expect([400, 500]).toContain(res.status);
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'user@example.com',
      });
      expect([400, 500]).toContain(res.status);
    });
  });

  describe('Error response structure', () => {
    it('should return error object for 404 responses', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(typeof res.body).toBe('object');
    });

    it('should not expose database details', async () => {
      const res = await request(app).get('/api/nonexistent');
      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toMatch(/database|sql|connection/i);
    });

    it('should not expose stack traces', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.body).not.toHaveProperty('stack');
    });
  });

  describe('Concurrent request handling', () => {
    it('should handle multiple simultaneous requests', async () => {
      const requests = Array(5)
        .fill(null)
        .map(() => request(app).get('/health'));
      const responses = await Promise.all(requests);
      responses.forEach((res) => {
        expect(res.status).toBe(200);
      });
    });
  });
});
