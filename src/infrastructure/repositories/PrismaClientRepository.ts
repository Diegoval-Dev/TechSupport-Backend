import { prisma } from '../database/prisma';
import { ClientFilters, ClientRepository } from '../../application/ports/ClientRepository';

export class PrismaClientRepository implements ClientRepository {
  async findAll(filters: ClientFilters) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where = filters.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' as const } },
            { email: { contains: filters.search, mode: 'insensitive' as const } },
            { company: { contains: filters.search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      prisma.client.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: pageSize,
      }),
      prisma.client.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }
}
