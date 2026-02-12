import { Router, Request, Response, NextFunction } from 'express';
import { FileController } from '../controllers/FileController';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { UserRole } from '../../../domain/enums/UserRole';
import { z } from 'zod';

const statusParamSchema = z.object({
  processId: z.string().uuid(),
});

const validateStatusParam = (req: Request, _res: Response, next: NextFunction) => {
  try {
    statusParamSchema.parse({ processId: req.params.processId });
    next();
  } catch (error) {
    next(error);
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

router.get('/status/:processId', validateStatusParam, (req: any, res: Response) =>
  FileController.status(req, res),
);

export default router;
