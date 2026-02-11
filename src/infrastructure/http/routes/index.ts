import { Router } from 'express';
import fileRoutes from './file.routes';

const router = Router();

router.use('/files', fileRoutes);

export default router;