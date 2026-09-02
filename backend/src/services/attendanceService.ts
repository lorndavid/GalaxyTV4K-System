import { prisma } from '../utils/prisma.js';
import {
  AttendanceStatus,
  EmployeeStatus,
  QrSessionStatus,
  QrSessionType,
  RequestStatus,
  ActorType,
  Prisma,
} from '@prisma/client';
import { QrService } from './qrService.js';
import { validateGeofence } from '../utils/geo.js';
import {
  getCurrentDateInTimezone,
  getCurrentTimeInTimezone,
  getDayOfWeekEnum,
  calculateLateMinutes,
  calculateEarlyLeaveMinutes,
  calculateWorkedMinutes,
} from '../utils/time.js';
import { createAuditLog } from '../utils/audit.js';

export interface ScanAttendanceInput {
  employeeId: string;
  token: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface AttendanceResult {
  action: 'CHECK_IN' | 'CHECK_OUT';
  attendance: any;
  message: string;
  details: {
    distanceFromOfficeMeters: number;
    accuracyMeters: number;
    status: AttendanceStatus;
    lateMinutes: number;
    earlyLeaveMinutes: number;
    workedMinutes: number;
  };
}

export class AttendanceService {
  /**
   * Authoritative backend attendance scanning handler.
   * Runs in an isolated database transaction to guarantee ACID integrity.
   */
  static async processAttendanceScan(input: ScanAttendanceInput): Promise<AttendanceResult> {
    const { employeeId, token, latitude, longitude, accuracy, ipAddress, userAgent } = input;

    // 1. Hash the incoming token
    const tokenHash = QrService.hashToken(token.trim());

    // 2. Fetch Company Settings
    const settings = await prisma.companySettings.findUnique({
      where: { id: 'default' },
    });
    if (!settings) {
      throw { code: 'SETTINGS_NOT_FOUND', message: 'Company settings not configured.', status: 500 };
    }

    // 2.1 Coordinate Bounds & Sanity Validation
    if (typeof latitude !== 'number' || isNaN(latitude) || latitude < -90 || latitude > 90) {
      throw { code: 'INVALID_COORDINATES', message: 'Latitude must be a valid number between -90 and 90.', status: 400 };
    }
    if (typeof longitude !== 'number' || isNaN(longitude) || longitude < -180 || longitude > 180) {
      throw { code: 'INVALID_COORDINATES', message: 'Longitude must be a valid number between -180 and 180.', status: 400 };
    }
    if (typeof accuracy !== 'number' || isNaN(accuracy) || accuracy < 0) {
      throw { code: 'INVALID_ACCURACY', message: 'GPS accuracy must be a non-negative number.', status: 400 };
    }

    const timezone = settings.timezone || 'Asia/Phnom_Penh';
    const now = new Date();
    const todayDateStr = getCurrentDateInTimezone(timezone, now);
    const currentTimeStr = getCurrentTimeInTimezone(timezone, now);
    const dayOfWeek = getDayOfWeekEnum(now, timezone);

    // 3. Geofence & GPS Accuracy Validation
    const geo = validateGeofence(
      latitude,
      longitude,
      accuracy,
      settings.latitude,
      settings.longitude,
      settings.allowedRadiusMeters,
      settings.gpsAccuracyThresholdMeters
    );

    if (!geo.isAccuracyAcceptable) {
      throw {
        code: 'GPS_ACCURACY_TOO_LOW',
        message: `GPS accuracy is too low (±${Math.round(accuracy)}m). Allowed maximum is ±${settings.gpsAccuracyThresholdMeters}m. Please ensure GPS/Location is in high-accuracy mode and try again.`,
        status: 400,
        details: { accuracy, threshold: settings.gpsAccuracyThresholdMeters },
      };
    }

    if (!geo.isWithinGeofence) {
      throw {
        code: 'OUTSIDE_GEOFENCE',
        message: `You are outside the company attendance perimeter (${Math.round(geo.distanceMeters)}m away). Maximum allowed distance is ${settings.allowedRadiusMeters}m.`,
        status: 400,
        details: { distance: geo.distanceMeters, allowedRadius: settings.allowedRadiusMeters },
      };
    }

    // 4. Atomic Execution inside Prisma Transaction
    return await prisma.$transaction(async (tx) => {
      // Step A: Validate Employee
      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
        include: {
          schedule: {
            include: { days: true },
          },
          user: true,
        },
      });

      if (!employee) {
        throw { code: 'EMPLOYEE_NOT_FOUND', message: 'Employee profile not found.', status: 404 };
      }

      if (employee.status !== EmployeeStatus.ACTIVE) {
        throw {
          code: 'EMPLOYEE_INACTIVE',
          message: 'Your employee account is suspended or inactive.',
          status: 403,
        };
      }

      // Step B: Check for Approved Leave on today
      const approvedLeave = await tx.leaveRequest.findFirst({
        where: {
          employeeId: employee.id,
          status: RequestStatus.APPROVED,
          startDate: { lte: todayDateStr },
          endDate: { gte: todayDateStr },
        },
      });

      if (approvedLeave) {
        throw {
          code: 'LEAVE_APPROVED',
          message: `You have an approved leave (${approvedLeave.type}) for today. Attendance recording is disabled.`,
          status: 400,
        };
      }

      // Step C: Validate QR Session
      const qrSession = await tx.qrSession.findUnique({
        where: { tokenHash },
      });

      if (!qrSession) {
        throw { code: 'QR_INVALID', message: 'Invalid or unrecognized QR code token.', status: 400 };
      }

      if (qrSession.status === QrSessionStatus.REVOKED) {
        throw {
          code: 'QR_REVOKED',
          message: 'This QR code has been revoked or regenerated by an administrator. Please scan the current QR code on the admin screen.',
          status: 400,
        };
      }

      if (qrSession.status === QrSessionStatus.EXPIRED || qrSession.expiresAt < now) {
        // Mark session as expired in DB
        await tx.qrSession.update({
          where: { id: qrSession.id },
          data: { status: QrSessionStatus.EXPIRED },
        });
        throw {
          code: 'QR_EXPIRED',
          message: 'This attendance QR code has expired. Please scan the updated QR code.',
          status: 400,
        };
      }

      // Step D: Retrieve Schedule Day Configuration
      let schedule = employee.schedule;
      if (!schedule) {
        // Fallback to default schedule
        schedule = await tx.schedule.findFirst({
          where: { isDefault: true },
          include: { days: true },
        });
      }

      const scheduleDay = schedule?.days.find((d) => d.dayOfWeek === dayOfWeek);

      // Step E: Check Existing Attendance for Today
      const existingAttendance = await tx.attendance.findUnique({
        where: {
          employeeId_date: {
            employeeId: employee.id,
            date: todayDateStr,
          },
        },
      });

      // ==========================================
      // Branch 1: CHECK-IN FLOW
      // ==========================================
      if (!existingAttendance) {
        // Enforce QR Type if set to CHECK_OUT only
        if (qrSession.type === QrSessionType.CHECK_OUT) {
          throw {
            code: 'INVALID_ATTENDANCE_STATE',
            message: 'This QR code is designated for CHECK-OUT only.',
            status: 400,
          };
        }

        // Determine Status (PRESENT vs LATE vs REST_DAY)
        let attendanceStatus: AttendanceStatus = AttendanceStatus.PRESENT;
        let lateMinutes = 0;

        if (scheduleDay && scheduleDay.isWorkingDay) {
          lateMinutes = calculateLateMinutes(
            currentTimeStr,
            scheduleDay.startTime,
            settings.lateGracePeriodMinutes
          );
          if (lateMinutes > 0) {
            attendanceStatus = AttendanceStatus.LATE;
          }
        } else {
          // If worked on a rest day
          attendanceStatus = AttendanceStatus.REST_DAY;
        }

        const attendance = await tx.attendance.create({
          data: {
            employeeId: employee.id,
            scheduleId: schedule?.id || null,
            date: todayDateStr,
            checkInAt: now,
            checkInLatitude: latitude,
            checkInLongitude: longitude,
            checkInAccuracy: accuracy,
            checkInDistanceMeters: geo.distanceMeters,
            checkInQrSessionId: qrSession.id,
            status: attendanceStatus,
            lateMinutes,
            ipAddress,
            userAgent,
          },
        });

        // Increment QR usage count
        await tx.qrSession.update({
          where: { id: qrSession.id },
          data: {
            usedByCount: { increment: 1 },
            usedAt: now,
          },
        });

        // Create Audit Log
        await createAuditLog(
          {
            actorId: employee.user?.id || null,
            actorType: ActorType.EMPLOYEE,
            action: 'ATTENDANCE_CHECK_IN',
            entityType: 'Attendance',
            entityId: attendance.id,
            metadata: {
              date: todayDateStr,
              time: currentTimeStr,
              status: attendanceStatus,
              lateMinutes,
              distanceMeters: geo.distanceMeters,
            },
            ipAddress,
            userAgent,
          },
          tx
        );

        return {
          action: 'CHECK_IN',
          attendance,
          message:
            attendanceStatus === AttendanceStatus.LATE
              ? `Check-in recorded at ${currentTimeStr}. Note: Marked as late by ${lateMinutes} minutes.`
              : `Checked in successfully at ${currentTimeStr}! Have a great workday.`,
          details: {
            distanceFromOfficeMeters: geo.distanceMeters,
            accuracyMeters: accuracy,
            status: attendanceStatus,
            lateMinutes,
            earlyLeaveMinutes: 0,
            workedMinutes: 0,
          },
        };
      }

      // ==========================================
      // Branch 2: CHECK-OUT FLOW
      // ==========================================
      if (existingAttendance.checkInAt && existingAttendance.checkOutAt) {
        throw {
          code: 'ALREADY_CHECKED_OUT',
          message: 'You have already checked out for today.',
          status: 400,
        };
      }

      if (!existingAttendance.checkInAt) {
        throw {
          code: 'INVALID_ATTENDANCE_STATE',
          message: 'Cannot check out without a valid check-in record.',
          status: 400,
        };
      }

      // Enforce QR Type if set to CHECK_IN only
      if (qrSession.type === QrSessionType.CHECK_IN) {
        throw {
          code: 'INVALID_ATTENDANCE_STATE',
          message: 'This QR code is designated for CHECK-IN only.',
          status: 400,
        };
      }

      // Calculate Early Leave & Total Worked Minutes
      let earlyLeaveMinutes = 0;
      if (scheduleDay && scheduleDay.isWorkingDay) {
        earlyLeaveMinutes = calculateEarlyLeaveMinutes(
          currentTimeStr,
          scheduleDay.endTime,
          settings.earlyLeaveGraceMinutes
        );
      }

      const workedMinutes = calculateWorkedMinutes(
        existingAttendance.checkInAt,
        now,
        scheduleDay?.breakStartTime,
        scheduleDay?.breakEndTime
      );

      // Determine updated status
      let finalStatus = existingAttendance.status;
      if (earlyLeaveMinutes > 0 && finalStatus !== AttendanceStatus.LATE) {
        finalStatus = AttendanceStatus.EARLY_LEAVE;
      }

      const updatedAttendance = await tx.attendance.update({
        where: { id: existingAttendance.id },
        data: {
          checkOutAt: now,
          checkOutLatitude: latitude,
          checkOutLongitude: longitude,
          checkOutAccuracy: accuracy,
          checkOutDistanceMeters: geo.distanceMeters,
          checkOutQrSessionId: qrSession.id,
          status: finalStatus,
          earlyLeaveMinutes,
          workedMinutes,
        },
      });

      // Increment QR usage count
      await tx.qrSession.update({
        where: { id: qrSession.id },
        data: {
          usedByCount: { increment: 1 },
          usedAt: now,
        },
      });

      // Audit Log
      await createAuditLog(
        {
          actorId: employee.user?.id || null,
          actorType: ActorType.EMPLOYEE,
          action: 'ATTENDANCE_CHECK_OUT',
          entityType: 'Attendance',
          entityId: updatedAttendance.id,
          metadata: {
            date: todayDateStr,
            time: currentTimeStr,
            workedMinutes,
            earlyLeaveMinutes,
            distanceMeters: geo.distanceMeters,
          },
          ipAddress,
          userAgent,
        },
        tx
      );

      const hours = Math.floor(workedMinutes / 60);
      const mins = workedMinutes % 60;

      return {
        action: 'CHECK_OUT',
        attendance: updatedAttendance,
        message: `Checked out successfully at ${currentTimeStr}! Total worked: ${hours}h ${mins}m.`,
        details: {
          distanceFromOfficeMeters: geo.distanceMeters,
          accuracyMeters: accuracy,
          status: finalStatus,
          lateMinutes: updatedAttendance.lateMinutes,
          earlyLeaveMinutes,
          workedMinutes,
        },
      };
    });
  }

  /**
   * Manual Attendance Adjustment by Administrator.
   * Strictly records previous and new values in the immutable audit log.
   */
  static async manualAdjustAttendance({
    attendanceId,
    employeeId,
    date,
    checkInAt,
    checkOutAt,
    status,
    notes,
    adminUserId,
    ipAddress,
    userAgent,
  }: {
    attendanceId?: string;
    employeeId?: string;
    date?: string;
    checkInAt?: Date | null;
    checkOutAt?: Date | null;
    status: AttendanceStatus;
    notes?: string;
    adminUserId: string;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      let existingRecord: any = null;

      if (attendanceId) {
        existingRecord = await tx.attendance.findUnique({
          where: { id: attendanceId },
          include: { employee: true },
        });
      } else if (employeeId && date) {
        existingRecord = await tx.attendance.findUnique({
          where: { employeeId_date: { employeeId, date } },
          include: { employee: true },
        });
      }

      let workedMinutes = 0;
      if (checkInAt && checkOutAt) {
        workedMinutes = calculateWorkedMinutes(new Date(checkInAt), new Date(checkOutAt));
      }

      let adjusted: any;

      if (existingRecord) {
        adjusted = await tx.attendance.update({
          where: { id: existingRecord.id },
          data: {
            checkInAt: checkInAt !== undefined ? checkInAt : existingRecord.checkInAt,
            checkOutAt: checkOutAt !== undefined ? checkOutAt : existingRecord.checkOutAt,
            status,
            workedMinutes: workedMinutes || existingRecord.workedMinutes,
            notes: notes ? `${existingRecord.notes ? existingRecord.notes + ' | ' : ''}Manual edit: ${notes}` : existingRecord.notes,
          },
        });

        await createAuditLog(
          {
            actorId: adminUserId,
            actorType: ActorType.ADMIN,
            action: 'ATTENDANCE_MANUAL_ADJUSTMENT',
            entityType: 'Attendance',
            entityId: existingRecord.id,
            metadata: {
              oldValue: {
                checkInAt: existingRecord.checkInAt,
                checkOutAt: existingRecord.checkOutAt,
                status: existingRecord.status,
              },
              newValue: {
                checkInAt,
                checkOutAt,
                status,
                notes,
              },
              reason: notes || 'Admin manual correction',
            },
            ipAddress,
            userAgent,
          },
          tx
        );
      } else {
        if (!employeeId || !date) {
          throw { code: 'INVALID_PARAMETERS', message: 'employeeId and date are required for new manual attendance record.', status: 400 };
        }

        adjusted = await tx.attendance.create({
          data: {
            employeeId,
            date,
            checkInAt: checkInAt || null,
            checkOutAt: checkOutAt || null,
            status,
            workedMinutes,
            notes: `Manual creation by admin: ${notes || 'No reason provided'}`,
          },
        });

        await createAuditLog(
          {
            actorId: adminUserId,
            actorType: ActorType.ADMIN,
            action: 'ATTENDANCE_MANUAL_CREATE',
            entityType: 'Attendance',
            entityId: adjusted.id,
            metadata: {
              date,
              employeeId,
              status,
              notes,
            },
            ipAddress,
            userAgent,
          },
          tx
        );
      }

      return adjusted;
    });
  }
}
