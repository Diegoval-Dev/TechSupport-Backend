import { Router } from 'express';
import { FileController } from '../controllers/FileController';

const router = Router();

router.post('/upload', FileController.uploadMiddleware, FileController.upload);

router.get('/status/:processId', FileController.status);

export default router;
