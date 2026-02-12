import { Router } from 'express';
import { ReportController } from '../controllers/ReportController';

const router = Router();

router.get('/avg-resolution', ReportController.avgResolution);
router.get('/escalated-per-month', ReportController.escalated);
router.get('/top-agents', ReportController.topAgents);
router.get('/weekly-status', ReportController.weeklyStatus);
router.get('/last-processes', ReportController.lastProcesses);

export default router;
