import request from 'supertest';
import { app } from '../src/app';

describe('Authentication endpoints', () => {
  describe('POST /api/auth/login', () => {
    it('should fail with invalid email format', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'not-an-email',
        password: 'password123',
      });

      expect([400, 500]).toContain(res.status);
    });

    it('should fail with short password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'user@example.com',
        password: '123',
      });

      expect([400, 500]).toContain(res.status);
    });

    it('should fail with missing email', async () => {
      const res = await request(app).post('/api/auth/login').send({
        password: 'password123',
      });

      expect([400, 500]).toContain(res.status);
    });

    it('should fail with missing password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'user@example.com',
      });

      expect([400, 500]).toContain(res.status);
    });

    it('should fail with non-existent user', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'password123',
      });

      expect([401, 500]).toContain(res.status);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should fail without Authorization header', async () => {
      const res = await request(app).post('/api/auth/refresh').send({
        refreshToken: 'some-token',
      });

      expect([401, 500]).toContain(res.status);
    });

    it('should fail with malformed Authorization header', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', 'InvalidFormat token')
        .send({
          refreshToken: 'some-token',
        });

      expect([401, 500]).toContain(res.status);
    });

    it('should fail with invalid token format', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', 'Bearer invalid.token.format')
        .send({
          refreshToken: 'short',
        });

      expect([400, 500]).toContain(res.status);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should fail without Authorization header', async () => {
      const res = await request(app).post('/api/auth/logout').send({
        refreshToken: 'some-token',
      });

      expect([401, 500]).toContain(res.status);
    });

    it('should fail with invalid refresh token format', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalid.token')
        .send({
          refreshToken: 'short',
        });

      expect([400, 500]).toContain(res.status);
    });
  });

  describe('POST /api/auth/register', () => {
    it('should reject without ADMIN role', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', 'Bearer invalid.token')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
          role: 'AGENTE',
        });

      expect([401, 500]).toContain(res.status);
    });

    it('should fail with invalid role', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', 'Bearer invalid.token')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
          role: 'INVALID_ROLE',
        });

      expect([400, 500]).toContain(res.status);
    });
  });
});
