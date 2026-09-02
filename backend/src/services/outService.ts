import { prisma } from '../utils/prisma.js';
import { RequestStatus, ActorType } from '@prisma/client';
import { createAuditLog } from '../utils/audit.js';
import { parseTimeToMinutes } from '../utils/time.js';

export class OutService {
  static async submitOutRequest({
    employeeId,
    date,
    startTime,
    endTime,
    reason,
  }: {
    employeeId: string;
    date: string;
    startTime: string;
    endTime: string;
    reason: string;
  }) {
    const startMins = parseTimeToMinutes(startTime);
    const endMins = parseTimeToMinutes(endTime);

    if (startMins >= endMins) {
      throw { code: 'INVALID_TIME_RANGE', message: 'Start time must be before end time.', status: 400 };
    }

    const minutesCount = endMins - startMins;

    return prisma.$transaction(async (tx) => {
      const out = await tx.outRequest.create({
        data: {
          employeeId,
          date,
          startTime,
          endTime,
          minutesCount,
          reason,
          status: RequestStatus.PENDING,
        },
      });

      const emp = await tx.employee.findUnique({ where: { id: employeeId }, include: { user: true } });

      await createAuditLog(
        {
          actorId: emp?.user?.id || null,
          actorType: ActorType.EMPLOYEE,
          action: 'OUT_REQUESTED',
          entityType: 'OutRequest',
          entityId: out.id,
          metadata: { date, startTime, endTime, minutesCount },
        },
        tx
      );

      return out;
    });
  }

  static async reviewOutRequest({
    requestId,
    status,
    adminComment,
    adminUserId,
  }: {
    requestId: string;
    status: 'APPROVED' | 'REJECTED' | RequestStatus;
    adminComment?: string;
    adminUserId: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const out = await tx.outRequest.findUnique({ where: { id: requestId } });
      if (!out) throw { code: 'OUT_NOT_FOUND', message: 'Out request not found.', status: 404 };
      if (out.status !== RequestStatus.PENDING) {
        throw { code: 'INVALID_STATUS', message: `Cannot review request with status ${out.status}.`, status: 400 };
      }

      const updated = await tx.outRequest.update({
        where: { id: requestId },
        data: {
          status,
          adminComment,
          reviewedById: adminUserId,
          reviewedAt: new Date(),
        },
      });

      await createAuditLog(
        {
          actorId: adminUserId,
          actorType: ActorType.ADMIN,
          action: `OUT_${status}`,
          entityType: 'OutRequest',
          entityId: requestId,
          metadata: { status, adminComment },
        },
        tx
      );

      return updated;
    });
  }
}
