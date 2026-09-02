import { Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { LeaveService } from '../services/leaveService.js';
import { LeaveType, RequestStatus } from '@prisma/client';

export class LeaveController {
  static async getMyLeave(req: AuthenticatedRequest, res: Response) {
    const employeeId = req.user?.employeeId;
    if (!employeeId) return sendError(res, 'EMPLOYEE_REQUIRED', 'Employee profile required.', 403);

    const balance = await LeaveService.getEmployeeLeaveBalance(employeeId);
    const requests = await prisma.leaveRequest.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
    });

    return sendSuccess(res, { balance, requests });
  }

  static async getLeaveBalances(req: AuthenticatedRequest, res: Response) {
    const employeeId = req.user?.employeeId;
    if (!employeeId) return sendError(res, 'EMPLOYEE_REQUIRED', 'Employee profile required.', 403);

    const balance = await LeaveService.getEmployeeLeaveBalance(employeeId);
    
    // Convert to list format
    const balanceList = [
      {
        leaveType: 'ANNUAL',
        totalDays: balance.annualTotal,
        usedDays: balance.annualUsed,
        pendingDays: 0,
        remainingDays: Math.max(0, balance.annualTotal - balance.annualUsed),
      },
      {
        leaveType: 'SICK',
        totalDays: balance.sickTotal,
        usedDays: balance.sickUsed,
        pendingDays: 0,
        remainingDays: Math.max(0, balance.sickTotal - balance.sickUsed),
      },
      {
        leaveType: 'PERSONAL',
        totalDays: balance.personalTotal,
        usedDays: balance.personalUsed,
        pendingDays: 0,
        remainingDays: Math.max(0, balance.personalTotal - balance.personalUsed),
      },
      {
        leaveType: 'UNPAID',
        totalDays: 0,
        usedDays: balance.unpaidUsed,
        pendingDays: 0,
        remainingDays: 0,
      },
    ];

    return sendSuccess(res, balanceList);
  }

  static async getMyRequests(req: AuthenticatedRequest, res: Response) {
    const employeeId = req.user?.employeeId;
    if (!employeeId) return sendError(res, 'EMPLOYEE_REQUIRED', 'Employee profile required.', 403);

    const requests = await prisma.leaveRequest.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
    });

    return sendSuccess(res, requests);
  }

  static async submitLeave(req: AuthenticatedRequest, res: Response) {
    const employeeId = req.user?.employeeId;
    if (!employeeId) return sendError(res, 'EMPLOYEE_REQUIRED', 'Employee profile required.', 403);

    const { type, leaveType, startDate, endDate, daysCount, reason } = req.body;
    const actualType = (type || leaveType) as LeaveType;

    if (!actualType || !startDate || !endDate || !reason) {
      return sendError(res, 'MISSING_FIELDS', 'All leave fields are required.', 400);
    }

    // Auto compute daysCount if not provided
    let actualDays = parseFloat(daysCount);
    if (isNaN(actualDays) || actualDays <= 0) {
      const diffMs = new Date(endDate).getTime() - new Date(startDate).getTime();
      actualDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
    }

    try {
      const leave = await LeaveService.submitLeaveRequest({
        employeeId,
        type: actualType,
        startDate,
        endDate,
        daysCount: actualDays,
        reason,
      });

      return sendSuccess(res, leave, 201);
    } catch (err: any) {
      return sendError(res, err.code || 'LEAVE_SUBMIT_FAILED', err.message, err.status || 400);
    }
  }

  static async cancelMyLeave(req: AuthenticatedRequest, res: Response) {
    const employeeId = req.user?.employeeId;
    if (!employeeId) return sendError(res, 'EMPLOYEE_REQUIRED', 'Employee profile required.', 403);
    const { id } = req.params;

    try {
      const result = await LeaveService.cancelLeaveRequest(id, employeeId);
      return sendSuccess(res, result);
    } catch (err: any) {
      return sendError(res, err.code || 'CANCEL_FAILED', err.message, err.status || 400);
    }
  }

  // Admin endpoints
  static async getAdminLeaveRequests(req: AuthenticatedRequest, res: Response) {
    const { status, employeeId, type } = req.query;

    const where: any = {};
    if (status) where.status = status as RequestStatus;
    if (employeeId) where.employeeId = String(employeeId);
    if (type) where.type = type as LeaveType;

    const requests = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          include: { department: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sendSuccess(res, requests);
  }

  static async approve(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { adminComment } = req.body;

    try {
      const result = await LeaveService.reviewLeaveRequest({
        requestId: id,
        status: RequestStatus.APPROVED,
        adminComment,
        adminUserId: req.user!.userId,
      });
      return sendSuccess(res, result);
    } catch (err: any) {
      return sendError(res, err.code || 'LEAVE_APPROVAL_FAILED', err.message, err.status || 400);
    }
  }

  static async reject(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { adminComment } = req.body;

    try {
      const result = await LeaveService.reviewLeaveRequest({
        requestId: id,
        status: RequestStatus.REJECTED,
        adminComment,
        adminUserId: req.user!.userId,
      });
      return sendSuccess(res, result);
    } catch (err: any) {
      return sendError(res, err.code || 'LEAVE_REJECTION_FAILED', err.message, err.status || 400);
    }
  }
}
