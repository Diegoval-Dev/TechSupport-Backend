import { RefreshTokenRepository } from '../../application/ports/RefreshTokenRepository';

export class InMemoryRefreshTokenRepository implements RefreshTokenRepository {
  private store = new Map<string, Set<string>>();

  async save(userId: string, token: string): Promise<void> {
    const tokens = this.store.get(userId) ?? new Set();
    tokens.add(token);
    this.store.set(userId, tokens);
  }

  async exists(userId: string, token: string): Promise<boolean> {
    return this.store.get(userId)?.has(token) ?? false;
  }

  async delete(userId: string, token: string): Promise<void> {
    this.store.get(userId)?.delete(token);
  }
}
