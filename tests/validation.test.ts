import { z } from 'zod';
import {
  loginSchema,
  registerSchema,
  refreshSchema,
} from '../src/infrastructure/http/validators/auth.schemas';
import {
  createTicketSchema,
  updateStatusSchema,
} from '../src/infrastructure/http/validators/ticket.schemas';

describe('Auth validation schemas', () => {
  describe('loginSchema', () => {
    it('should validate valid login data', () => {
      const validData = {
        email: 'user@example.com',
        password: 'password123',
      };

      expect(() => loginSchema.parse(validData)).not.toThrow();
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'not-an-email',
        password: 'password123',
      };

      expect(() => loginSchema.parse(invalidData)).toThrow(z.ZodError);
    });

    it('should reject short password', () => {
      const invalidData = {
        email: 'user@example.com',
        password: '123',
      };

      expect(() => loginSchema.parse(invalidData)).toThrow(z.ZodError);
    });

    it('should reject missing email', () => {
      const invalidData = {
        password: 'password123',
      };

      expect(() => loginSchema.parse(invalidData)).toThrow(z.ZodError);
    });

    it('should reject missing password', () => {
      const invalidData = {
        email: 'user@example.com',
      };

      expect(() => loginSchema.parse(invalidData)).toThrow(z.ZodError);
    });
  });

  describe('registerSchema', () => {
    it('should validate valid registration data', () => {
      const validData = {
        email: 'newuser@example.com',
        password: 'password123',
        role: 'AGENTE',
      };

      expect(() => registerSchema.parse(validData)).not.toThrow();
    });

    it('should validate all roles', () => {
      const roles = ['ADMIN', 'SUPERVISOR', 'AGENTE'];

      roles.forEach((role) => {
        const validData = {
          email: 'user@example.com',
          password: 'password123',
          role,
        };

        expect(() => registerSchema.parse(validData)).not.toThrow();
      });
    });

    it('should reject invalid role', () => {
      const invalidData = {
        email: 'user@example.com',
        password: 'password123',
        role: 'INVALID_ROLE',
      };

      expect(() => registerSchema.parse(invalidData)).toThrow(z.ZodError);
    });
  });

  describe('refreshSchema', () => {
    it('should validate valid refresh token', () => {
      const validData = {
        refreshToken: 'a'.repeat(32),
      };

      expect(() => refreshSchema.parse(validData)).not.toThrow();
    });

    it('should reject short refresh token', () => {
      const invalidData = {
        refreshToken: 'short',
      };

      expect(() => refreshSchema.parse(invalidData)).toThrow(z.ZodError);
    });

    it('should reject missing refresh token', () => {
      const invalidData = {};

      expect(() => refreshSchema.parse(invalidData)).toThrow(z.ZodError);
    });
  });
});

describe('Ticket validation schemas', () => {
  describe('createTicketSchema', () => {
    it('should validate valid ticket creation data', () => {
      const validData = {
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Test ticket',
        description: 'Test description',
      };

      expect(() => createTicketSchema.parse(validData)).not.toThrow();
    });

    it('should reject invalid UUID clientId', () => {
      const invalidData = {
        clientId: 'not-a-uuid',
        title: 'Test',
        description: 'Test',
      };

      expect(() => createTicketSchema.parse(invalidData)).toThrow(z.ZodError);
    });

    it('should reject short title', () => {
      const invalidData = {
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'ab',
        description: 'Test',
      };

      expect(() => createTicketSchema.parse(invalidData)).toThrow(z.ZodError);
    });

    it('should reject short description', () => {
      const invalidData = {
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Test',
        description: 'ab',
      };

      expect(() => createTicketSchema.parse(invalidData)).toThrow(z.ZodError);
    });
  });

  describe('updateStatusSchema', () => {
    it('should validate valid status updates', () => {
      const validStatuses = ['IN_PROGRESS', 'RESOLVED', 'ESCALATED'];

      validStatuses.forEach((status) => {
        const validData = { status };
        expect(() => updateStatusSchema.parse(validData)).not.toThrow();
      });
    });

    it('should reject invalid status', () => {
      const invalidData = {
        status: 'INVALID_STATUS',
      };

      expect(() => updateStatusSchema.parse(invalidData)).toThrow(
        z.ZodError,
      );
    });

    it('should reject OPEN status in updates', () => {
      const invalidData = {
        status: 'OPEN',
      };

      expect(() => updateStatusSchema.parse(invalidData)).toThrow(z.ZodError);
    });

    it('should reject missing status', () => {
      const invalidData = {};

      expect(() => updateStatusSchema.parse(invalidData)).toThrow(
        z.ZodError,
      );
    });
  });
});
