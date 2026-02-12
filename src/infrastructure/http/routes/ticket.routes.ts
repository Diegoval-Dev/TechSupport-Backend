import { Router } from 'express';
import { TicketController } from '../controllers/TicketController';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/', TicketController.create);
router.get('/', TicketController.list);
router.patch('/:id/status', TicketController.updateStatus);
router.patch('/:id/assign', TicketController.assignAgent);
router.delete('/:id', TicketController.delete);

export default router;
