import { Response } from 'express';
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
  parseTimeToMinutes,
  calculateLateMinutes,
  calculateEarlyLeaveMinutes,
  calculateWorkedMinutes,
} from '../utils/time.js';
import { createAuditLog } from '../utils/audit.js';

import { detectVpnOrProxy, detectFakeGps } from '../utils/security.js';

// Active SSE client connections for real-time live attendance stream
const attendanceSseClients = new Set<Response>();

export interface ScanAttendanceInput {
  employeeId: string;
  token: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  ipAddress?: string;
  userAgent?: string;
  isMocked?: boolean;
  headers?: Record<string, any>;
}

export interface ZoneCheckInInput {
  employeeId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  ipAddress?: string;
  userAgent?: string;
  isMocked?: boolean;
  headers?: Record<string, any>;
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
   * Register SSE client response stream for real-time live attendance
   */
  public static registerAttendanceSSEClient(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx proxy buffering

    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', time: new Date().toISOString() })}\n\n`);
    attendanceSseClients.add(res);

    res.on('close', () => {
      attendanceSseClients.delete(res);
    });
  }

  /**
   * Broadcast real-time attendance event to all connected admin/employee clients via SSE
   */
  public static broadcastAttendanceEvent(payload: any): void {
    const dataString = `data: ${JSON.stringify(payload)}\n\n`;
    for (const client of attendanceSseClients) {
      try {
        client.write(dataString);
      } catch {
        attendanceSseClients.delete(client);
      }
    }
  }

