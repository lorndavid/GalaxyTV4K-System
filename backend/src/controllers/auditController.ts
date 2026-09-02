import { Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

export class AuditController {
  static async list(req: AuthenticatedRequest, res: Response) {
    const { action, entityType, actorId, startDate, endDate, limit = 100 } = req.query;

    const where: any = {};
    if (action) where.action = String(action);
    if (entityType) where.entityType = String(entityType);
    if (actorId) where.actorId = String(actorId);
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(String(startDate));
      if (endDate) where.createdAt.lte = new Date(String(endDate));
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            role: true,
            employee: { select: { displayName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(String(limit), 10) || 100, 500),
    });

    return sendSuccess(res, logs);
  }
}
