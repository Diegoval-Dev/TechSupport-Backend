import { Router } from 'express';
import authRoutes from './auth.routes';
import fileRoutes from './file.routes';
import queueRoutes from './queue.routes';
import reportRoutes from './report.routes';
import ticketRoutes from './ticket.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/files', fileRoutes);
router.use('/queue', queueRoutes);
router.use('/reports', reportRoutes);
router.use('/tickets', ticketRoutes);

export default router;
