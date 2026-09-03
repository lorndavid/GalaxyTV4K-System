import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'super-secret-jwt-signing-key-min-32-chars-change-in-prod',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  encryptionKey: process.env.ENCRYPTION_KEY || 'system-hr-encryption-secret-32-b!',
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
  defaultTimezone: process.env.DEFAULT_TIMEZONE || 'Asia/Phnom_Penh',
  defaultLatitude: parseFloat(process.env.DEFAULT_LATITUDE || '11.5564'),
  defaultLongitude: parseFloat(process.env.DEFAULT_LONGITUDE || '104.9282'),
  defaultRadiusMeters: parseFloat(process.env.DEFAULT_ALLOWED_RADIUS_METERS || '100'),
  defaultAccuracyThresholdMeters: parseFloat(process.env.DEFAULT_GPS_ACCURACY_THRESHOLD_METERS || '50'),
  defaultQrExpirationSeconds: parseInt(process.env.DEFAULT_QR_EXPIRATION_SECONDS || '60', 10),
};
