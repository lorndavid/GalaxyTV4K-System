import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TelegramService } from '../services/telegramService';
import {
  buildLeaveOnlyReport,
  buildStudyOnlyReport,
} from '../services/telegramBotService';
import { prisma } from '../utils/prisma';

describe('Custom Shift & Admin Manual Permission Tests', () => {
  const emojiRegex =
    /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('formats Khmer permission types and 12-hour time correctly without emojis', () => {
    expect(TelegramService.getPermissionTypeKhmer('GO_HOME')).toBe('សុំចេញទៅផ្ទះ (Go Home)');
    expect(TelegramService.getPermissionTypeKhmer('PERSONAL')).toBe('ច្បាប់ផ្ទាល់ខ្លួន (Personal Leave)');
    expect(TelegramService.getPermissionTypeKhmer('SICK')).toBe('ច្បាប់ឈឺ (Sick Leave)');
    expect(TelegramService.getPermissionTypeKhmer('MISSION')).toBe('បេសកកម្មការងារ (Official Mission)');

    // Time formatting to Khmer 12-hour
    const time1 = TelegramService.formatTimeToKhmer12h('14:00');
    expect(time1).toContain('ម៉ោង');
    expect(time1).toContain('រសៀល');
    expect(emojiRegex.test(time1)).toBe(false);

    const time2 = TelegramService.formatTimeToKhmer12h('17:30');
    expect(time2).toContain('ល្ងាច');
    expect(emojiRegex.test(time2)).toBe(false);
  });

  it('broadcasts clean text Telegram notification when Admin grants manual permission', async () => {
    const broadcastSpy = vi
      .spyOn(TelegramService, 'broadcastMessage')
      .mockResolvedValue(undefined);

    await TelegramService.notifyPermissionGranted({
      employeeName: 'ហុីម វ៉ាន់',
      department: 'សេដ្ឋកិច្ច និង ហិរញ្ញវត្ថុ',
      permissionType: 'GO_HOME',
      date: '2026-09-09',
      timeRange: '14:00 - 17:30',
      reason: 'សុំចេញទៅផ្ទះមុនម៉ោង (Go Home)',
      grantedBy: 'Admin',
    });

    expect(broadcastSpy).toHaveBeenCalledTimes(1);
    const [msg, category] = broadcastSpy.mock.calls[0];

    expect(category).toBe('system');
    expect(msg).toContain('ការអនុញ្ញាតច្បាប់ / Leave Permission Granted');
    expect(msg).toContain('ហុីម វ៉ាន់');
    expect(msg).toContain('សុំចេញទៅផ្ទះ (Go Home)');
    expect(msg).toContain('2026-09-09');
    expect(msg).toContain('សុំចេញទៅផ្ទះមុនម៉ោង');
    expect(msg).toContain('Admin');

    // Strict Zero-Emoji check
    expect(emojiRegex.test(msg)).toBe(false);
  });

  it('accurately detects and formats afternoon shift learners (តឿន ស្រីនាង and ហុីម វ៉ាន់)', async () => {
    vi.spyOn(prisma.employee, 'findMany').mockResolvedValue([
      {
        id: 'emp-4',
        employeeCode: 'EMP-004',
        khmerName: 'ហុីម វ៉ាន់',
        displayName: 'HIM VAN',
        shiftType: 'AFTERNOON',
        checkInStartTime: '12:00',
        checkInDeadline: '13:00',
        workEndTime: '17:30',
        studyClassInfo: 'រៀនភាសាចិន ពេលព្រឹក (08:00 - 11:00)',
        studyDay: 'ចន្ទ-សុក្រ (ព្រឹក)',
        department: { id: 'd1', name: 'សេដ្ឋកិច្ច និង ហិរញ្ញវត្ថុ' },
      } as any,
      {
        id: 'emp-8',
        employeeCode: 'EMP-008',
        khmerName: 'តឿន ស្រីនាង',
        displayName: 'TOEUN SREINEANG',
        shiftType: 'AFTERNOON',
        checkInStartTime: '12:00',
        checkInDeadline: '13:00',
        workEndTime: '17:30',
        studyClassInfo: 'រៀនភាសាចិន ពេលព្រឹក (08:00 - 11:00)',
        studyDay: 'ចន្ទ-សុក្រ (ព្រឹក)',
        department: { id: 'd2', name: 'ព័ត៌មានអន្តរជាតិ' },
      } as any,
    ]);

    const report = await buildStudyOnlyReport();
    expect(report).toBeDefined();
    expect(report).toContain('ហុីម វ៉ាន់');
    expect(report).toContain('តឿន ស្រីនាង');
    expect(report).toContain('រៀនភាសាចិន ពេលព្រឹក (08:00 - 11:00)');
    // Zero-Emoji check
    expect(emojiRegex.test(report)).toBe(false);
  });

  it('verifies leave report formatting without emojis', async () => {
    vi.spyOn(prisma.leaveRequest, 'findMany').mockResolvedValue([
      {
        id: 'leave-1',
        employeeId: 'emp-4',
        type: 'OTHER',
        startDate: '2026-09-09',
        endDate: '2026-09-09',
        reason: 'សុំចេញទៅផ្ទះមុនម៉ោង',
        status: 'APPROVED',
        isPermission: true,
        permissionType: 'GO_HOME',
        startTime: '14:00',
        endTime: '17:30',
        employee: {
          id: 'emp-4',
          khmerName: 'ហុីម វ៉ាន់',
          displayName: 'HIM VAN',
          department: { name: 'សេដ្ឋកិច្ច និង ហិរញ្ញវត្ថុ' },
        },
      } as any,
    ]);

    const report = await buildLeaveOnlyReport();
    expect(report).toBeDefined();
    expect(report).toContain('ហុីម វ៉ាន់');
    expect(report).toContain('សុំចេញទៅផ្ទះ (Go Home)');
    expect(report).toContain('ម៉ោងអនុញ្ញាត');
    expect(emojiRegex.test(report)).toBe(false);
  });
});

