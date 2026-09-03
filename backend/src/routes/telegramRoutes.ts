import { Router } from 'express';
import { TelegramController } from '../controllers/telegramController';
import { authenticate, requireAdmin } from '../middlewares/auth';

const router = Router();

router.use(authenticate as any, requireAdmin as any);

router.get('/config', TelegramController.getConfig);
router.post('/config', TelegramController.saveConfig);
router.post('/test', TelegramController.testConnection);
router.post('/chats', TelegramController.addChat);
router.delete('/chats/:id', TelegramController.deleteChat);
router.post('/daily-summary', TelegramController.sendDailySummary);
router.get('/daily-summary-preview', TelegramController.getDailySummaryPreview);

export default router;
