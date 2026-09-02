import { Router } from 'express';
import { LocationController } from '../controllers/locationController';
import { authenticate, requireAdmin, requireEmployee } from '../middlewares/auth';

const router = Router();

// Employee Location Endpoints
router.post('/update', authenticate as any, requireEmployee as any, LocationController.updateLocation);
router.get('/me', authenticate as any, requireEmployee as any, LocationController.getMyLocation);
router.post('/toggle-sharing', authenticate as any, requireEmployee as any, LocationController.toggleSharing);

// Admin Location Monitoring & History Endpoints
router.get('/admin/employees', authenticate as any, requireAdmin as any, LocationController.getAdminEmployeesLocation);
router.get('/admin/history/:employeeId', authenticate as any, requireAdmin as any, LocationController.getAdminLocationHistory);
router.get('/admin/stream', authenticate as any, requireAdmin as any, LocationController.streamLocations);

export default router;
