import { Router } from 'express';
import { HolidayController } from '../controllers/holidayController';
import { authenticate, requireAdmin } from '../middlewares/auth';

const router = Router();

router.get('/', authenticate as any, HolidayController.list);
router.post('/', authenticate as any, requireAdmin as any, HolidayController.create);
router.put('/:id', authenticate as any, requireAdmin as any, HolidayController.update);
router.delete('/:id', authenticate as any, requireAdmin as any, HolidayController.delete);

export default router;
