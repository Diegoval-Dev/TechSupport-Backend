import { UserRepository } from '../../application/ports/UserRepository';
import { User } from '../../domain/entities/User';
import { UserRole } from '../../domain/enums/UserRole';
import bcrypt from 'bcrypt';

export class InMemoryUserRepository implements UserRepository {
  private users: User[] = [
    new User({
      id: '1',
      email: 'admin@techsupport.pro',
      passwordHash: bcrypt.hashSync('admin123', 10),
      role: UserRole.ADMIN,
      active: true,
    }),
  ];

  async findByEmail(email: string): Promise<User | null> {
    return this.users.find((u) => u.email === email) ?? null;
  }
}
