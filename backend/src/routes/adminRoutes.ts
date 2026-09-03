import { Router } from 'express';
import { AdminController } from '../controllers/adminController.js';
import { LeaveController } from '../controllers/leaveController.js';
import { OutController } from '../controllers/outController.js';
import { SettingsController } from '../controllers/settingsController.js';
import { ReportController } from '../controllers/reportController.js';
import { QrController } from '../controllers/qrController.js';
import { ScheduleController } from '../controllers/scheduleController.js';
import { HolidayController } from '../controllers/holidayController.js';
import { AuditController } from '../controllers/auditController.js';
import { TelegramController } from '../controllers/telegramController.js';
import { AttendanceController } from '../controllers/attendanceController.js';
import { authenticate, requireAdmin } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate, requireAdmin);

// Live Attendance Stream
router.get('/attendance/stream', AttendanceController.stream);

// Dashboard
router.get('/dashboard', AdminController.getDashboard);

// Employees
router.get('/employees', AdminController.getEmployees);
router.post('/employees', AdminController.createEmployee);
router.get('/employees/:id', AdminController.getEmployeeById);
router.patch('/employees/:id', AdminController.updateEmployee);
router.put('/employees/:id', AdminController.updateEmployee);
router.delete('/employees/:id', AdminController.deleteEmployee);
router.post('/employees/:id/reset-password', AdminController.resetPassword);
router.post('/employees/seed-official', AdminController.seedOfficialEmployees);

// Departments
router.get('/departments', AdminController.getDepartments);
router.post('/departments', AdminController.createDepartment);

// Holidays
router.get('/holidays', HolidayController.list);
router.post('/holidays', HolidayController.create);
router.patch('/holidays/:id', HolidayController.update);
router.delete('/holidays/:id', HolidayController.delete);

// Leave Requests
router.get('/leave-requests', LeaveController.getAdminLeaveRequests);
router.patch('/leave-requests/:id/approve', LeaveController.approve);
router.patch('/leave-requests/:id/reject', LeaveController.reject);

// Out Requests
router.get('/out-requests', OutController.getAdminOutRequests);
router.patch('/out-requests/:id/approve', OutController.approve);
router.patch('/out-requests/:id/reject', OutController.reject);

// Settings
router.get('/settings', SettingsController.getSettings);
router.patch('/settings', SettingsController.updateSettings);
router.put('/settings', SettingsController.updateSettings);

// QR Management (supports /qr and /attendance-qr aliases)
router.get(['/qr/active', '/qr/current', '/attendance-qr/active'], QrController.getCurrent);
router.get(['/qr/list', '/attendance-qr'], QrController.list);
router.post(['/qr/create', '/attendance-qr'], QrController.create);
router.post(['/qr/generate', '/attendance-qr/generate'], QrController.generate);
router.post(['/qr/regenerate', '/attendance-qr/regenerate'], QrController.regenerate);
router.post(['/qr/revoke', '/attendance-qr/revoke'], QrController.revoke);
router.post(['/qr/:id/deactivate', '/attendance-qr/:id/deactivate'], QrController.deactivate);
router.patch(['/qr/:id/deactivate', '/attendance-qr/:id/deactivate'], QrController.deactivate);
router.delete(['/qr/:id', '/attendance-qr/:id'], QrController.delete);

// Reports
router.get('/reports/summary', ReportController.getAttendanceSummary);
router.get('/reports/attendance', ReportController.getAttendanceReport);
router.get(['/reports/export', '/reports/export-csv'], ReportController.exportCsv);

// Schedules
router.get('/schedules', ScheduleController.list);
router.post('/schedules', ScheduleController.create);
router.get('/schedules/:id', ScheduleController.getById);
router.patch('/schedules/:id', ScheduleController.update);
router.post('/schedules/:id/recalculate', ScheduleController.recalculate);

// Audit Logs
router.get('/audit-logs', AuditController.list);

// Telegram
router.get('/telegram/config', TelegramController.getConfig);
router.post('/telegram/config', TelegramController.saveConfig);
router.patch('/telegram/config', TelegramController.saveConfig);
router.post('/telegram/test', TelegramController.testConnection);
router.post('/telegram/chats', TelegramController.addChat);
router.delete('/telegram/chats/:id', TelegramController.deleteChat);

export default router;
