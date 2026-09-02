import { Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { OutService } from '../services/outService.js';
import { RequestStatus } from '@prisma/client';

export class OutController {
  static async getMyOutRequests(req: AuthenticatedRequest, res: Response) {
    const employeeId = req.user?.employeeId;
    if (!employeeId) return sendError(res, 'EMPLOYEE_REQUIRED', 'Employee profile required.', 403);

    const requests = await prisma.outRequest.findMany({
      where: { employeeId },
      orderBy: { date: 'desc' },
    });

    return sendSuccess(res, requests);
  }

  static async submitOut(req: AuthenticatedRequest, res: Response) {
    const employeeId = req.user?.employeeId;
    if (!employeeId) return sendError(res, 'EMPLOYEE_REQUIRED', 'Employee profile required.', 403);

    const { date, startTime, endTime, reason } = req.body;

    if (!date || !startTime || !endTime || !reason) {
      return sendError(res, 'MISSING_FIELDS', 'Date, startTime, endTime, and reason are required.', 400);
    }

    try {
      const out = await OutService.submitOutRequest({
        employeeId,
        date,
        startTime,
        endTime,
        reason,
      });
      return sendSuccess(res, out, 201);
    } catch (err: any) {
      return sendError(res, err.code || 'OUT_SUBMIT_FAILED', err.message, err.status || 400);
    }
  }

  // Admin endpoints
  static async getAdminOutRequests(req: AuthenticatedRequest, res: Response) {
    const { status, date } = req.query;

    const where: any = {};
    if (status) where.status = status as RequestStatus;
    if (date) where.date = String(date);

    const requests = await prisma.outRequest.findMany({
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
      const result = await OutService.reviewOutRequest({
        requestId: id,
        status: RequestStatus.APPROVED,
        adminComment,
        adminUserId: req.user!.userId,
      });
      return sendSuccess(res, result);
    } catch (err: any) {
      return sendError(res, err.code || 'OUT_APPROVAL_FAILED', err.message, err.status || 400);
    }
  }

  static async reject(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { adminComment } = req.body;

    try {
      const result = await OutService.reviewOutRequest({
        requestId: id,
        status: RequestStatus.REJECTED,
        adminComment,
        adminUserId: req.user!.userId,
      });
      return sendSuccess(res, result);
    } catch (err: any) {
      return sendError(res, err.code || 'OUT_REJECTION_FAILED', err.message, err.status || 400);
    }
  }
}