  /**
   * Authoritative backend attendance scanning handler.
   * Runs in an isolated database transaction to guarantee ACID integrity.
   */
  static async processAttendanceScan(input: ScanAttendanceInput): Promise<AttendanceResult> {
    const { employeeId, token, latitude, longitude, accuracy, ipAddress, userAgent, isMocked, headers } = input;

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

    // 2.2 Third-Party VPN / Proxy Detection
    const vpnCheck = detectVpnOrProxy(headers);
    if (vpnCheck.isVpn) {
      throw {
        code: 'VPN_DETECTED',
        message: vpnCheck.reason,
        status: 403,
      };
    }

    // 2.3 Fake GPS & Mock Location Detection
    const prevLocation = await prisma.employeeLocation.findFirst({
      where: { employeeId },
      orderBy: { recordedAt: 'desc' },
      select: { latitude: true, longitude: true, recordedAt: true },
    });

    const fakeGpsCheck = detectFakeGps({
      latitude,
      longitude,
      accuracy,
      isMocked,
      prevLocation,
      currentTime: now,
    });

    if (fakeGpsCheck.isFakeGps) {
      throw {
        code: fakeGpsCheck.isSpeedAnomaly ? 'GPS_ANOMALY_SPOOFING' : 'FAKE_GPS_DETECTED',
        message: fakeGpsCheck.reason,
        status: 403,
      };
    }

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
    const result = await prisma.$transaction<AttendanceResult>(async (tx) => {
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
        throw { code: 'QR_INVALID', message: 'This QR code is not valid for attendance.', status: 400 };
      }

      if (
        qrSession.status === QrSessionStatus.REVOKED ||
        qrSession.status === QrSessionStatus.INACTIVE ||
        qrSession.revokedAt
      ) {
        throw {
          code: 'QR_NOT_ACTIVE',
          message: 'This attendance QR code is no longer active.',
          status: 400,
        };
      }

      // Date validation (Requirement 9, 11 & 12: One-Day QR & Server Date Enforcement)
      if (qrSession.date && qrSession.date !== todayDateStr) {
        if (qrSession.date > todayDateStr) {
          throw {
            code: 'QR_NOT_ACTIVE_YET',
            message: 'Attendance scanning is not available yet.',
            status: 400,
          };
        } else {
          throw {
            code: 'QR_EXPIRED',
            message: 'This attendance QR code has expired.',
            status: 400,
          };
        }
      }

      // Time validation (Requirement 10 & 11: Server Time Enforcement)
      if (qrSession.validFrom && currentTimeStr < qrSession.validFrom) {
        throw {
          code: 'QR_NOT_ACTIVE_YET',
          message: 'Attendance scanning is not available yet.',
          status: 400,
        };
      }

      if (qrSession.validUntil && currentTimeStr > qrSession.validUntil) {
        throw {
          code: 'QR_EXPIRED',
          message: 'This attendance QR code has expired.',
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
          message: 'This attendance QR code has expired.',
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
          // Check if employee has a custom shift or check-in window
          const openTime = employee.checkInStartTime || settings.workStartTime || (scheduleDay && scheduleDay.startTime) || '08:00';
          const deadlineTime = employee.checkInDeadline || employee.checkInStartTime || settings.workStartTime || (scheduleDay && scheduleDay.startTime) || '08:00';

          const openMinutes = parseTimeToMinutes(openTime);
          const currentMinutes = parseTimeToMinutes(currentTimeStr);

          // For afternoon or custom shift, enforce check-in open from exact checkInStartTime (e.g. 12:00)
          const allowedBefore = (employee.shiftType === 'AFTERNOON' || (employee.checkInStartTime && employee.checkInStartTime !== '08:00'))
            ? 0
            : (settings.checkInAllowedBeforeMinutes ?? 60);
          const earliestMinutes = Math.max(0, openMinutes - allowedBefore);

          if (currentMinutes < earliestMinutes) {
            const openH = Math.floor(openMinutes / 60).toString().padStart(2, '0');
            const openM = (openMinutes % 60).toString().padStart(2, '0');
            const openTimeStr = `${openH}:${openM}`;
            const timeTag = openMinutes >= 720 ? 'ថ្ងៃត្រង់/រសៀល' : 'ព្រឹក';
            throw {
              code: 'CHECK_IN_NOT_OPEN_YET',
              message: `ការកត់ត្រាវត្តមានចូលមិនទាន់បើកនៅឡើយទេ។ បើកចាប់ពីម៉ោង ${openTimeStr} ${timeTag}តទៅ (Check-in opens at ${openTimeStr}).`,
              status: 400,
            };
          }

          lateMinutes = calculateLateMinutes(
            currentTimeStr,
            deadlineTime,
            settings.lateGracePeriodMinutes ?? 0
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
      // Branch 2: CHECK-OUT FLOW (OR IDEMPOTENT RE-SCAN)
      // ==========================================
      // Guard A: If already completed both check-in and check-out today
      if (existingAttendance.checkInAt && existingAttendance.checkOutAt) {
        const checkOutDiffMs = now.getTime() - new Date(existingAttendance.checkOutAt).getTime();
        if (checkOutDiffMs < 60 * 1000) {
          return {
            action: 'CHECK_OUT',
            attendance: existingAttendance,
            message: `Check-out already confirmed for today at ${currentTimeStr}.`,
            details: {
              distanceFromOfficeMeters: geo.distanceMeters,
              accuracyMeters: accuracy,
              status: existingAttendance.status,
              lateMinutes: existingAttendance.lateMinutes,
              earlyLeaveMinutes: existingAttendance.earlyLeaveMinutes,
              workedMinutes: existingAttendance.workedMinutes,
            },
          };
        }
        throw {
          code: 'ALREADY_CHECKED_OUT',
          message: 'You have already checked out for today.',
          status: 400,
        };
      }

      // Guard B: If check-in occurred within the last 60 seconds and QR is not explicitly CHECK_OUT,
      // treat as an idempotent confirmation of the check-in (prevents accidental 0-minute checkouts on double tap)
      if (
        existingAttendance.checkInAt &&
        !existingAttendance.checkOutAt &&
        qrSession.type !== QrSessionType.CHECK_OUT
      ) {
        const checkInDiffMs = now.getTime() - new Date(existingAttendance.checkInAt).getTime();
        if (checkInDiffMs < 60 * 1000) {
          return {
            action: 'CHECK_IN',
            attendance: existingAttendance,
            message: `Check-in already confirmed at ${currentTimeStr}. Have a great day!`,
            details: {
              distanceFromOfficeMeters: geo.distanceMeters,
              accuracyMeters: accuracy,
              status: existingAttendance.status,
              lateMinutes: existingAttendance.lateMinutes,
              earlyLeaveMinutes: 0,
              workedMinutes: 0,
            },
          };
        }
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

      // Enforce Check-Out Time Rule: Cannot check out before scheduled shift end time (e.g. 17:30 / 5:30 PM)
      const endTime = settings.workEndTime || (scheduleDay && scheduleDay.endTime) || '17:30';
      const endMinutes = parseTimeToMinutes(endTime);
      const currentMinutes = parseTimeToMinutes(currentTimeStr);
      const earlyGrace = settings.earlyLeaveGraceMinutes ?? 0;
      const earliestAllowedCheckOutMinutes = Math.max(0, endMinutes - earlyGrace);

      if (scheduleDay && scheduleDay.isWorkingDay) {
        if (currentMinutes < earliestAllowedCheckOutMinutes) {
          const endH = Math.floor(endMinutes / 60);
          const endM = (endMinutes % 60).toString().padStart(2, '0');
          const endPeriod = endH >= 12 ? 'PM' : 'AM';
          const endH12 = (endH % 12 || 12).toString().padStart(2, '0');
          const formattedEndTime = `${endH12}:${endM} ${endPeriod}`;

          throw {
            code: 'CHECK_OUT_TOO_EARLY',
            message: `មិនទាន់ដល់ម៉ោងចេញពីធ្វើការនៅឡើយទេ។ ម៉ោងចេញដែលបានកំណត់គឺចាប់ពីម៉ោង ${formattedEndTime} (${endTime}) តទៅ។ (You cannot check out yet. Scheduled check-out time is ${formattedEndTime}).`,
            status: 400,
            details: {
              scheduledEndTime: endTime,
              currentTime: currentTimeStr,
              earliestAllowedCheckOutTime: `${Math.floor(earliestAllowedCheckOutMinutes / 60).toString().padStart(2, '0')}:${(earliestAllowedCheckOutMinutes % 60).toString().padStart(2, '0')}`,
            },
          };
        }
      }

      // Calculate Early Leave & Total Worked Minutes
      let earlyLeaveMinutes = 0;
      if (scheduleDay && scheduleDay.isWorkingDay) {
        earlyLeaveMinutes = calculateEarlyLeaveMinutes(
          currentTimeStr,
          endTime,
          settings.earlyLeaveGraceMinutes ?? 0
        );
      }

      const breakStart = (scheduleDay && scheduleDay.breakStartTime) || settings.breakStartTime || '11:30';
      const breakEnd = (scheduleDay && scheduleDay.breakEndTime) || settings.breakEndTime || '13:00';

      const workedMinutes = calculateWorkedMinutes(
        existingAttendance.checkInAt,
        now,
        breakStart,
        breakEnd
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

    // Broadcast Real-Time Attendance Event to Admin and Employee Streams
    AttendanceService.broadcastAttendanceEvent({
      type: 'ATTENDANCE_RECORDED',
      action: result.action,
      attendance: result.attendance,
      details: result.details,
      recordedAt: now.toISOString(),
    });

    return result;
  }

  /**
   * 1-Click In-Zone Check-In / Check-Out for verified office perimeter.
   * Admin-configurable policy: Requires being inside office geofence.
   */
  static async processZoneCheckIn({
    employeeId,
    latitude,
    longitude,
    accuracy,
    ipAddress,
    userAgent,
    isMocked,
    headers,
  }: ZoneCheckInInput): Promise<AttendanceResult> {
    const now = new Date();

    // 1. Coordinate Bounds & Sanity Validation
    if (typeof latitude !== 'number' || isNaN(latitude) || latitude < -90 || latitude > 90) {
      throw { code: 'INVALID_COORDINATES', message: 'Latitude must be a valid number between -90 and 90.', status: 400 };
    }
    if (typeof longitude !== 'number' || isNaN(longitude) || longitude < -180 || longitude > 180) {
      throw { code: 'INVALID_COORDINATES', message: 'Longitude must be a valid number between -180 and 180.', status: 400 };
    }
    if (typeof accuracy !== 'number' || isNaN(accuracy) || accuracy < 0) {
      throw { code: 'INVALID_ACCURACY', message: 'GPS accuracy must be a non-negative number.', status: 400 };
    }

    // 2. Fetch Company Settings
    let settings = await prisma.companySettings.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      settings = await prisma.companySettings.create({
        data: { id: 'default' },
      });
    }

    // Verify method policy
    if (settings.checkInMethod === 'QR_SCAN') {
      throw {
        code: 'QR_SCAN_REQUIRED',
        message: 'ការិយាល័យតម្រូវឱ្យស្កេន QR Code ដើម្បីកត់ត្រាវត្តមាន។ (Office attendance policy requires scanning QR Code).',
        status: 403,
      };
    }

    // 2.1 Third-Party VPN / Proxy Detection
    const vpnCheck = detectVpnOrProxy(headers);
    if (vpnCheck.isVpn) {
      throw {
        code: 'VPN_DETECTED',
        message: vpnCheck.reason,
        status: 403,
      };
    }

    // 2.2 Fake GPS & Mock Location Detection
    const prevLocation = await prisma.employeeLocation.findFirst({
      where: { employeeId },
      orderBy: { recordedAt: 'desc' },
      select: { latitude: true, longitude: true, recordedAt: true },
    });

    const fakeGpsCheck = detectFakeGps({
      latitude,
      longitude,
      accuracy,
      isMocked,
      prevLocation,
      currentTime: now,
    });

    if (fakeGpsCheck.isFakeGps) {
      throw {
        code: fakeGpsCheck.isSpeedAnomaly ? 'GPS_ANOMALY_SPOOFING' : 'FAKE_GPS_DETECTED',
        message: fakeGpsCheck.reason,
        status: 403,
      };
    }

    // 2.3 Derive Current Time in Configured Timezone (Phnom Penh)
    const timezone = settings.timezone || 'Asia/Phnom_Penh';
    const todayDateStr = getCurrentDateInTimezone(timezone, now);
    const currentTimeStr = getCurrentTimeInTimezone(timezone, now);
    const dayOfWeek = getDayOfWeekEnum(now, timezone);

    // 3. Geofence & GPS Anti-Spoofing Validation
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
        message: `អ្នកនៅក្រៅតំបន់ការិយាល័យ (${Math.round(geo.distanceMeters)}m ពីការិយាល័យ)។ ចម្ងាយអនុញ្ញាតគឺ ${settings.allowedRadiusMeters}m។ (You are outside the company attendance perimeter (${Math.round(geo.distanceMeters)}m away). Maximum allowed distance is ${settings.allowedRadiusMeters}m).`,
        status: 400,
        details: { distance: geo.distanceMeters, allowedRadius: settings.allowedRadiusMeters },
      };
    }

    // 4. Atomic Execution inside Prisma Transaction
    const result = await prisma.$transaction<AttendanceResult>(async (tx) => {
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

      // Check for Approved Leave
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

      let schedule = employee.schedule;
      if (!schedule) {
        schedule = await tx.schedule.findFirst({
          where: { isDefault: true },
          include: { days: true },
        });
      }

      const scheduleDay = schedule?.days.find((d) => d.dayOfWeek === dayOfWeek);

      const existingAttendance = await tx.attendance.findUnique({
        where: {
          employeeId_date: {
            employeeId: employee.id,
            date: todayDateStr,
          },
        },
      });

      // Branch 1: CHECK-IN
      if (!existingAttendance) {
        let attendanceStatus: AttendanceStatus = AttendanceStatus.PRESENT;
        let lateMinutes = 0;

        if (scheduleDay && scheduleDay.isWorkingDay) {
          const startTime = settings.workStartTime || (scheduleDay && scheduleDay.startTime) || '08:00';
          const startMinutes = parseTimeToMinutes(startTime);
          const currentMinutes = parseTimeToMinutes(currentTimeStr);
          const allowedBefore = settings.checkInAllowedBeforeMinutes ?? 60;
          const earliestMinutes = Math.max(0, startMinutes - allowedBefore);

          if (currentMinutes < earliestMinutes) {
            const openH = Math.floor(earliestMinutes / 60).toString().padStart(2, '0');
            const openM = (earliestMinutes % 60).toString().padStart(2, '0');
            const openTimeStr = `${openH}:${openM}`;
            throw {
              code: 'CHECK_IN_NOT_OPEN_YET',
              message: `ការកត់ត្រាវត្តមានចូលមិនទាន់បើកនៅឡើយទេ។ បើកចាប់ពីម៉ោង ${openTimeStr} ព្រឹកតទៅ (Check-in opens at ${openTimeStr}).`,
              status: 400,
            };
          }

          lateMinutes = calculateLateMinutes(
            currentTimeStr,
            startTime,
            settings.lateGracePeriodMinutes ?? 0
          );
          if (lateMinutes > 0) {
            attendanceStatus = AttendanceStatus.LATE;
          }
        } else {
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
            status: attendanceStatus,
            lateMinutes,
            notes: '1-Click In-Zone Check-In',
            ipAddress,
            userAgent,
          },
        });

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
              method: 'ZONE_CLICK',
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
              ? `បានកត់ត្រាវត្តមានចូលធ្វើការនៅម៉ោង ${currentTimeStr} (យឺត ${lateMinutes} នាទី)។`
              : `បានកត់ត្រាវត្តមានចូលធ្វើការដោយជោគជ័យនៅម៉ោង ${currentTimeStr}! សូមបំពេញការងារប្រកបដោយភាពរីករាយ។`,
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

      // Branch 2: CHECK-OUT
      if (existingAttendance.checkInAt && existingAttendance.checkOutAt) {
        const checkOutDiffMs = now.getTime() - new Date(existingAttendance.checkOutAt).getTime();
        if (checkOutDiffMs < 60 * 1000) {
          return {
            action: 'CHECK_OUT',
            attendance: existingAttendance,
            message: `Check-out already confirmed for today at ${currentTimeStr}.`,
            details: {
              distanceFromOfficeMeters: geo.distanceMeters,
              accuracyMeters: accuracy,
              status: existingAttendance.status,
              lateMinutes: existingAttendance.lateMinutes,
              earlyLeaveMinutes: existingAttendance.earlyLeaveMinutes,
              workedMinutes: existingAttendance.workedMinutes,
            },
          };
        }
        throw {
          code: 'ALREADY_CHECKED_OUT',
          message: 'អ្នកបានកត់ត្រាវត្តមានចេញ (Check-out) រួចរាល់ហើយសម្រាប់ថ្ងៃនេះ។',
          status: 400,
        };
      }

      // Guard B: Idempotent confirmation if within 60s
      if (existingAttendance.checkInAt && !existingAttendance.checkOutAt) {
        const checkInDiffMs = now.getTime() - new Date(existingAttendance.checkInAt).getTime();
        if (checkInDiffMs < 60 * 1000) {
          return {
            action: 'CHECK_IN',
            attendance: existingAttendance,
            message: `Check-in already confirmed at ${currentTimeStr}. Have a great day!`,
            details: {
              distanceFromOfficeMeters: geo.distanceMeters,
              accuracyMeters: accuracy,
              status: existingAttendance.status,
              lateMinutes: existingAttendance.lateMinutes,
              earlyLeaveMinutes: 0,
              workedMinutes: 0,
            },
          };
        }
      }

      // Enforce Check-Out Time Rule: Cannot check out before scheduled shift end time (e.g. 17:30 / 5:30 PM)
      const endTime = settings.workEndTime || (scheduleDay && scheduleDay.endTime) || '17:30';
      const endMinutes = parseTimeToMinutes(endTime);
      const currentMinutes = parseTimeToMinutes(currentTimeStr);
      const earlyGrace = settings.earlyLeaveGraceMinutes ?? 0;
      const earliestAllowedCheckOutMinutes = Math.max(0, endMinutes - earlyGrace);

      if (scheduleDay && scheduleDay.isWorkingDay) {
        if (currentMinutes < earliestAllowedCheckOutMinutes) {
          const endH = Math.floor(endMinutes / 60);
          const endM = (endMinutes % 60).toString().padStart(2, '0');
          const endPeriod = endH >= 12 ? 'PM' : 'AM';
          const endH12 = (endH % 12 || 12).toString().padStart(2, '0');
          const formattedEndTime = `${endH12}:${endM} ${endPeriod}`;

          throw {
            code: 'CHECK_OUT_TOO_EARLY',
            message: `មិនទាន់ដល់ម៉ោងចេញពីធ្វើការនៅឡើយទេ។ ម៉ោងចេញដែលបានកំណត់គឺចាប់ពីម៉ោង ${formattedEndTime} (${endTime}) តទៅ។ (You cannot check out yet. Scheduled check-out time is ${formattedEndTime}).`,
            status: 400,
            details: {
              scheduledEndTime: endTime,
              currentTime: currentTimeStr,
              earliestAllowedCheckOutTime: `${Math.floor(earliestAllowedCheckOutMinutes / 60).toString().padStart(2, '0')}:${(earliestAllowedCheckOutMinutes % 60).toString().padStart(2, '0')}`,
            },
          };
        }
      }

      let earlyLeaveMinutes = 0;
      if (scheduleDay && scheduleDay.isWorkingDay) {
        earlyLeaveMinutes = calculateEarlyLeaveMinutes(
          currentTimeStr,
          endTime,
          settings.earlyLeaveGraceMinutes ?? 0
        );
      }

      const breakStart = (scheduleDay && scheduleDay.breakStartTime) || settings.breakStartTime || '11:30';
      const breakEnd = (scheduleDay && scheduleDay.breakEndTime) || settings.breakEndTime || '13:00';

      const workedMinutes = calculateWorkedMinutes(
        existingAttendance.checkInAt!,
        now,
        breakStart,
        breakEnd
      );

      let finalStatus = existingAttendance.status;
      if (finalStatus !== AttendanceStatus.LATE && earlyLeaveMinutes > 0) {
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
          status: finalStatus,
          earlyLeaveMinutes,
          workedMinutes,
          notes: existingAttendance.notes
            ? `${existingAttendance.notes} | 1-Click Check-Out`
            : '1-Click Check-Out',
        },
      });

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
            method: 'ZONE_CLICK',
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
        message:
          earlyLeaveMinutes > 0
            ? `បានកត់ត្រាចេញពីការងារនៅម៉ោង ${currentTimeStr} (ចេញមុនម៉ោង ${earlyLeaveMinutes} នាទី)។ រយៈពេលបំពេញការងារសរុប: ${hours}ម៉ោង ${mins}នាទី។`
            : `បានកត់ត្រាចេញពីការងារដោយជោគជ័យនៅម៉ោង ${currentTimeStr}! រយៈពេលបំពេញការងារសរុប: ${hours}ម៉ោង ${mins}នាទី។`,
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

    // Broadcast Real-Time Attendance Event to Admin and Employee Streams
    AttendanceService.broadcastAttendanceEvent({
      type: 'ATTENDANCE_RECORDED',
      action: result.action,
      attendance: result.attendance,
      details: result.details,
      recordedAt: now.toISOString(),
    });

    return result;
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
