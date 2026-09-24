import {
  CreateUserData,
  UserFilters,
  UserRepository,
} from '../../application/ports/UserRepository';
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

  async findAll(filters: UserFilters) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.user.count(),
    ]);

    return {
      data: data.map((dbUser) => this.toDomain(dbUser)),
      total,
      page,
      pageSize,
    };
  }

  private toDomain(dbUser: {
    id: string;
    email: string;
    passwordHash: string;
    role: UserRole;
    active: boolean;
  }): User {
    return new User({
      id: dbUser.id,
      email: dbUser.email,
      passwordHash: dbUser.passwordHash,
      role: dbUser.role,
      active: dbUser.active,
    });
  }
}
