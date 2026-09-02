import { Router } from 'express';
import { AuditController } from '../controllers/auditController.js';
import { authenticate, requireAdmin } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/', AuditController.list);

export default router;
