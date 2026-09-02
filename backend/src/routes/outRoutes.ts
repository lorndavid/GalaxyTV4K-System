import { Router } from 'express';
import { OutController } from '../controllers/outController.js';
import { authenticate, requireAdmin, requireEmployee } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

// Employee
router.get('/me', requireEmployee, OutController.getMyOutRequests);
router.get('/my-requests', requireEmployee, OutController.getMyOutRequests);
router.post('/', requireEmployee, OutController.submitOut);
router.post('/requests', requireEmployee, OutController.submitOut);

// Admin
router.get('/admin', requireAdmin, OutController.getAdminOutRequests);
router.patch('/admin/:id/approve', requireAdmin, OutController.approve);
router.patch('/admin/:id/reject', requireAdmin, OutController.reject);

export default router;
