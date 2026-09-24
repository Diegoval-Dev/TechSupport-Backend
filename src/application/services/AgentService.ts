import { AgentFilters, AgentRepository } from '../ports/AgentRepository';

export class AgentService {
  constructor(private readonly repo: AgentRepository) {}

  async list(filters: AgentFilters) {
    return this.repo.findAll(filters);
  }
}
