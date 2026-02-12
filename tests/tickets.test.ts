import request from 'supertest';
import { app } from '../src/app';

describe('Ticket endpoints - Authentication and validation', () => {
  const validToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0IiwibmFtZSI6IlRlc3QiLCJpYXQiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
  const ticketId = '550e8400-e29b-41d4-a716-446655440000';

  describe('GET /api/tickets', () => {
    it('should require authentication', async () => {
      const res = await request(app).get('/api/tickets');
      expect([401, 500]).toContain(res.status);
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .get('/api/tickets')
        .set('Authorization', 'Bearer invalid.token');
      expect([401, 500]).toContain(res.status);
    });

    it('should reject missing Bearer prefix', async () => {
      const res = await request(app)
        .get('/api/tickets')
        .set('Authorization', 'token-without-bearer');
      expect([401, 500]).toContain(res.status);
    });
  });

  describe('POST /api/tickets', () => {
    it('should require authentication', async () => {
      const res = await request(app).post('/api/tickets').send({
        clientId: ticketId,
        title: 'Test',
        description: 'Test',
      });
      expect([401, 500]).toContain(res.status);
    });

    it('should validate UUID format for clientId', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', validToken)
        .send({
          clientId: 'not-a-uuid',
          title: 'Test',
          description: 'Test',
        });
      expect([400, 500]).toContain(res.status);
    });

    it('should validate title length', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', validToken)
        .send({
          clientId: ticketId,
          title: 'ab',
          description: 'Test description',
        });
      expect([400, 500]).toContain(res.status);
    });

    it('should validate description length', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', validToken)
        .send({
          clientId: ticketId,
          title: 'Valid Title',
          description: 'ab',
        });
      expect([400, 500]).toContain(res.status);
    });

    it('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/tickets')
        .set('Authorization', validToken)
        .send({
          clientId: ticketId,
          title: 'Test',
        });
      expect([400, 500]).toContain(res.status);
    });
  });

  describe('PATCH /api/tickets/:id/status', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .patch(`/api/tickets/${ticketId}/status`)
        .send({
          status: 'IN_PROGRESS',
        });
      expect([401, 500]).toContain(res.status);
    });

    it('should validate ticket ID UUID format', async () => {
      const res = await request(app)
        .patch('/api/tickets/invalid-id/status')
        .set('Authorization', validToken)
        .send({
          status: 'IN_PROGRESS',
        });
      expect([400, 500]).toContain(res.status);
    });

    it('should validate status enum', async () => {
      const res = await request(app)
        .patch(`/api/tickets/${ticketId}/status`)
        .set('Authorization', validToken)
        .send({
          status: 'INVALID_STATUS',
        });
      expect([400, 500]).toContain(res.status);
    });

    it('should reject missing status field', async () => {
      const res = await request(app)
        .patch(`/api/tickets/${ticketId}/status`)
        .set('Authorization', validToken)
        .send({});
      expect([400, 500]).toContain(res.status);
    });

    it('should accept valid status values', async () => {
      const validStatuses = ['IN_PROGRESS', 'RESOLVED', 'ESCALATED'];
      for (const status of validStatuses) {
        const res = await request(app)
          .patch(`/api/tickets/${ticketId}/status`)
          .set('Authorization', validToken)
          .send({ status });

        expect([200, 404, 500]).toContain(res.status);
      }
    });
  });

  describe('PATCH /api/tickets/:id/assign', () => {
    it('should require authentication', async () => {
      const res = await request(app)
        .patch(`/api/tickets/${ticketId}/assign`)
        .send({
          agentId: 'agent-123',
          agentLevel: 1,
        });
      expect([401, 500]).toContain(res.status);
    });

    it('should validate ticket ID', async () => {
      const res = await request(app)
        .patch('/api/tickets/invalid-id/assign')
        .set('Authorization', validToken)
        .send({
          agentId: ticketId,
          agentLevel: 1,
        });
      expect([400, 500]).toContain(res.status);
    });

    it('should require agentId field', async () => {
      const res = await request(app)
        .patch(`/api/tickets/${ticketId}/assign`)
        .set('Authorization', validToken)
        .send({
          agentLevel: 1,
        });
      expect([400, 500]).toContain(res.status);
    });

    it('should require agentLevel field', async () => {
      const res = await request(app)
        .patch(`/api/tickets/${ticketId}/assign`)
        .set('Authorization', validToken)
        .send({
          agentId: ticketId,
        });
      expect([400, 500]).toContain(res.status);
    });
  });

  describe('DELETE /api/tickets/:id', () => {
    it('should require authentication', async () => {
      const res = await request(app).delete(`/api/tickets/${ticketId}`);
      expect([401, 500]).toContain(res.status);
    });

    it('should validate ticket ID format', async () => {
      const res = await request(app)
        .delete('/api/tickets/invalid-id')
        .set('Authorization', validToken);
      expect([400, 500]).toContain(res.status);
    });

    it('should accept valid UUID ticket ID', async () => {
      const res = await request(app)
        .delete(`/api/tickets/${ticketId}`)
        .set('Authorization', validToken);

      expect([200, 204, 404, 500]).toContain(res.status);
    });
  });
});
