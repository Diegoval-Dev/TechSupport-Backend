import { Router } from 'express';
import fileRoutes from './file.routes';
import queueRoutes from './queue.routes';
import reportRoutes from './report.routes';

const router = Router();

router.use('/files', fileRoutes);
router.use('/queue', queueRoutes);
router.use('/reports', reportRoutes);

export default router;