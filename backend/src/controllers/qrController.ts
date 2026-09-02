import { Response } from 'express';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { QrService } from '../services/qrService.js';
import { QrSessionType, QrSessionStatus } from '@prisma/client';

export class QrController {
  static async create(req: AuthenticatedRequest, res: Response) {
    const {
      name,
      date,
      validFrom,
      validUntil,
      officeName,
      description,
      status = QrSessionStatus.ACTIVE,
      type = QrSessionType.ANY,
      expirationSeconds,
    } = req.body;

    try {
      const result = await QrService.createAttendanceQr({
        name,
        date,
        validFrom,
        validUntil,
        officeName,
        description,
        status,
        type,
        expirationSeconds: expirationSeconds ? parseInt(expirationSeconds, 10) : undefined,
        createdById: req.user?.userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return sendSuccess(res, {
        id: result.qrSession.id,
        name: result.qrSession.name,
        token: result.rawToken,
        payload: result.payload,
        date: result.qrSession.date,
        validFrom: result.qrSession.validFrom,
        validUntil: result.qrSession.validUntil,
        officeName: result.qrSession.officeName,
        type: result.qrSession.type,
        status: result.qrSession.status,
        expiresAt: result.qrSession.expiresAt,
        createdAt: result.qrSession.createdAt,
      }, 201);
    } catch (err: any) {
      return sendError(res, 'QR_CREATE_FAILED', err?.message || 'Failed to create attendance QR.', 500);
    }
  }

  static async list(req: AuthenticatedRequest, res: Response) {
    const { status, date, search } = req.query;
    try {
      const sessions = await QrService.listQrSessions({
        status: status as QrSessionStatus,
        date: date as string,
        search: search as string,
      });
      return sendSuccess(res, sessions);
    } catch (err: any) {
      return sendError(res, 'QR_LIST_FAILED', 'Failed to retrieve QR codes.', 500);
    }
  }

  static async deactivate(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    try {
      const session = await QrService.deactivateSession(id, req.user?.userId);
      return sendSuccess(res, session);
    } catch (err: any) {
      return sendError(res, 'QR_DEACTIVATE_FAILED', 'Failed to deactivate QR.', 500);
    }
  }

  static async delete(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    try {
      await QrService.deleteSession(id, req.user?.userId);
      return sendSuccess(res, { message: 'QR code deleted successfully.' });
    } catch (err: any) {
      return sendError(res, 'QR_DELETE_FAILED', 'Failed to delete QR.', 500);
    }
  }

  static async generate(req: AuthenticatedRequest, res: Response) {
    const { type = QrSessionType.ANY, expirationSeconds } = req.body;

    const result = await QrService.generateQrSession({
      type,
      expirationSeconds: expirationSeconds ? parseInt(expirationSeconds, 10) : undefined,
      createdById: req.user?.userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendSuccess(res, {
      id: result.qrSession.id,
      token: result.rawToken,
      payload: result.payload,
      type: result.qrSession.type,
      status: result.qrSession.status,
      expiresAt: result.qrSession.expiresAt,
      createdAt: result.qrSession.createdAt,
    });
  }

  static async regenerate(req: AuthenticatedRequest, res: Response) {
    const { type = QrSessionType.ANY, expirationSeconds } = req.body;

    const result = await QrService.generateQrSession({
      type,
      expirationSeconds: expirationSeconds ? parseInt(expirationSeconds, 10) : undefined,
      createdById: req.user?.userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendSuccess(res, {
      message: 'Previous QR sessions revoked. New active session generated.',
      id: result.qrSession.id,
      token: result.rawToken,
      payload: result.payload,
      type: result.qrSession.type,
      status: result.qrSession.status,
      expiresAt: result.qrSession.expiresAt,
      createdAt: result.qrSession.createdAt,
    });
  }

  static async revoke(req: AuthenticatedRequest, res: Response) {
    await QrService.revokeActiveSessions(req.user?.userId, req.ip, req.headers['user-agent']);
    return sendSuccess(res, { message: 'All active QR sessions revoked.' });
  }

  static async getCurrent(req: AuthenticatedRequest, res: Response) {
    const session = await QrService.getCurrentSession();
    if (!session) {
      return sendSuccess(res, { active: false, session: null });
    }

    return sendSuccess(res, {
      active: true,
      session: {
        id: session.id,
        type: session.type,
        status: session.status,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
        usedByCount: session.usedByCount,
      },
    });
  }
}
