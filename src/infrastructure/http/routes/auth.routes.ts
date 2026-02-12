import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.post('/login', AuthController.login);
router.post('/refresh', authMiddleware, AuthController.refresh);
router.post('/logout', authMiddleware, AuthController.logout);

export default router;
