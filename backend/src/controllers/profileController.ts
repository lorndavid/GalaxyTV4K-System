import { Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { StorageService } from '../services/storageService.js';
import { createAuditLog } from '../utils/audit.js';
import { ActorType } from '@prisma/client';

export class ProfileController {
  private static getTodayDateStr(): string {
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Phnom_Penh' });
    return formatter.format(new Date()); // YYYY-MM-DD
  }

  /**
   * Check daily avatar upload quota
   */
  static async getAvatarQuota(req: AuthenticatedRequest, res: Response) {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      return sendError(res, 'EMPLOYEE_REQUIRED', 'Only employees have an avatar profile.', 403);
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        avatarUploadCountToday: true,
        lastAvatarUploadDate: true,
        profilePhoto: true,
      },
    });

    if (!employee) {
      return sendError(res, 'EMPLOYEE_NOT_FOUND', 'Employee record not found.', 404);
    }

    const todayStr = ProfileController.getTodayDateStr();
    const count = employee.lastAvatarUploadDate === todayStr ? employee.avatarUploadCountToday : 0;

    return sendSuccess(res, {
      uploadsToday: count,
      maxDailyUploads: 2,
      remainingUploadsToday: Math.max(0, 2 - count),
      profilePhoto: employee.profilePhoto,
    });
  }

  /**
   * Upload and replace employee profile photo
   * Strict rate limit: Max 2 replacements per calendar day (Asia/Phnom_Penh)
   */
  static async uploadAvatar(req: AuthenticatedRequest, res: Response) {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      return sendError(res, 'EMPLOYEE_REQUIRED', 'Only employees can upload a profile avatar.', 403);
    }

    const { image } = req.body;
    if (!image || typeof image !== 'string') {
      return sendError(res, 'IMAGE_REQUIRED', 'A valid image file or base64 data string is required.', 400);
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return sendError(res, 'EMPLOYEE_NOT_FOUND', 'Employee record not found.', 404);
    }

    const todayStr = ProfileController.getTodayDateStr();
    let currentCount = employee.avatarUploadCountToday;

    // Reset daily count if date has rolled over
    if (employee.lastAvatarUploadDate !== todayStr) {
      currentCount = 0;
    }

    // Strictly enforce max 2 photo replacements per day
    if (currentCount >= 2) {
      return sendError(
        res,
        'AVATAR_UPLOAD_LIMIT_EXCEEDED',
        'អ្នកអាចផ្លាស់ប្តូររូបភាពប្រវត្តិរូបបានត្រឹមតែ ២ ដងក្នុងមួយថ្ងៃប៉ុណ្ណោះ។ សូមព្យាយាមម្តងទៀតនៅថ្ងៃស្អែក។ (You can only change your profile photo up to 2 times per day. Please try again tomorrow.)',
        429,
        {
          maxDailyUploads: 2,
          currentCount,
          remainingUploadsToday: 0,
          resetDate: todayStr,
        }
      );
    }

    try {
      // Parse base64 string
      let mimeType = 'image/jpeg';
      let base64Data = image;

      if (image.startsWith('data:')) {
        const matches = image.match(/^data:([^;]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          base64Data = matches[2];
        }
      }

      // Validate allowed mime types
      const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedMimes.includes(mimeType.toLowerCase())) {
        return sendError(res, 'INVALID_IMAGE_TYPE', 'Only JPEG, PNG, WEBP, and GIF images are allowed.', 400);
      }

      const buffer = Buffer.from(base64Data, 'base64');

      // Max size limit: 5MB
      if (buffer.length > 5 * 1024 * 1024) {
        return sendError(res, 'IMAGE_TOO_LARGE', 'Image size must be less than 5MB.', 400);
      }

      // Extension
      let ext = '.jpg';
      if (mimeType.includes('png')) ext = '.png';
      else if (mimeType.includes('webp')) ext = '.webp';
      else if (mimeType.includes('gif')) ext = '.gif';

      const filename = `${employee.employeeCode.toLowerCase()}_${Date.now()}${ext}`;

      // Upload to MinIO & local storage
      const result = await StorageService.uploadAvatar(buffer, mimeType, filename);

      // Clean up old avatar if it was stored in our system
      if (employee.profilePhoto && employee.profilePhoto.startsWith('/api/avatar/')) {
        const oldFilename = employee.profilePhoto.replace('/api/avatar/', '');
        StorageService.deleteAvatar(oldFilename).catch(() => {});
      }

      // Update employee record
      const nextCount = currentCount + 1;
      const updatedEmployee = await prisma.employee.update({
        where: { id: employee.id },
        data: {
          profilePhoto: result.url,
          avatarUploadCountToday: nextCount,
          lastAvatarUploadDate: todayStr,
        },
        include: {
          department: true,
          schedule: true,
        },
      });

      // Audit log
      if (req.user?.userId) {
        await createAuditLog({
          actorId: req.user.userId,
          actorType: req.user.role === 'ADMIN' ? ActorType.ADMIN : ActorType.EMPLOYEE,
          action: 'EMPLOYEE_AVATAR_UPDATED',
          entityType: 'Employee',
          entityId: employee.id,
          metadata: {
            filename,
            uploadsToday: nextCount,
            url: result.url,
          },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
      }

      return sendSuccess(res, {
        profilePhoto: result.url,
        employee: updatedEmployee,
        uploadsToday: nextCount,
        maxDailyUploads: 2,
        remainingUploadsToday: Math.max(0, 2 - nextCount),
        message: 'រូបភាពប្រវត្តិរូបត្រូវបានផ្លាស់ប្តូរដោយជោគជ័យ (Profile photo updated successfully).',
      });
    } catch (err: any) {
      console.error('[ProfileController] Avatar upload error:', err);
      return sendError(res, 'UPLOAD_FAILED', err?.message || 'Failed to upload profile photo.', 500);
    }
  }

  /**
   * Serve avatar image file from MinIO / local storage
   */
  static async serveAvatar(req: Request, res: Response) {
    const { key } = req.params;
    if (!key) {
      return res.status(400).send('Filename key required');
    }

    try {
      const fileData = await StorageService.getAvatarStream(key);
      if (!fileData) {
        return res.status(404).send('Avatar image not found');
      }

      res.setHeader('Content-Type', fileData.mimeType);
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      if (fileData.size) {
        res.setHeader('Content-Length', fileData.size);
      }

      fileData.stream.pipe(res);
    } catch (err: any) {
      console.error('[ProfileController] Serve avatar error:', err);
      return res.status(500).send('Error serving avatar image');
    }
  }
}
