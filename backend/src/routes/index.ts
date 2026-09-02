import { Router } from 'express';
import authRoutes from './authRoutes.js';
import adminRoutes from './adminRoutes.js';
import qrRoutes from './qrRoutes.js';
import attendanceRoutes from './attendanceRoutes.js';
import scheduleRoutes from './scheduleRoutes.js';
import leaveRoutes from './leaveRoutes.js';
import outRoutes from './outRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import reportRoutes from './reportRoutes.js';
import auditRoutes from './auditRoutes.js';
import locationRoutes from './locationRoutes.js';
import telegramRoutes from './telegramRoutes.js';
import holidayRoutes from './holidayRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/admin/qr', qrRoutes);
router.use('/admin/reports', reportRoutes);
router.use('/admin/schedules', scheduleRoutes);
router.use('/admin/settings', settingsRoutes);
router.use('/admin/audit-logs', auditRoutes);
router.use('/admin/telegram', telegramRoutes);
router.use('/admin/holidays', holidayRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/location', locationRoutes);
router.use('/schedules', scheduleRoutes);
router.use('/holidays', holidayRoutes);
router.use('/leave', leaveRoutes);
router.use('/out', outRoutes);
router.use('/settings', settingsRoutes);

export default router;
