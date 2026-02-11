import jwt from 'jsonwebtoken';
import { UserRole } from '../../domain/enums/UserRole';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN = '15m';

export interface JwtPayload {
    sub: string;
    role: UserRole;
}

export const signToken = (payload: JwtPayload): string => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};


export const verifyToken = (token: string): JwtPayload => {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
};