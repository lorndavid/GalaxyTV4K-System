import { Router } from 'express';
import { ReportController } from '../controllers/reportController.js';
import { authenticate, requireAdmin } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate, requireAdmin);

router.get(['/summary', '/attendance'], ReportController.getAttendanceReport);
router.get('/attendance/export', ReportController.exportCsv);

export default router;
