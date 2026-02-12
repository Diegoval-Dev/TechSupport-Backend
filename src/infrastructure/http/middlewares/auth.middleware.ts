import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../../auth/jwt';

export const authMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new Error('Unauthorized');
  }

  const [, token] = authHeader.split(' ');
  const payload = verifyToken(token);

  req.user = payload;
  next();
};
