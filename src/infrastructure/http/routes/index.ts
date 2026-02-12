import { Router } from 'express';
import fileRoutes from './file.routes';
import queueRoutes from './queue.routes';

const router = Router();

router.use('/files', fileRoutes);
router.use('/queue', queueRoutes);

export default router;