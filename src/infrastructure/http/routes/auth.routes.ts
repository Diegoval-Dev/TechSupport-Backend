import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { UserRole } from '../../../domain/enums/UserRole';

const router = Router();

router.post('/login', AuthController.login);
router.post('/register', authMiddleware, requireRole([UserRole.ADMIN]), AuthController.register);
router.post('/refresh', authMiddleware, AuthController.refresh);
router.post('/logout', authMiddleware, AuthController.logout);

export default router;
