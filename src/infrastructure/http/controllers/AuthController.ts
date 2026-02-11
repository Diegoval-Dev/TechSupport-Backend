import { Request, Response } from 'express';
import { AuthService } from '../../../application/services/AuthService';
import { InMemoryUserRepository } from '../../repositories/InMemoryUserRepository';

const authService = new AuthService(new InMemoryUserRepository());

export class AuthController {
    static async login(req: Request, res: Response) {
        const { email, password } = req.body;

        const result = await authService.login(email, password);
        res.json(result);
    }
}