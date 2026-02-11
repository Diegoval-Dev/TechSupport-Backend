import { UserRole } from '../../domain/enums/UserRole';

declare global {
    namespace Express {
        interface Request {
            user: {
                sub: string;
                role: UserRole;
            };
        }
    }
}