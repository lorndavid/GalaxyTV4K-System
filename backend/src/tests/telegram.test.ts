import { describe, it, expect } from 'vitest';
import { TelegramService } from '../services/telegramService';
import { encryptText, decryptText, maskToken } from '../utils/encryption';

describe('TelegramService & Security Tests', () => {
  it('encrypts, decrypts, and masks bot tokens correctly', () => {
    const rawToken = '1234567890:ABCdefGHIjklMNOpqrsTUVwxyz12345';
    const encrypted = encryptText(rawToken);
    expect(encrypted).not.toBe(rawToken);
    expect(encrypted.split(':').length).toBe(3);

    const decrypted = decryptText(encrypted);
    expect(decrypted).toBe(rawToken);

    const masked = maskToken(rawToken);
    expect(masked).toBe('••••••••••••2345');
    expect(masked).not.toContain('ABCdef');
  });

  it('handles invalid token test connection safely without crashing', async () => {
    const testResult = await TelegramService.testConnection('invalid_token_12345');
    expect(testResult.success).toBe(false);
    expect(testResult.message).toBeDefined();
  });

  it('accurately detects study days across week schedules', () => {
    // 0: Sunday, 1: Monday, 2: Tuesday, 3: Wednesday, 4: Thursday, 5: Friday, 6: Saturday
    expect(TelegramService.checkIsStudyDay('សុក្រ-សៅរ៍-អាទិត្យ', 5)).toBe(true); // Friday
    expect(TelegramService.checkIsStudyDay('សុក្រ-សៅរ៍-អាទិត្យ', 6)).toBe(true); // Saturday
    expect(TelegramService.checkIsStudyDay('សុក្រ-សៅរ៍-អាទិត្យ', 0)).toBe(true); // Sunday
    expect(TelegramService.checkIsStudyDay('សុក្រ-សៅរ៍-អាទិត្យ', 1)).toBe(false); // Monday

    expect(TelegramService.checkIsStudyDay('ព្រហ-សុក្រ', 4)).toBe(true); // Thursday
    expect(TelegramService.checkIsStudyDay('ព្រហ-សុក្រ', 5)).toBe(true); // Friday
    expect(TelegramService.checkIsStudyDay('ព្រហ-សុក្រ', 1)).toBe(false); // Monday

    expect(TelegramService.checkIsStudyDay('ចន្ទ-អង្គារ', 1)).toBe(true); // Monday
    expect(TelegramService.checkIsStudyDay('ចន្ទ-អង្គារ', 2)).toBe(true); // Tuesday
    expect(TelegramService.checkIsStudyDay('ចន្ទ-អង្គារ', 3)).toBe(false); // Wednesday
  });

  it('converts Arabic digits to Khmer digits correctly', () => {
    expect(TelegramService.toKhmerDigits(20)).toBe('២០');
    expect(TelegramService.toKhmerDigits('EMP-001')).toBe('EMP-០០១');
    expect(TelegramService.toKhmerDigits(2026)).toBe('២០២៦');
  });

  it('builds a clean Khmer morning summary with numbered list and zero emojis', async () => {
    const mockEmployees = [
      {
        id: 'emp-1',
        employeeCode: 'EMP-001',
        khmerName: 'ហួយ ប៊ុនធឿន',
        latinName: 'HUOY BUNTHOEUN',
        skill: 'ទីផ្សារឌីជីថល',
        studyDay: 'សុក្រ-សៅរ៍-អាទិត្យ',
        position: 'ព័ត៌មានទូទៅ',
        department: { name: 'ព័ត៌មានសង្គម' },
      },
      {
        id: 'emp-2',
        employeeCode: 'EMP-002',
        khmerName: 'សរ សីឡា',
        latinName: 'SOR SEILA',
        skill: 'ទីផ្សារឌីជីថល',
        studyDay: 'សុក្រ-សៅរ៍-អាទិត្យ',
        position: 'ព័ត៌មានទូទៅ',
        department: { name: 'ព័ត៌មានសង្គម' },
      },
    ];

    const summary = await TelegramService.buildDailyMorningSummaryKhmer(mockEmployees);
    expect(summary.totalEmployees).toBe(2);
    expect(summary.messages.length).toBeGreaterThanOrEqual(1);

    // Emoji regex to strictly ensure NO emojis are present
    const emojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

    summary.messages.forEach((msg) => {
      expect(emojiRegex.test(msg)).toBe(false);
      expect(msg).toContain('កាលវិភាគការងារ និងការសិក្សារបស់បុគ្គលិកប្រចាំថ្ងៃ');
      expect(msg).toContain('Galaxy TV 4K');
      expect(msg).toContain('1.');
      expect(msg).toContain('ហួយ ប៊ុនធឿន');
    });
  });
});
