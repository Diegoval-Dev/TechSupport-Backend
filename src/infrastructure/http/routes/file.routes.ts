import { Router, Request, Response, NextFunction } from 'express';
import { FileController } from '../controllers/FileController';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { UserRole } from '../../../domain/enums/UserRole';
import { z } from 'zod';

interface StatusParams {
  processId: string;
}

const statusParamSchema = z.object({
  processId: z.string().uuid(),
});

const validateStatusParam = (req: Request, res: Response, next: NextFunction) => {
  try {
    statusParamSchema.parse({ processId: req.params.processId });
    next();
  } catch (error) {
    return res.status(400).json({
      message: 'Invalid processId format - must be a valid UUID',
      error: error instanceof z.ZodError ? error.message : 'Unknown error',
    });
  }
};

const router = Router();

router.use(authMiddleware);

router.post(
  '/upload',
  requireRole([UserRole.ADMIN, UserRole.SUPERVISOR]),
  FileController.uploadMiddleware,
  FileController.upload,
);

router.get(
  '/status/:processId',
  validateStatusParam,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (req: any, res: Response) => FileController.status(req as Request<StatusParams>, res),
);

export default router;
