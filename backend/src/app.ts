import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'crypto';
import { config } from './config/index.js';
import { generalApiLimiter } from './middlewares/rateLimiter.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { prisma } from './utils/prisma.js';
import apiRouter from './routes/index.js';

export const app = express();

// Trust Nginx reverse proxy
app.set('trust proxy', 1);

// Attach unique Request ID for logging and tracing
app.use((req: Request, res: Response, next) => {
  const reqId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  req.headers['x-request-id'] = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
});

// Production Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org'],
        connectSrc: ["'self'", 'https:', 'wss:'],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Explicit Permissions-Policy: Allow Camera & Geolocation for PWA, deny unused sensitive features
app.use((_req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(self), camera=(self), microphone=(), payment=(), usb=(), accelerometer=(), gyroscope=()'
  );
  next();
});

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, internal nginx proxy)
      if (!origin) {
        return callback(null, true);
      }

      // Allow any galaxytv.online subdomain, localhost, or configured origins
      const isAllowedDomain =
        origin.endsWith('galaxytv.online') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        config.corsOrigins.includes(origin) ||
        config.nodeEnv === 'development';

      if (isAllowedDomain) {
        callback(null, true);
      } else {
        // Log warning and allow safely or reject without 500 error
        console.warn(`[CORS] Request from origin: ${origin}`);
        callback(null, true); // Permissive in production behind reverse proxy
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
  })
);

// Standard Body Parsers with payload size restrictions
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Global Rate Limiting
app.use('/api', generalApiLimiter);

// Health & Readiness Probes
app.get(['/health', '/api/health'], (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'system-hr-api',
  });
});

app.get(['/ready', '/api/ready'], async (_req, res) => {
  try {
    // Verify database connection responsiveness
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

// Mount Main API Router
app.use('/api', apiRouter);

// Global Error Handler
app.use(errorHandler);
