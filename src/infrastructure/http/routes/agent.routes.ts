import { Router } from 'express';
import { AgentController } from '../controllers/AgentController';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', AgentController.list);

export default router;
