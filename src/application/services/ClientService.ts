import { ClientFilters, ClientRepository } from '../ports/ClientRepository';

export class ClientService {
  constructor(private readonly repo: ClientRepository) {}

  async list(filters: ClientFilters) {
    return this.repo.findAll(filters);
  }
}
