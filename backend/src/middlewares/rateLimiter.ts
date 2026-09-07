import rateLimit from 'express-rate-limit';

export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // High ceiling for company-wide Wi-Fi polling and multiple staff
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      return `auth_${auth.slice(-32)}`;
    }
    return (req.headers['cf-connecting-ip'] as string) || (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || '127.0.0.1';
  },
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.',
    },
  },
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Generous ceiling for office Wi-Fi
  skipSuccessfulRequests: true, // Do not penalize successful logins
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Key by target email so one failed login does not penalize colleagues sharing the same Wi-Fi
    const email = (req.body?.email || '').toLowerCase().trim();
    if (email) {
      return `login_${email}`;
    }
    return (req.headers['cf-connecting-ip'] as string) || req.ip || '127.0.0.1';
  },
  message: {
    success: false,
    error: {
      code: 'LOGIN_RATE_LIMIT_EXCEEDED',
      message: 'Too many failed login attempts. Please wait 15 minutes before trying again.',
    },
  },
});

export const attendanceScanLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // Peak morning rush allowance
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      return `scan_${auth.slice(-32)}`;
    }
    return (req.headers['cf-connecting-ip'] as string) || req.ip || '127.0.0.1';
  },
  message: {
    success: false,
    error: {
      code: 'SCAN_RATE_LIMIT_EXCEEDED',
      message: 'Too many attendance scan attempts. Please wait a moment before trying again.',
    },
  },
});

export const locationUpdateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 location pings per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      return `loc_${auth.slice(-32)}`;
    }
    return (req.headers['cf-connecting-ip'] as string) || req.ip || '127.0.0.1';
  },
  message: {
    success: false,
    error: {
      code: 'LOCATION_RATE_LIMIT_EXCEEDED',
      message: 'Location update rate limit exceeded.',
    },
  },
});

export const qrGenerationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Max 60 QR generation requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'QR_RATE_LIMIT_EXCEEDED',
      message: 'QR generation rate limit exceeded. Please wait a moment.',
    },
  },
});

export const telegramTestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // Max 10 test messages per 10 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TELEGRAM_TEST_RATE_LIMIT_EXCEEDED',
      message: 'Too many Telegram test attempts. Please wait 10 minutes.',
    },
  },
});
