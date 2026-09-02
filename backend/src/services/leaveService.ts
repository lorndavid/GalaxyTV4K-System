import { prisma } from '../utils/prisma.js';
import { LeaveType, RequestStatus, ActorType } from '@prisma/client';
import { createAuditLog } from '../utils/audit.js';

export class LeaveService {
  static async getEmployeeLeaveBalance(employeeId: string, year = new Date().getFullYear()) {
    let balance = await prisma.leaveBalance.findUnique({
      where: { employeeId_year: { employeeId, year } },
    });

    if (!balance) {
      balance = await prisma.leaveBalance.create({
        data: {
          employeeId,
          year,
          annualTotal: 15.0,
          annualUsed: 0.0,
          sickTotal: 10.0,
          sickUsed: 0.0,
          personalTotal: 5.0,
          personalUsed: 0.0,
        },
      });
    }

    return balance;
  }

  static async submitLeaveRequest({
    employeeId,
    type,
    startDate,
    endDate,
    daysCount,
    reason,
  }: {
    employeeId: string;
    type: LeaveType;
    startDate: string;
    endDate: string;
    daysCount: number;
    reason: string;
  }) {
    if (new Date(startDate) > new Date(endDate)) {
      throw { code: 'INVALID_DATE_RANGE', message: 'Start date cannot be after end date.', status: 400 };
    }

    // Check overlapping requests (PENDING or APPROVED)
    const existing = await prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        status: { in: [RequestStatus.PENDING, RequestStatus.APPROVED] },
        OR: [
          { startDate: { lte: endDate }, endDate: { gte: startDate } },
        ],
      },
    });

    if (existing) {
      throw {
        code: 'OVERLAPPING_LEAVE_REQUEST',
        message: `An overlapping leave request (${existing.status}) already exists from ${existing.startDate} to ${existing.endDate}.`,
        status: 400,
      };
    }

    return prisma.$transaction(async (tx) => {
      const leave = await tx.leaveRequest.create({
        data: {
          employeeId,
          type,
          startDate,
          endDate,
          daysCount,
          reason,
          status: RequestStatus.PENDING,
        },
      });

      const emp = await tx.employee.findUnique({ where: { id: employeeId }, include: { user: true } });

      await createAuditLog(
        {
          actorId: emp?.user?.id || null,
          actorType: ActorType.EMPLOYEE,
          action: 'LEAVE_REQUESTED',
          entityType: 'LeaveRequest',
          entityId: leave.id,
          metadata: { type, startDate, endDate, daysCount },
        },
        tx
      );

      return leave;
    });
  }

  static async reviewLeaveRequest({
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
      const leave = await tx.leaveRequest.findUnique({
        where: { id: requestId },
        include: { employee: true },
      });

      if (!leave) {
        throw { code: 'LEAVE_NOT_FOUND', message: 'Leave request not found.', status: 404 };
      }

      if (leave.status !== RequestStatus.PENDING) {
        throw { code: 'INVALID_STATUS', message: `Cannot review request with status ${leave.status}.`, status: 400 };
      }

      const updated = await tx.leaveRequest.update({
        where: { id: requestId },
        data: {
          status,
          adminComment,
          reviewedById: adminUserId,
          reviewedAt: new Date(),
        },
      });

      // If approved, update employee's leave balance
      if (status === RequestStatus.APPROVED) {
        const year = parseInt(leave.startDate.split('-')[0], 10) || new Date().getFullYear();
        let balance = await tx.leaveBalance.findUnique({
          where: { employeeId_year: { employeeId: leave.employeeId, year } },
        });

        if (!balance) {
          balance = await tx.leaveBalance.create({
            data: {
              employeeId: leave.employeeId,
              year,
            },
          });
        }

        const updateData: any = {};
        if (leave.type === LeaveType.ANNUAL) updateData.annualUsed = { increment: leave.daysCount };
        else if (leave.type === LeaveType.SICK) updateData.sickUsed = { increment: leave.daysCount };
        else if (leave.type === LeaveType.PERSONAL) updateData.personalUsed = { increment: leave.daysCount };
        else if (leave.type === LeaveType.UNPAID) updateData.unpaidUsed = { increment: leave.daysCount };
        else if (leave.type === LeaveType.MATERNITY) updateData.maternityUsed = { increment: leave.daysCount };
        else if (leave.type === LeaveType.PATERNITY) updateData.paternityUsed = { increment: leave.daysCount };
        else updateData.otherUsed = { increment: leave.daysCount };

        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: updateData,
        });
      }

      await createAuditLog(
        {
          actorId: adminUserId,
          actorType: ActorType.ADMIN,
          action: `LEAVE_${status}`,
          entityType: 'LeaveRequest',
          entityId: requestId,
          metadata: { status, adminComment, daysCount: leave.daysCount },
        },
        tx
      );

      return updated;
    });
  }

  static async cancelLeaveRequest(requestId: string, employeeId: string) {
    const leave = await prisma.leaveRequest.findUnique({ where: { id: requestId } });
    if (!leave) throw { code: 'NOT_FOUND', message: 'Leave request not found', status: 404 };
    if (leave.employeeId !== employeeId) throw { code: 'FORBIDDEN', message: 'Unauthorized', status: 403 };
    if (leave.status !== RequestStatus.PENDING) {
      throw { code: 'INVALID_STATUS', message: 'Only pending leave requests can be cancelled.', status: 400 };
    }

    return prisma.leaveRequest.update({
      where: { id: requestId },
      data: { status: RequestStatus.CANCELLED },
    });
  }
}
