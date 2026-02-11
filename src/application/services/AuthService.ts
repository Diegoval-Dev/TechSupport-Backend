import { UserRepository } from '../ports/UserRepository';
import { comparePassword } from '../../infrastructure/auth/password';
import { signToken } from '../../infrastructure/auth/jwt';
import { ApplicationError } from '../errors/ApplicationError';

export class AuthService {
    constructor(private readonly userRepo: UserRepository) { }

    async login(email: string, password: string) {
        const user = await this.userRepo.findByEmail(email);

        if (!user || !user.active) {
            throw new ApplicationError('Invalid credentials', 401);
        }

        const isValid = await comparePassword(password, user.passwordHash);

        if (!isValid) {
            throw new ApplicationError('Invalid credentials', 401);
        }

        const token = signToken({
            sub: user.id,
            role: user.role,
        });

        return { accessToken: token };
    }
}