import { Router } from 'express';
import { ScheduleController } from '../controllers/scheduleController.js';
import { authenticate, requireAdmin } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', ScheduleController.list);
router.get('/:id', ScheduleController.getById);
router.post('/', requireAdmin, ScheduleController.create);
router.patch('/:id', requireAdmin, ScheduleController.update);
router.post('/:id/recalculate', requireAdmin, ScheduleController.recalculate);

export default router;
