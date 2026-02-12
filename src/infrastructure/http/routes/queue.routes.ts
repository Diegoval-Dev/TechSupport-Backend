import { Router } from 'express';
import { QueueController } from '../controllers/QueueController';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { UserRole } from '../../../domain/enums/UserRole';

const router = Router();

router.use(authMiddleware);
router.use(requireRole([UserRole.ADMIN]));

router.get('/stats', QueueController.stats);
router.get('/dlq', QueueController.deadLetters);

export default router;
