import { prisma } from '../utils/prisma.js';
import { DayOfWeek, ActorType } from '@prisma/client';
import { createAuditLog } from '../utils/audit.js';
import { calculateLateMinutes, calculateEarlyLeaveMinutes, calculateWorkedMinutes } from '../utils/time.js';

export class ScheduleService {
  static async getAllSchedules() {
    return prisma.schedule.findMany({
      include: {
        days: {
          orderBy: { dayOfWeek: 'asc' },
        },
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  static async getScheduleById(id: string) {
    return prisma.schedule.findUnique({
      where: { id },
      include: {
        days: {
          orderBy: { dayOfWeek: 'asc' },
        },
        employees: {
          select: {
            id: true,
            employeeCode: true,
            displayName: true,
            position: true,
          },
        },
      },
    });
  }

  static async createSchedule(data: {
    name: string;
    description?: string;
    timezone?: string;
    isDefault?: boolean;
    days: Array<{
      dayOfWeek: DayOfWeek;
      isWorkingDay: boolean;
      startTime: string;
      endTime: string;
      breakStartTime?: string | null;
      breakEndTime?: string | null;
    }>;
    adminUserId: string;
  }) {
    return prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.schedule.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }

      const schedule = await tx.schedule.create({
        data: {
          name: data.name,
          description: data.description,
          timezone: data.timezone || 'Asia/Phnom_Penh',
          isDefault: data.isDefault || false,
          days: {
            create: data.days.map((d) => ({
              dayOfWeek: d.dayOfWeek,
              isWorkingDay: d.isWorkingDay,
              startTime: d.startTime,
              endTime: d.endTime,
              breakStartTime: d.breakStartTime || null,
              breakEndTime: d.breakEndTime || null,
            })),
          },
        },
        include: { days: true },
      });

      await createAuditLog(
        {
          actorId: data.adminUserId,
          actorType: ActorType.ADMIN,
          action: 'SCHEDULE_CREATED',
          entityType: 'Schedule',
          entityId: schedule.id,
          metadata: { name: schedule.name },
        },
        tx
      );

      return schedule;
    });
  }

  static async updateSchedule(
    id: string,
    data: {
      name?: string;
      description?: string;
      timezone?: string;
      isDefault?: boolean;
      days?: Array<{
        dayOfWeek: DayOfWeek;
        isWorkingDay: boolean;
        startTime: string;
        endTime: string;
        breakStartTime?: string | null;
        breakEndTime?: string | null;
      }>;
      adminUserId: string;
    }
  ) {
    return prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.schedule.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }

      // Update basic fields
      const updatedSchedule = await tx.schedule.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          timezone: data.timezone,
          isDefault: data.isDefault,
        },
      });

      // Update days if provided
      if (data.days && data.days.length > 0) {
        for (const day of data.days) {
          await tx.scheduleDay.upsert({
            where: {
              scheduleId_dayOfWeek: {
                scheduleId: id,
                dayOfWeek: day.dayOfWeek,
              },
            },
            update: {
              isWorkingDay: day.isWorkingDay,
              startTime: day.startTime,
              endTime: day.endTime,
              breakStartTime: day.breakStartTime || null,
              breakEndTime: day.breakEndTime || null,
            },
            create: {
              scheduleId: id,
              dayOfWeek: day.dayOfWeek,
              isWorkingDay: day.isWorkingDay,
              startTime: day.startTime,
              endTime: day.endTime,
              breakStartTime: day.breakStartTime || null,
              breakEndTime: day.breakEndTime || null,
            },
          });
        }
      }

      await createAuditLog(
        {
          actorId: data.adminUserId,
          actorType: ActorType.ADMIN,
          action: 'SCHEDULE_UPDATED',
          entityType: 'Schedule',
          entityId: id,
          metadata: { name: updatedSchedule.name },
        },
        tx
      );

      return tx.schedule.findUnique({
        where: { id },
        include: { days: true },
      });
    });
  }

  static async recalculateAttendance({
    scheduleId,
    startDate,
    endDate,
    adminUserId,
  }: {
    scheduleId: string;
    startDate: string;
    endDate: string;
    adminUserId: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const schedule = await tx.schedule.findUnique({
        where: { id: scheduleId },
        include: { days: true },
      });

      if (!schedule) {
        throw { code: 'SCHEDULE_NOT_FOUND', message: 'Schedule not found', status: 404 };
      }

      const settings = await tx.companySettings.findUnique({ where: { id: 'default' } });
      const gracePeriod = settings?.lateGracePeriodMinutes || 10;
      const earlyGrace = settings?.earlyLeaveGraceMinutes || 0;

      // Find attendances within date range using this schedule
      const attendances = await tx.attendance.findMany({
        where: {
          scheduleId,
          date: { gte: startDate, lte: endDate },
        },
      });

      let updatedCount = 0;

      for (const att of attendances) {
        if (!att.checkInAt) continue;

        // Parse day of week from record
        const attDate = new Date(att.checkInAt);
        const dayOfWeek = Object.values(DayOfWeek)[attDate.getUTCDay() === 0 ? 6 : attDate.getUTCDay() - 1]; // or using zoned helper
        const scheduleDay = schedule.days.find((d) => d.dayOfWeek === dayOfWeek);

        if (scheduleDay && scheduleDay.isWorkingDay) {
          const checkInTimeStr = attDate.toISOString().substring(11, 16);
          const lateMins = calculateLateMinutes(checkInTimeStr, scheduleDay.startTime, gracePeriod);

          let earlyLeaveMins = 0;
          let workedMins = 0;

          if (att.checkOutAt) {
            const checkOutDate = new Date(att.checkOutAt);
            const checkOutTimeStr = checkOutDate.toISOString().substring(11, 16);
            earlyLeaveMins = calculateEarlyLeaveMinutes(checkOutTimeStr, scheduleDay.endTime, earlyGrace);
            workedMins = calculateWorkedMinutes(
              att.checkInAt,
              att.checkOutAt,
              scheduleDay.breakStartTime,
              scheduleDay.breakEndTime
            );
          }

          await tx.attendance.update({
            where: { id: att.id },
            data: {
              lateMinutes: lateMins,
              earlyLeaveMinutes: earlyLeaveMins,
              workedMinutes: workedMins || att.workedMinutes,
            },
          });
          updatedCount++;
        }
      }

      await createAuditLog(
        {
          actorId: adminUserId,
          actorType: ActorType.ADMIN,
          action: 'ATTENDANCE_RECALCULATED',
          entityType: 'Schedule',
          entityId: scheduleId,
          metadata: { startDate, endDate, updatedCount },
        },
        tx
      );

      return { updatedCount };
    });
  }
}
