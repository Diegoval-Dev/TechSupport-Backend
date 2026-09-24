import { prisma } from '../database/prisma';
import { AgentFilters, AgentRepository } from '../../application/ports/AgentRepository';

export class PrismaAgentRepository implements AgentRepository {
  async findAll(filters: AgentFilters) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where = {
      ...(filters.active !== undefined ? { active: filters.active } : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' as const } },
              { email: { contains: filters.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      prisma.agent.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: pageSize,
      }),
      prisma.agent.count({ where }),
    ]);

    return { data, total, page, pageSize };
  }
}
