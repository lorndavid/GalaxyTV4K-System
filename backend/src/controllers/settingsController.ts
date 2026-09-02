import { Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { createAuditLog } from '../utils/audit.js';
import { ActorType } from '@prisma/client';

export class SettingsController {
  static async getSettings(req: AuthenticatedRequest, res: Response) {
    let settings = await prisma.companySettings.findUnique({ where: { id: 'default' } });
    if (!settings) {
      settings = await prisma.companySettings.create({
        data: {
          id: 'default',
          companyName: 'Galaxy TV4K',
          timezone: 'Asia/Phnom_Penh',
          latitude: 11.5564,
          longitude: 104.9282,
          allowedRadiusMeters: 100,
          gpsAccuracyThresholdMeters: 50,
          qrExpirationSeconds: 60,
          lateGracePeriodMinutes: 10,
        },
      });
    }

    // Format output with aliases for frontend compatibility
    const responseData = {
      ...settings,
      qrExpiresInSeconds: settings.qrExpirationSeconds,
      maxGpsAccuracyMeters: settings.gpsAccuracyThresholdMeters,
    };

    return sendSuccess(res, responseData);
  }

  static async updateSettings(req: AuthenticatedRequest, res: Response) {
    const {
      companyName,
      companyLogo,
      timezone,
      latitude,
      longitude,
      allowedRadiusMeters,
      gpsAccuracyThresholdMeters,
      maxGpsAccuracyMeters,
      qrExpirationSeconds,
      qrExpiresInSeconds,
      lateGracePeriodMinutes,
      earlyLeaveGraceMinutes,
      checkInAllowedBeforeMinutes,
      checkOutAllowedAfterMinutes,
    } = req.body;

    const previous = await prisma.companySettings.findUnique({ where: { id: 'default' } });

    const finalQrExp = qrExpirationSeconds !== undefined ? qrExpirationSeconds : qrExpiresInSeconds;
    const finalAccuracy = gpsAccuracyThresholdMeters !== undefined ? gpsAccuracyThresholdMeters : maxGpsAccuracyMeters;

    const updated = await prisma.companySettings.upsert({
      where: { id: 'default' },
      update: {
        companyName,
        companyLogo,
        timezone,
        latitude: latitude !== undefined ? parseFloat(latitude) : undefined,
        longitude: longitude !== undefined ? parseFloat(longitude) : undefined,
        allowedRadiusMeters: allowedRadiusMeters !== undefined ? parseFloat(allowedRadiusMeters) : undefined,
        gpsAccuracyThresholdMeters: finalAccuracy !== undefined ? parseFloat(finalAccuracy) : undefined,
        qrExpirationSeconds: finalQrExp !== undefined ? parseInt(finalQrExp, 10) : undefined,
        lateGracePeriodMinutes:
          lateGracePeriodMinutes !== undefined ? parseInt(lateGracePeriodMinutes, 10) : undefined,
        earlyLeaveGraceMinutes:
          earlyLeaveGraceMinutes !== undefined ? parseInt(earlyLeaveGraceMinutes, 10) : undefined,
        checkInAllowedBeforeMinutes:
          checkInAllowedBeforeMinutes !== undefined ? parseInt(checkInAllowedBeforeMinutes, 10) : undefined,
        checkOutAllowedAfterMinutes:
          checkOutAllowedAfterMinutes !== undefined ? parseInt(checkOutAllowedAfterMinutes, 10) : undefined,
      },
      create: {
        id: 'default',
        companyName: companyName || 'Galaxy TV4K',
        companyLogo,
        timezone: timezone || 'Asia/Phnom_Penh',
        latitude: latitude ? parseFloat(latitude) : 11.5564,
        longitude: longitude ? parseFloat(longitude) : 104.9282,
        allowedRadiusMeters: allowedRadiusMeters ? parseFloat(allowedRadiusMeters) : 100,
        gpsAccuracyThresholdMeters: finalAccuracy ? parseFloat(finalAccuracy) : 50,
        qrExpirationSeconds: finalQrExp ? parseInt(finalQrExp, 10) : 60,
        lateGracePeriodMinutes: lateGracePeriodMinutes ? parseInt(lateGracePeriodMinutes, 10) : 10,
      },
    });

    await createAuditLog({
      actorId: req.user!.userId,
      actorType: ActorType.ADMIN,
      action: 'COMPANY_SETTINGS_UPDATED',
      entityType: 'CompanySettings',
      entityId: 'default',
      metadata: { previous, updated },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const responseData = {
      ...updated,
      qrExpiresInSeconds: updated.qrExpirationSeconds,
      maxGpsAccuracyMeters: updated.gpsAccuracyThresholdMeters,
    };

    return sendSuccess(res, responseData);
  }
}
