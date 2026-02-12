import { randomBytes } from 'crypto';
import { signToken } from '../../infrastructure/auth/jwt';
import { RefreshTokenRepository } from '../ports/RefreshTokenRepository';
import { UserRole } from '../../domain/enums/UserRole';

export class TokenService {
  constructor(private readonly refreshRepo: RefreshTokenRepository) {}

  async generateTokens(userId: string, role: UserRole) {
    const accessToken = signToken({ sub: userId, role });

    const refreshToken = randomBytes(32).toString('hex');


    await this.refreshRepo.save(userId, refreshToken);

    return { accessToken, refreshToken };
  }

  async validateRefreshToken(userId: string, token: string) {
    return this.refreshRepo.exists(userId, token);
  }

  async revokeRefreshToken(userId: string, token: string) {
    await this.refreshRepo.delete(userId, token);
  }

  async rotateRefreshToken(userId: string, oldToken: string, role: UserRole) {

    await this.refreshRepo.delete(userId, oldToken);

    return this.generateTokens(userId, role);
  }
}

