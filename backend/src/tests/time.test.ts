import { describe, it, expect } from 'vitest';
import {
  parseTimeToMinutes,
  normalizeTimeString,
  calculateLateMinutes,
  calculateEarlyLeaveMinutes,
  calculateWorkedMinutes,
  getCurrentDateInTimezone,
} from '../utils/time.js';

describe('Time & Attendance Calculations', () => {
  it('parses HH:mm and 12h/PM formats into minutes accurately', () => {
    expect(parseTimeToMinutes('00:00')).toBe(0);
    expect(parseTimeToMinutes('08:00')).toBe(480);
    expect(parseTimeToMinutes('08:30')).toBe(510);
    expect(parseTimeToMinutes('15:00')).toBe(900);
    expect(parseTimeToMinutes('15:01')).toBe(901);
    expect(parseTimeToMinutes('3:00 PM')).toBe(900);
    expect(parseTimeToMinutes('3:01 PM')).toBe(901);
    expect(parseTimeToMinutes('3 pm')).toBe(900);
    expect(parseTimeToMinutes('3:00')).toBe(900);
    expect(parseTimeToMinutes('17:00')).toBe(1020);
  });

  it('normalizes various time formats to standard HH:mm', () => {
    expect(normalizeTimeString('3 pm')).toBe('15:00');
    expect(normalizeTimeString('3:00 PM')).toBe('15:00');
    expect(normalizeTimeString('03:00 pm')).toBe('15:00');
    expect(normalizeTimeString('15:00')).toBe('15:00');
    expect(normalizeTimeString('3:00')).toBe('15:00');
    expect(normalizeTimeString('07:30')).toBe('07:30');
    expect(normalizeTimeString('7:30 AM')).toBe('07:30');
  });

  describe('Late calculation', () => {
    const scheduledStart = '08:00';
    const graceMinutes = 10;

    it('returns 0 late minutes when checked in on time (08:00)', () => {
      expect(calculateLateMinutes('08:00', scheduledStart, graceMinutes)).toBe(0);
    });

    it('returns 0 late minutes when checked in within grace period (08:07)', () => {
      expect(calculateLateMinutes('08:07', scheduledStart, graceMinutes)).toBe(0);
    });

    it('returns exact total late minutes when checked in after grace period (08:15 => 15 mins late)', () => {
      expect(calculateLateMinutes('08:15', scheduledStart, graceMinutes)).toBe(15);
    });

    it('returns 0 late minutes when checking in early (07:45)', () => {
      expect(calculateLateMinutes('07:45', scheduledStart, graceMinutes)).toBe(0);
    });

    it('afternoon shift: check-in between 12:00 and 13:00 is NOT late against 13:00 deadline', () => {
      const afternoonDeadline = '13:00';
      expect(calculateLateMinutes('12:00', afternoonDeadline, 0)).toBe(0);
      expect(calculateLateMinutes('12:30', afternoonDeadline, 0)).toBe(0);
      expect(calculateLateMinutes('13:00', afternoonDeadline, 0)).toBe(0);
    });

    it('afternoon shift: check-in after 13:00 calculates late minutes relative to 13:00', () => {
      const afternoonDeadline = '13:00';
      expect(calculateLateMinutes('13:01', afternoonDeadline, 0)).toBe(1);
      expect(calculateLateMinutes('13:15', afternoonDeadline, 0)).toBe(15);
      expect(calculateLateMinutes('13:45', afternoonDeadline, 0)).toBe(45);
    });
  });

  describe('Early leave calculation', () => {
    const scheduledEnd = '17:00';

    it('returns 0 early minutes when checking out on time (17:00)', () => {
      expect(calculateEarlyLeaveMinutes('17:00', scheduledEnd, 0)).toBe(0);
    });

    it('returns 0 early minutes when checking out late/overtime (17:30)', () => {
      expect(calculateEarlyLeaveMinutes('17:30', scheduledEnd, 0)).toBe(0);
    });

    it('returns 30 early minutes when leaving at 16:30', () => {
      expect(calculateEarlyLeaveMinutes('16:30', scheduledEnd, 0)).toBe(30);
    });

    it('when admin edits check-out time to 3:00 PM (15:00), employee can check-out at 3:01 PM without being early', () => {
      const shiftEnd = '15:00';
      expect(calculateEarlyLeaveMinutes('15:00', shiftEnd, 0)).toBe(0);
      expect(calculateEarlyLeaveMinutes('15:01', shiftEnd, 0)).toBe(0);
      expect(calculateEarlyLeaveMinutes('15:15', shiftEnd, 0)).toBe(0);
      expect(calculateEarlyLeaveMinutes('14:59', shiftEnd, 0)).toBe(1);
    });
  });

  describe('Worked minutes calculation', () => {
    it('calculates worked minutes and deducts lunch break when shift spans across it', () => {
      const checkIn = new Date('2026-09-01T08:00:00Z');
      const checkOut = new Date('2026-09-01T17:00:00Z'); // 9 hours = 540 mins
      const breakStart = '12:00';
      const breakEnd = '13:00'; // 1 hour = 60 mins break

      const worked = calculateWorkedMinutes(checkIn, checkOut, breakStart, breakEnd);
      expect(worked).toBe(480); // 8 hours = 480 mins
    });
  });

  describe('Timezone date formatting', () => {
    it('formats date correctly in Asia/Phnom_Penh', () => {
      const testDate = new Date('2026-09-01T18:00:00Z'); // UTC 18:00 = 01:00 AM next day in UTC+7
      const dateStr = getCurrentDateInTimezone('Asia/Phnom_Penh', testDate);
      expect(dateStr).toBe('2026-09-02');
    });
  });
});
