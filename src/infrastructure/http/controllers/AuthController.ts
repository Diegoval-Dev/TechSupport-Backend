import { Request, Response } from 'express';
import { AuthService } from '../../../application/services/AuthService';
import { InMemoryUserRepository } from '../../repositories/InMemoryUserRepository';
import { InMemoryRefreshTokenRepository } from '../../repositories/InMemoryRefreshTokenRepository';
import { TokenService } from '../../../application/services/TokenService';
import { loginSchema, refreshSchema } from '../validators/auth.schemas';

const userRepo = new InMemoryUserRepository();
const refreshRepo = new InMemoryRefreshTokenRepository();
const tokenService = new TokenService(refreshRepo);
const authService = new AuthService(userRepo, tokenService);

export class AuthController {
    static async login(req: Request, res: Response) {
        const data = loginSchema.parse(req.body);
        const result = await authService.login(data.email, data.password);
        res.json(result);
    }

    static async refresh(req: Request, res: Response) {
        const data = refreshSchema.parse(req.body);
        const userId = req.user.sub;

        const result = await authService.refresh(userId, data.refreshToken);
        res.json(result);
    }

    static async logout(req: Request, res: Response) {
        const data = refreshSchema.parse(req.body);
        await authService.logout(req.user.sub, data.refreshToken);
        res.status(204).send();
    }
}