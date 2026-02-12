import { RefreshTokenRepository } from '../../application/ports/RefreshTokenRepository';
import { prisma } from '../database/prisma';
import bcrypt from 'bcrypt';

export class PrismaRefreshTokenRepository implements RefreshTokenRepository {
  async save(userId: string, token: string): Promise<void> {
    const hashedToken = await bcrypt.hash(token, 10);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        userId,
        token: hashedToken,
        expiresAt,
      },
    });
  }

  async exists(userId: string, token: string): Promise<boolean> {
    const now = new Date();

    const tokens = await prisma.refreshToken.findMany({
      where: {
        userId,
        expiresAt: {
          gt: now,
        },
      },
    });

    for (const storedToken of tokens) {
      const isValid = await bcrypt.compare(token, storedToken.token);
      if (isValid) {
        return true;
      }
    }

    return false;
  }

  async delete(userId: string, token: string): Promise<void> {
    const tokens = await prisma.refreshToken.findMany({
      where: { userId },
    });

    for (const storedToken of tokens) {
      const isValid = await bcrypt.compare(token, storedToken.token);
      if (isValid) {
        await prisma.refreshToken.delete({
          where: { id: storedToken.id },
        });
        return;
      }
    }
  }
}
