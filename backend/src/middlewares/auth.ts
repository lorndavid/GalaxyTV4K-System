import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt.js';
import { sendError } from '../utils/apiResponse.js';
import { prisma } from '../utils/prisma.js';
import { UserRole, UserStatus } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload & {
    dbUser?: any;
    employee?: any;
  };
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  let token: string | undefined;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    return sendError(res, 'UNAUTHORIZED', 'Authentication token required.', 401);
  }

  try {
    const decoded = verifyToken(token);

    if (!decoded || !decoded.userId) {
      return sendError(res, 'INVALID_TOKEN', 'Invalid token payload.', 401);
    }

    // Fetch user from DB to verify status is active and role has not been revoked
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { employee: true },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      return sendError(
        res,
        'ACCOUNT_INACTIVE',
        'Account is disabled, suspended, or does not exist.',
        403
      );
    }

    // Never attach passwordHash or secrets
    const safeUser = { ...user };
    delete (safeUser as any).passwordHash;

    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      dbUser: safeUser,
      employee: user.employee,
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return sendError(res, 'TOKEN_EXPIRED', 'Session has expired. Please log in again.', 401);
    }
    return sendError(res, 'INVALID_TOKEN', 'Invalid authentication token.', 401);
  }
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user || req.user.role !== UserRole.ADMIN) {
    return sendError(
      res,
      'FORBIDDEN_ADMIN_REQUIRED',
      'Administrative privileges required for this resource.',
      403
    );
  }
  next();
}

export function requireEmployee(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user || !req.user.employeeId) {
    return sendError(
      res,
      'FORBIDDEN_EMPLOYEE_REQUIRED',
      'Active employee profile required for this action.',
      403
    );
  }
  next();
}

/**
 * IDOR Defense: Verifies that the authenticated employee is only accessing
 * their own resources (or the caller is an Administrator).
 */
export function requireSelfOrAdmin(paramName: string = 'employeeId') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'UNAUTHORIZED', 'Authentication required.', 401);
    }

    if (req.user.role === UserRole.ADMIN) {
      return next();
    }

    const targetEmployeeId = req.params[paramName] || req.body[paramName] || req.query[paramName];
    if (targetEmployeeId && targetEmployeeId !== req.user.employeeId) {
      return sendError(
        res,
        'FORBIDDEN_ACCESS_DENIED',
        'Access denied. You cannot access or modify another employee’s records.',
        403
      );
    }

    next();
  };
}
