import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma.js';
import { generateToken } from '../utils/jwt.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { createAuditLog } from '../utils/audit.js';
import { ActorType, UserStatus } from '@prisma/client';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return sendError(res, 'MISSING_CREDENTIALS', 'Email and password are required.', 400);
      }

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        include: {
          employee: {
            include: { department: true, schedule: true },
          },
        },
      });

      if (!user) {
        return sendError(res, 'INVALID_CREDENTIALS', 'Invalid email or password.', 401);
      }

      if (user.status !== UserStatus.ACTIVE) {
        return sendError(res, 'ACCOUNT_INACTIVE', 'Account is disabled or suspended.', 403);
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return sendError(res, 'INVALID_CREDENTIALS', 'Invalid email or password.', 401);
      }

      // Update last login
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
      } catch (err) {
        console.warn('Could not update lastLoginAt:', err);
      }

      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
      });

      try {
        await createAuditLog({
          actorId: user.id,
          actorType: user.role === 'ADMIN' ? ActorType.ADMIN : ActorType.EMPLOYEE,
          action: 'USER_LOGIN',
          entityType: 'User',
          entityId: user.id,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
      } catch (err) {
        console.warn('Could not create login audit log:', err);
      }

      return sendSuccess(res, {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          employee: user.employee,
        },
      });
    } catch (error: any) {
      console.error('Login process error:', error);
      return sendError(res, 'LOGIN_ERROR', error?.message || 'Failed to authenticate user.', 500);
    }
  }

  static async me(req: AuthenticatedRequest, res: Response) {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        lastLoginAt: true,
        employee: {
          include: {
            department: true,
            schedule: {
              include: { days: true },
            },
          },
        },
      },
    });

    if (!user) {
      return sendError(res, 'USER_NOT_FOUND', 'User profile not found.', 404);
    }

    return sendSuccess(res, { user });
  }

  static async logout(req: AuthenticatedRequest, res: Response) {
    if (req.user?.userId) {
      await createAuditLog({
        actorId: req.user.userId,
        actorType: req.user.role === 'ADMIN' ? ActorType.ADMIN : ActorType.EMPLOYEE,
        action: 'USER_LOGOUT',
        entityType: 'User',
        entityId: req.user.userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }
    return sendSuccess(res, { message: 'Logged out successfully.' });
  }
}
