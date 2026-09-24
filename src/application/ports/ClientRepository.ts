export interface ClientDTO {
  id: string;
  name: string;
  email: string;
  type: 'VIP' | 'NORMAL';
  company: string;
  createdAt: Date;
}

export interface ClientFilters {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ClientRepository {
  findAll(filters: ClientFilters): Promise<{
    data: ClientDTO[];
    total: number;
    page: number;
    pageSize: number;
  }>;
}
