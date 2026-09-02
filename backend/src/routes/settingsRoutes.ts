import { Router } from 'express';
import { SettingsController } from '../controllers/settingsController.js';
import { authenticate, requireAdmin } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', SettingsController.getSettings);
router.patch('/', requireAdmin, SettingsController.updateSettings);
router.put('/', requireAdmin, SettingsController.updateSettings);

export default router;
