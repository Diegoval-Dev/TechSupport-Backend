import { Router } from 'express';
import { ReportController } from '../controllers/ReportController';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { UserRole } from '../../../domain/enums/UserRole';

const router = Router();

router.use(authMiddleware);
router.use(requireRole([UserRole.ADMIN, UserRole.SUPERVISOR]));

router.get('/avg-resolution', ReportController.avgResolution);
router.get('/escalated-per-month', ReportController.escalated);
router.get('/top-agents', ReportController.topAgents);
router.get('/weekly-status', ReportController.weeklyStatus);
router.get('/last-processes', ReportController.lastProcesses);

export default router;
