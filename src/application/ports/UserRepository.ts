import { User } from '../../domain/entities/User';
import { UserRole } from '../../domain/enums/UserRole';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  role: UserRole;
  active: boolean;
}

export interface UserFilters {
  page?: number;
  pageSize?: number;
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
  findAll(filters: UserFilters): Promise<{
    data: User[];
    total: number;
    page: number;
    pageSize: number;
  }>;
}
