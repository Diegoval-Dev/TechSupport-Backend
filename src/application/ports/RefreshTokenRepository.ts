export interface RefreshTokenRepository {
    save(userId: string, token: string): Promise<void>;
    exists(userId: string, token: string): Promise<boolean>;
    delete(userId: string, token: string): Promise<void>;
}