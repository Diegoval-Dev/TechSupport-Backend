import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../../auth/jwt';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: 'Unauthorized: missing authorization header',
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      return res.status(401).json({
        message: 'Unauthorized: invalid authorization header format',
      });
    }

    const token = parts[1];
    const payload = verifyToken(token);

    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({
      message: `Unauthorized: invalid or expired token, ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
};
