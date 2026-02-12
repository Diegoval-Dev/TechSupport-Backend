import { Router } from 'express';
import { QueueController } from '../controllers/QueueController';

const router = Router();

router.get('/stats', QueueController.stats);
router.get('/dlq', QueueController.deadLetters);

export default router;
