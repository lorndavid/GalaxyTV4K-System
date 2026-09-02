import { Router } from 'express';
import { LeaveController } from '../controllers/leaveController.js';
import { authenticate, requireAdmin, requireEmployee } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

// Employee endpoints
router.get('/me', requireEmployee, LeaveController.getMyLeave);
router.get('/balances', requireEmployee, LeaveController.getLeaveBalances);
router.get('/my-requests', requireEmployee, LeaveController.getMyRequests);
router.post('/', requireEmployee, LeaveController.submitLeave);
router.post('/requests', requireEmployee, LeaveController.submitLeave);
router.post('/:id/cancel', requireEmployee, LeaveController.cancelMyLeave);

// Admin endpoints
router.get('/admin', requireAdmin, LeaveController.getAdminLeaveRequests);
router.patch('/admin/:id/approve', requireAdmin, LeaveController.approve);
router.patch('/admin/:id/reject', requireAdmin, LeaveController.reject);

export default router;
