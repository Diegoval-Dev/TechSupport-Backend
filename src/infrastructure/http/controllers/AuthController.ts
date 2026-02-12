import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../../../application/services/AuthService';
import { PrismaUserRepository } from '../../repositories/PrismaUserRepository';
import { PrismaRefreshTokenRepository } from '../../repositories/PrismaRefreshTokenRepository';
import { TokenService } from '../../../application/services/TokenService';
import { loginSchema, refreshSchema, registerSchema } from '../validators/auth.schemas';

const userRepo = new PrismaUserRepository();
const refreshRepo = new PrismaRefreshTokenRepository();
const tokenService = new TokenService(refreshRepo);
const authService = new AuthService(userRepo, tokenService);

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const data = registerSchema.parse(req.body);
      const user = await authService.register(
        data.email,
        data.password,
        data.role,
        data.active ?? true,
      );

      res.status(201).json({
        id: user.id,
        email: user.email,
        role: user.role,
        active: user.active,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Invalid request body',
          error: error.message,
        });
      }
      throw error;
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const data = loginSchema.parse(req.body);
      const result = await authService.login(data.email, data.password);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Invalid request body',
          error: error.message,
        });
      }
      throw error;
    }
  }

  static async refresh(req: Request, res: Response) {
    try {
      const data = refreshSchema.parse(req.body);
      const userId = req.user.sub;

      const result = await authService.refresh(userId, data.refreshToken);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Invalid request body',
          error: error.message,
        });
      }
      throw error;
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      const data = refreshSchema.parse(req.body);
      await authService.logout(req.user.sub, data.refreshToken);
      res.status(204).send();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Invalid request body',
          error: error.message,
        });
      }
      throw error;
    }
  }
}
