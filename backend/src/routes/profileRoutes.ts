import { Router } from 'express';
import { ProfileController } from '../controllers/profileController.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

// Avatar quota check & upload
router.get('/avatar-quota', authenticate, ProfileController.getAvatarQuota);
router.post('/avatar', authenticate, ProfileController.uploadAvatar);

export default router;
