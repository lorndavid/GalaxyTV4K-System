import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { UserRole } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  employeeId?: string | null;
}

export function generateToken(payload: JwtPayload, expiresIn?: string): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: (expiresIn || config.jwtExpiresIn || '30d') as any,
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
}
