import { Router } from 'express';
import { AttendanceController } from '../controllers/attendanceController.js';
import { authenticate, requireAdmin, requireEmployee } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

// Employee scan endpoint (supports /scan and /record)
router.post('/scan', requireEmployee, AttendanceController.scan);
router.post('/record', requireEmployee, AttendanceController.scan);

// Employee view today status & history
router.get('/my-today', requireEmployee, AttendanceController.getMyToday);
router.get('/my-history', requireEmployee, AttendanceController.getMyAttendance);
router.get('/me', requireEmployee, AttendanceController.getMyAttendance);

// Daily & Admin view
router.get('/daily', requireAdmin, AttendanceController.getAdminAttendance);
router.get('/admin', requireAdmin, AttendanceController.getAdminAttendance);
router.patch('/admin/:id', requireAdmin, AttendanceController.adjustAttendance);
router.put('/admin/:id', requireAdmin, AttendanceController.adjustAttendance);
router.put('/:id/manual-adjust', requireAdmin, AttendanceController.adjustAttendance);
router.post('/admin/manual', requireAdmin, AttendanceController.adjustAttendance);

export default router;
