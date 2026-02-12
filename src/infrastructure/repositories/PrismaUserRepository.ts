import { CreateUserData, UserRepository } from '../../application/ports/UserRepository';
import { User } from '../../domain/entities/User';
import { prisma } from '../database/prisma';
import { UserRole } from '../../domain/enums/UserRole';

export class PrismaUserRepository implements UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const dbUser = await prisma.user.findUnique({
      where: { email },
    });

    return dbUser ? this.toDomain(dbUser) : null;
  }

  async findById(id: string): Promise<User | null> {
    const dbUser = await prisma.user.findUnique({
      where: { id },
    });

    return dbUser ? this.toDomain(dbUser) : null;
  }

  async create(data: CreateUserData): Promise<User> {
    const dbUser = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
        active: data.active,
      },
    });

    return this.toDomain(dbUser);
  }

  private toDomain(dbUser: { id: string; email: string; passwordHash: string; role: UserRole; active: boolean }): User {
    return new User({
      id: dbUser.id,
      email: dbUser.email,
      passwordHash: dbUser.passwordHash,
      role: dbUser.role,
      active: dbUser.active,
    });
  }
}
