import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { DayOfWeek } from '@prisma/client';

/**
 * Gets current date string formatted as YYYY-MM-DD in the given timezone.
 */
export function getCurrentDateInTimezone(timezone: string, date: Date = new Date()): string {
  return formatInTimeZone(date, timezone, 'yyyy-MM-dd');
}

/**
 * Gets current time string formatted as HH:mm in the given timezone.
 */
export function getCurrentTimeInTimezone(timezone: string, date: Date = new Date()): string {
  return formatInTimeZone(date, timezone, 'HH:mm');
}

/**
 * Maps Javascript Date getDay() (0=Sunday, 1=Monday, ...) to Prisma DayOfWeek Enum.
 */
export function getDayOfWeekEnum(date: Date, timezone: string): DayOfWeek {
  const zonedDate = toZonedTime(date, timezone);
  const dayIndex = zonedDate.getDay(); // 0 is Sunday, 6 is Saturday

  const mapping: Record<number, DayOfWeek> = {
    0: DayOfWeek.SUNDAY,
    1: DayOfWeek.MONDAY,
    2: DayOfWeek.TUESDAY,
    3: DayOfWeek.WEDNESDAY,
    4: DayOfWeek.THURSDAY,
    5: DayOfWeek.FRIDAY,
    6: DayOfWeek.SATURDAY,
  };

  return mapping[dayIndex];
}

/**
 * Parses "HH:mm" time string into total minutes since midnight.
 */
export function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Calculates late minutes given actual check-in time, scheduled start time, and grace period.
 * Returns 0 if check-in was on time or within grace.
 */
export function calculateLateMinutes(
  checkInTimeStr: string,
  scheduledStartTimeStr: string,
  gracePeriodMinutes = 0
): number {
  const checkInMinutes = parseTimeToMinutes(checkInTimeStr);
  const scheduledMinutes = parseTimeToMinutes(scheduledStartTimeStr);

  const diff = checkInMinutes - scheduledMinutes;
  if (diff > gracePeriodMinutes) {
    return diff; // Total minutes late
  }
  return 0;
}

/**
 * Calculates early leave minutes given actual check-out time and scheduled end time.
 * Returns 0 if check-out was at or after scheduled end time.
 */
export function calculateEarlyLeaveMinutes(
  checkOutTimeStr: string,
  scheduledEndTimeStr: string,
  graceMinutes = 0
): number {
  const checkOutMinutes = parseTimeToMinutes(checkOutTimeStr);
  const scheduledEndMinutes = parseTimeToMinutes(scheduledEndTimeStr);

  const diff = scheduledEndMinutes - checkOutMinutes;
  if (diff > graceMinutes) {
    return diff;
  }
  return 0;
}

/**
 * Calculates total worked minutes between check-in and check-out, optionally deducting lunch break.
 */
export function calculateWorkedMinutes(
  checkInAt: Date,
  checkOutAt: Date,
  breakStartTimeStr?: string | null,
  breakEndTimeStr?: string | null
): number {
  const diffMs = checkOutAt.getTime() - checkInAt.getTime();
  let totalMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));

  // If break times are defined and check-in/out spans across break
  if (breakStartTimeStr && breakEndTimeStr) {
    const breakDurationMinutes =
      parseTimeToMinutes(breakEndTimeStr) - parseTimeToMinutes(breakStartTimeStr);
    if (breakDurationMinutes > 0 && totalMinutes > breakDurationMinutes + 120) {
      totalMinutes -= breakDurationMinutes;
    }
  }

  return Math.max(0, totalMinutes);
}
