import { Router } from 'express';
import { QrController } from '../controllers/qrController.js';
import { authenticate, requireAdmin } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

// Admin-only QR management
router.post('/generate', requireAdmin, QrController.generate);
router.post('/regenerate', requireAdmin, QrController.regenerate);
router.post('/revoke', requireAdmin, QrController.revoke);
router.get(['/active', '/current'], requireAdmin, QrController.getCurrent);

export default router;
