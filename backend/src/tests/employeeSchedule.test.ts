import { describe, it, expect, vi } from 'vitest';
import { TelegramService } from '../services/telegramService.js';

describe('Employee Work & Study Schedule Management', () => {
  describe('TelegramService.getWorkDaysFromStudyDay', () => {
    it('correctly calculates work days for Friday-Saturday-Sunday study schedule', () => {
      const workDays = TelegramService.getWorkDaysFromStudyDay('សុក្រ-សៅរ៍-អាទិត្យ');
      expect(workDays).toContain('ចន្ទ');
      expect(workDays).toContain('អង្គារ');
      expect(workDays).toContain('ពុធ');
      expect(workDays).toContain('ព្រហ');
      expect(workDays).not.toContain('សុក្រ');
      expect(workDays).not.toContain('សៅរ៍');
      expect(workDays).not.toContain('អាទិត្យ');
    });

    it('correctly calculates work days for Thursday-Friday study schedule', () => {
      const workDays = TelegramService.getWorkDaysFromStudyDay('ព្រហ-សុក្រ');
      expect(workDays).toContain('ចន្ទ');
      expect(workDays).toContain('អង្គារ');
      expect(workDays).toContain('ពុធ');
      expect(workDays).toContain('សៅរ៍');
      expect(workDays).not.toContain('ព្រហ');
      expect(workDays).not.toContain('សុក្រ');
    });

    it('correctly calculates work days for Monday-Tuesday study schedule', () => {
      const workDays = TelegramService.getWorkDaysFromStudyDay('ចន្ទ-អង្គារ');
      expect(workDays).toContain('ពុធ');
      expect(workDays).toContain('ព្រហ');
      expect(workDays).toContain('សុក្រ');
      expect(workDays).toContain('សៅរ៍');
      expect(workDays).not.toContain('ចន្ទ');
      expect(workDays).not.toContain('អង្គារ');
    });

    it('handles full-time employees without study days', () => {
      expect(TelegramService.getWorkDaysFromStudyDay('គ្មាន')).toBe('ចន្ទ - សៅរ៍ (ពេញម៉ោង)');
      expect(TelegramService.getWorkDaysFromStudyDay(null)).toBe('ចន្ទ - សៅរ៍ (ពេញម៉ោង)');
      expect(TelegramService.getWorkDaysFromStudyDay('')).toBe('ចន្ទ - សៅរ៍ (ពេញម៉ោង)');
    });
  });

  describe('TelegramService.checkIsStudyDay matching', () => {
    it('accurately identifies student status by day of week index', () => {
      const studySchedule = 'សុក្រ-សៅរ៍-អាទិត្យ';
      // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat
      expect(TelegramService.checkIsStudyDay(studySchedule, 5)).toBe(true);  // Fri
      expect(TelegramService.checkIsStudyDay(studySchedule, 6)).toBe(true);  // Sat
      expect(TelegramService.checkIsStudyDay(studySchedule, 0)).toBe(true);  // Sun
      expect(TelegramService.checkIsStudyDay(studySchedule, 1)).toBe(false); // Mon
      expect(TelegramService.checkIsStudyDay(studySchedule, 2)).toBe(false); // Tue
      expect(TelegramService.checkIsStudyDay(studySchedule, 3)).toBe(false); // Wed
      expect(TelegramService.checkIsStudyDay(studySchedule, 4)).toBe(false); // Thu
    });
  });

  describe('Telegram Notification Dispatch for Employee Updates', () => {
    it('formats and broadcasts employee schedule updates cleanly', async () => {
      const broadcastSpy = vi.spyOn(TelegramService, 'broadcastMessage').mockResolvedValue(undefined);

      await TelegramService.notifyEmployeeUpdated({
        employeeName: 'ហួយ ប៊ុនធឿន',
        employeeCode: 'EMP-001',
        department: 'IT & Software',
        position: 'Senior Developer',
        status: 'ACTIVE',
        studyDay: 'ព្រហ-សុក្រ',
        changedFields: ['ថ្ងៃរៀន (Study Day)', 'តួនាទី (Position)'],
        updatedBy: 'admin@galaxytv4k.com',
      });

      expect(broadcastSpy).toHaveBeenCalledTimes(1);
      const [msg, category] = broadcastSpy.mock.calls[0];
      expect(category).toBe('system');
      expect(msg).toContain('ហួយ ប៊ុនធឿន');
      expect(msg).toContain('EMP-001');
      expect(msg).toContain('ព្រហ-សុក្រ');
      expect(msg).toContain('ACTIVE');
      expect(msg).toContain('IT & Software');

      broadcastSpy.mockRestore();
    });
  });
});
