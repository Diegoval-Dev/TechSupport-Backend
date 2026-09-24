export interface AgentDTO {
  id: string;
  name: string;
  email: string;
  level: number;
  active: boolean;
}

export interface AgentFilters {
  search?: string;
  active?: boolean;
  page?: number;
  pageSize?: number;
}

export interface AgentRepository {
  findAll(filters: AgentFilters): Promise<{
    data: AgentDTO[];
    total: number;
    page: number;
    pageSize: number;
  }>;
}
