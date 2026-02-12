import { UserRepository } from '../ports/UserRepository';
import { comparePassword } from '../../infrastructure/auth/password';
import { ApplicationError } from '../errors/ApplicationError';
import { TokenService } from './TokenService';
import { UserRole } from '../../domain/enums/UserRole';

export class AuthService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly tokenService: TokenService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.userRepo.findByEmail(email);

    if (!user || !user.active) {
      throw new ApplicationError('Invalid credentials', 401);
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      throw new ApplicationError('Invalid credentials', 401);
    }

    return this.tokenService.generateTokens(user.id, user.role);
  }

  async refresh(userId: string, refreshToken: string) {
    const valid = await this.tokenService.validateRefreshToken(userId, refreshToken);

    if (!valid) {
      throw new ApplicationError('Invalid refresh token', 401);
    }

    return this.tokenService.generateTokens(userId, UserRole.AGENT);
  }

  async logout(userId: string, refreshToken: string) {
    await this.tokenService.revokeRefreshToken(userId, refreshToken);
  }
}
