import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { authenticate } from '../middlewares/auth.js';
import { loginLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

router.post('/login', loginLimiter, AuthController.login);
router.get('/login', (_req, res) => {
  res.redirect('/login');
});
router.post('/logout', authenticate, AuthController.logout);
router.get('/me', authenticate, AuthController.me);

export default router;
