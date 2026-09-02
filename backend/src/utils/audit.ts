import { prisma } from './prisma.js';
import { ActorType, Prisma } from '@prisma/client';

export interface CreateAuditLogParams {
  actorId?: string | null;
  actorType?: ActorType;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function createAuditLog(
  params: CreateAuditLogParams,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const db = tx || prisma;
  try {
    await db.auditLog.create({
      data: {
        actorId: params.actorId || null,
        actorType: params.actorType || ActorType.ADMIN,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        metadata: params.metadata || {},
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
