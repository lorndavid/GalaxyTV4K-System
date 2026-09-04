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
   * When queried by a single date, returns the complete unified employee roster with automatic
   * WORK vs STUDY duty classification and live scan status.
   */
  static async getAdminAttendance(req: AuthenticatedRequest, res: Response) {
    const { date, startDate, endDate, departmentId, employeeId, status, search, dutyType } = req.query;

    if (date && !startDate && !endDate) {
      const targetDate = String(date).trim();
      const dateParts = targetDate.split('-').map((p) => parseInt(p, 10));
      const parsedDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
      const dayIndex = parsedDate.getDay();

      const employeeWhere: any = { status: 'ACTIVE' };
      if (departmentId) {
        employeeWhere.departmentId = String(departmentId);
      }
      if (employeeId) {
        employeeWhere.id = String(employeeId);
      }
      if (search) {
        const strSearch = String(search).trim();
        employeeWhere.OR = [
          { displayName: { contains: strSearch, mode: 'insensitive' } },
          { khmerName: { contains: strSearch, mode: 'insensitive' } },
          { latinName: { contains: strSearch, mode: 'insensitive' } },
          { employeeCode: { contains: strSearch, mode: 'insensitive' } },
        ];
      }

      const allEmployees = await prisma.employee.findMany({
        where: employeeWhere,
        include: {
          department: true,
          schedule: true,
        },
        orderBy: { employeeCode: 'asc' },
      });

      const existingAttendance = await prisma.attendance.findMany({
        where: {
          date: targetDate,
          ...(employeeId ? { employeeId: String(employeeId) } : {}),
        },
        include: {
          schedule: true,
        },
      });
      const attendanceMap = new Map<string, typeof existingAttendance[0]>();
      for (const att of existingAttendance) {
        attendanceMap.set(att.employeeId, att);
      }

      const activeLeaves = await prisma.leaveRequest.findMany({
        where: {
          status: 'APPROVED',
          startDate: { lte: targetDate },
          endDate: { gte: targetDate },
        },
      });
      const leaveMap = new Map<string, typeof activeLeaves[0]>();
      for (const leave of activeLeaves) {
        leaveMap.set(leave.employeeId, leave);
      }

      let unifiedRoster = allEmployees.map((emp) => {
        const att = attendanceMap.get(emp.id);
        const leave = leaveMap.get(emp.id);
        const isStudy = TelegramService.checkIsStudyDay(emp.studyDay, dayIndex);

        let determinedDuty: 'WORK' | 'STUDY' | 'LEAVE' = isStudy ? 'STUDY' : 'WORK';
        let determinedDutyLabel = isStudy ? 'វេនរៀន' : 'បំពេញការងារ';

        if (leave) {
          determinedDuty = 'LEAVE';
          determinedDutyLabel = `សុំច្បាប់ (${leave.type})`;
        }

        const effectiveStatus = att
          ? att.status
          : leave
          ? 'ON_LEAVE'
          : 'NOT_CHECKED_IN';

        return {
          id: att?.id || `virtual-${emp.id}-${targetDate}`,
          date: targetDate,
          checkInAt: att?.checkInAt || null,
          checkOutAt: att?.checkOutAt || null,
          status: effectiveStatus,
          lateMinutes: att?.lateMinutes || 0,
          earlyLeaveMinutes: att?.earlyLeaveMinutes || 0,
          workedMinutes: att?.workedMinutes || 0,
          checkInDistanceMeters: att?.checkInDistanceMeters || null,
          checkInAccuracy: att?.checkInAccuracy || null,
          notes: att?.notes || null,
          dutyType: determinedDuty,
          dutyLabel: determinedDutyLabel,
          isStudyDay: isStudy,
          studyDay: emp.studyDay || 'គ្មាន',
          employee: {
            id: emp.id,
            employeeCode: emp.employeeCode,
            displayName: emp.displayName,
            khmerName: emp.khmerName || emp.displayName,
            latinName: emp.latinName || emp.displayName,
            studyDay: emp.studyDay,
            department: emp.department ? { id: emp.department.id, name: emp.department.name } : undefined,
          },
          schedule: att?.schedule || emp.schedule || null,
          isVirtual: !att,
        };
      });

      if (dutyType) {
        unifiedRoster = unifiedRoster.filter((r) => r.dutyType === dutyType);
      }

      if (status) {
        unifiedRoster = unifiedRoster.filter((r) => r.status === status);
      }

      return sendSuccess(res, unifiedRoster);
    }

    const where: any = {};

    if (startDate || endDate) {
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
      const strSearch = String(search).trim();
      where.employee = {
        ...where.employee,
        OR: [
          { displayName: { contains: strSearch, mode: 'insensitive' } },
          { khmerName: { contains: strSearch, mode: 'insensitive' } },
          { latinName: { contains: strSearch, mode: 'insensitive' } },
          { employeeCode: { contains: strSearch, mode: 'insensitive' } },
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
    const { employeeId, date, checkInAt, checkOutAt, status, notes, reason } = req.body;

    try {
      const isVirtual = !id || id === 'new' || id.startsWith('virtual-');
      const result = await AttendanceService.manualAdjustAttendance({
        attendanceId: !isVirtual ? id : undefined,
        employeeId,
        date,
        checkInAt: checkInAt ? new Date(checkInAt) : null,
        checkOutAt: checkOutAt ? new Date(checkOutAt) : null,
        status: status || AttendanceStatus.MANUAL_ADJUSTMENT,
        notes: notes || reason,
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

  /**
   * Real-time Server-Sent Events (SSE) Live Attendance Stream
   */
  static stream(_req: AuthenticatedRequest, res: Response) {
    AttendanceService.registerAttendanceSSEClient(res);
  }
}
