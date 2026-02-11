import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../../../domain/enums/UserRole';

export const requireRole =
    (roles: UserRole[]) =>
        (req: Request, _res: Response, next: NextFunction) => {
            if (!roles.includes(req.user.role)) {
                return next(new Error('Forbidden'));
            }
            next();
        };