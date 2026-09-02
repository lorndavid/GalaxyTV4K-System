import { Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { AttendanceService } from '../services/attendanceService.js';
import { TelegramService } from '../services/telegramService';
import { AttendanceStatus } from '@prisma/client';

export class AttendanceController {
  /**
   * Endpoint for Employee QR Scan & Geolocation Attendance submission.
   */
  static async scan(req: AuthenticatedRequest, res: Response) {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      return sendError(res, 'EMPLOYEE_REQUIRED', 'Only registered employees can submit attendance.', 403);
    }

    const { token, qrToken, latitude, longitude, accuracy } = req.body;
    const actualToken = token || qrToken;

    if (!actualToken || typeof actualToken !== 'string') {
      return sendError(res, 'INVALID_TOKEN', 'QR attendance token is required.', 400);
    }

    if (typeof latitude !== 'number' || typeof longitude !== 'number' || typeof accuracy !== 'number') {
      return sendError(res, 'INVALID_GPS', 'Accurate GPS coordinates and accuracy reading are required.', 400);
    }

    try {
      const result = await AttendanceService.processAttendanceScan({
        employeeId,
        token: actualToken,
        latitude,
        longitude,
        accuracy,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      // Asynchronously trigger Telegram notification without blocking response
      const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
      if (employee) {
        if (result.action === 'CHECK_IN') {
          TelegramService.notifyCheckIn({
            employeeName: employee.displayName,
            employeeCode: employee.employeeCode,
            time: new Date(result.attendance.checkInAt).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Asia/Phnom_Penh',
            }),
            isLate: result.details.status === 'LATE',
            lateMinutes: result.details.lateMinutes,
            isInsideOffice: true,
            distanceMeters: result.details.distanceFromOfficeMeters,
            accuracyMeters: result.details.accuracyMeters,
          }).catch((err) => console.error('[Telegram] Check-in notification error:', err));
        } else if (result.action === 'CHECK_OUT') {
          const hours = Math.floor(result.details.workedMinutes / 60);
          const mins = result.details.workedMinutes % 60;
          TelegramService.notifyCheckOut({
            employeeName: employee.displayName,
            employeeCode: employee.employeeCode,
            time: new Date(result.attendance.checkOutAt).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Asia/Phnom_Penh',
            }),
            workedDuration: `${hours}h ${mins}m`,
            isInsideOffice: true,
            distanceMeters: result.details.distanceFromOfficeMeters,
          }).catch((err) => console.error('[Telegram] Check-out notification error:', err));
        }
      }

      return sendSuccess(res, result);
    } catch (err: any) {
      return sendError(
        res,
        err.code || 'ATTENDANCE_ERROR',
        err.message || 'Failed to process attendance.',
        err.status || 400,
        err.details
      );
    }
  }

  static async getMyToday(req: AuthenticatedRequest, res: Response) {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      return sendError(res, 'EMPLOYEE_REQUIRED', 'Employee profile required.', 403);
    }

    const today = new Date().toISOString().substring(0, 10);
    const record = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: today,
        },
      },
    });

    return sendSuccess(res, record || { date: today, checkInAt: null, checkOutAt: null, status: 'NOT_CHECKED_IN' });
  }

  /**
   * Employee personal attendance history & today's status.
   */
  static async getMyAttendance(req: AuthenticatedRequest, res: Response) {
    const employeeId = req.user?.employeeId;
    if (!employeeId) {
      return sendError(res, 'EMPLOYEE_REQUIRED', 'Employee profile required.', 403);
    }

    const { month, year } = req.query;
    const now = new Date();
    const targetYear = year ? parseInt(String(year), 10) : now.getFullYear();
    const targetMonth = month ? String(month).padStart(2, '0') : String(now.getMonth() + 1).padStart(2, '0');
    const monthPrefix = `${targetYear}-${targetMonth}`;

    const records = await prisma.attendance.findMany({
      where: {
        employeeId,
        date: { startsWith: monthPrefix },
      },
      orderBy: { date: 'desc' },
    });

    // Summary calculations
    const present = records.filter((r) => r.status === AttendanceStatus.PRESENT).length;
    const late = records.filter((r) => r.status === AttendanceStatus.LATE).length;
    const earlyLeave = records.filter((r) => r.status === AttendanceStatus.EARLY_LEAVE).length;
    const totalWorkedMinutes = records.reduce((acc, r) => acc + r.workedMinutes, 0);

    return sendSuccess(res, {
      month: monthPrefix,
      summary: {
        present,
        late,
        earlyLeave,
        totalWorkedMinutes,
        totalWorkedHours: (totalWorkedMinutes / 60).toFixed(1),
        daysLogged: records.length,
      },
      records,
    });
  }

  /**
   * Admin: List all attendance records with filters.
   */
  static async getAdminAttendance(req: AuthenticatedRequest, res: Response) {
    const { date, startDate, endDate, departmentId, employeeId, status, search } = req.query;

    const where: any = {};

    if (date) {
      where.date = String(date);
    } else if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = String(startDate);
      if (endDate) where.date.lte = String(endDate);
    }

    if (status) {
      where.status = status as AttendanceStatus;
    }

    if (employeeId) {
      where.employeeId = String(employeeId);
    }

    if (departmentId) {
      where.employee = { departmentId: String(departmentId) };
    }

    if (search) {
      where.employee = {
        ...where.employee,
        OR: [
          { displayName: { contains: String(search), mode: 'insensitive' } },
          { employeeCode: { contains: String(search), mode: 'insensitive' } },
        ],
      };
    }

    const records = await prisma.attendance.findMany({
      where,
      include: {
        employee: {
          include: { department: true },
        },
        schedule: true,
      },
      orderBy: [{ date: 'desc' }, { checkInAt: 'desc' }],
    });

    return sendSuccess(res, records);
  }

  /**
   * Admin: Manual attendance correction.
   */
  static async adjustAttendance(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { employeeId, date, checkInAt, checkOutAt, status, notes } = req.body;

    try {
      const result = await AttendanceService.manualAdjustAttendance({
        attendanceId: id !== 'new' ? id : undefined,
        employeeId,
        date,
        checkInAt: checkInAt ? new Date(checkInAt) : null,
        checkOutAt: checkOutAt ? new Date(checkOutAt) : null,
        status: status || AttendanceStatus.MANUAL_ADJUSTMENT,
        notes,
        adminUserId: req.user!.userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return sendSuccess(res, result);
    } catch (err: any) {
      return sendError(
        res,
        err.code || 'ADJUSTMENT_FAILED',
        err.message || 'Failed to adjust attendance record.',
        err.status || 400
      );
    }
  }
}
