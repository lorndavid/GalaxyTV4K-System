import { describe, it, expect } from 'vitest';
import { TelegramService } from '../services/telegramService.js';
import {
  getPersistentReplyKeyboard,
  getMainInlineMenu,
  getStudyNavMarkup,
  getWorkNavMarkup,
  getLocationNavMarkup,
  buildMainMenuText,
} from '../services/telegramBotService.js';
import { OFFICIAL_EMPLOYEES } from '../services/seedEmployeesService.js';
import { calculateHaversineDistance } from '../utils/geo.js';
import { encryptText, decryptText, maskToken } from '../utils/encryption.js';

describe('Comprehensive End-to-End (E2E) System Verification', () => {
  it('E2E-1: Confirms official roster contains all 20 employees with valid data', () => {
    expect(OFFICIAL_EMPLOYEES.length).toBe(20);

    OFFICIAL_EMPLOYEES.forEach((emp, index) => {
      expect(emp.code).toBe(`EMP-${String(index + 1).padStart(3, '0')}`);
      expect(emp.khmerName).toBeTruthy();
      expect(emp.departmentName).toBeTruthy();
      expect(emp.position).toBeTruthy();
      expect(emp.skill).toBeTruthy();
      expect(emp.studyDay).toBeTruthy();
    });
  });

  it('E2E-2: Validates QR geofencing and distance calculations with high precision', () => {
    // Office coordinates (e.g. Phnom Penh headquarters)
    const officeLat = 11.5564;
    const officeLng = 104.9282;

    // Point exactly at office
    const d0 = calculateHaversineDistance(officeLat, officeLng, officeLat, officeLng);
    expect(d0).toBe(0);

    // Point ~44 meters away
    const dNearby = calculateHaversineDistance(officeLat, officeLng, 11.5568, 104.9282);
    expect(dNearby).toBeGreaterThan(30);
    expect(dNearby).toBeLessThan(70);

    // Point outside geofence (5km away)
    const dFar = calculateHaversineDistance(officeLat, officeLng, 11.6000, 104.9282);
    expect(dFar).toBeGreaterThan(4000);
  });

  it('E2E-3: Confirms Telegram 7:00 AM summary strictly uses វេនរៀន or បំពេញការងារ and removes English names & IDs', async () => {
    const summary = await TelegramService.buildDailyMorningSummaryKhmer(OFFICIAL_EMPLOYEES);

    expect(summary.totalEmployees).toBe(20);
    expect(summary.workingCount + summary.studentCount).toBe(20);
    expect(summary.messages.length).toBeGreaterThanOrEqual(1);

    summary.messages.forEach((msg) => {
      // Header check
      expect(msg).toContain('កាលវិភាគការងារ និងការសិក្សារបស់បុគ្គលិកប្រចាំថ្ងៃ');
      expect(msg).toContain('Galaxy TV 4K');
      expect(msg).toContain('ម៉ោងចេញផ្សាយ:');
      expect(msg).toContain('០៧:០០ ព្រឹក');

      // Status check
      expect(msg).toMatch(/ស្ថានភាពថ្ងៃនេះ: <b>(វេនរៀន|បំពេញការងារ)<\/b>/);

      // Verify NO English Latin names and NO employee codes
      expect(msg).not.toContain('HUOY BUNTHOEUN');
      expect(msg).not.toContain('EMP-001');
      expect(msg).not.toContain('EMP-');

      // Verify numbered list format
      expect(msg).toMatch(/\d+\.\s+<b>/);
    });
  });

  it('E2E-4: Confirms persistent bottom reply keyboard matches exact layout', () => {
    const replyKb = getPersistentReplyKeyboard();

    expect(replyKb.resize_keyboard).toBe(true);
    expect(replyKb.is_persistent).toBe(true);
    expect(replyKb.keyboard.length).toBe(4);

    // Row 1: Summary + All 20 Staff
    expect(replyKb.keyboard[0][0].text).toBe('📊 របាយការណ៍សង្ខេប');
    expect(replyKb.keyboard[0][1].text).toBe('👥 បញ្ជីបុគ្គលិក ២០ នាក់');

    // Row 2: Study + Work
    expect(replyKb.keyboard[1][0].text).toBe('🎓 បុគ្គលិកវេនរៀន');
    expect(replyKb.keyboard[1][1].text).toBe('💼 បុគ្គលិកបំពេញការងារ');

    // Row 3: Location + Leave
    expect(replyKb.keyboard[2][0].text).toBe('🏢 វត្តមានក្នុង/ក្រៅការិយាល័យ');
    expect(replyKb.keyboard[2][1].text).toBe('📝 បុគ្គលិកសុំច្បាប់');

    // Row 4: Refresh
    expect(replyKb.keyboard[3][0].text).toBe('🔄 ធ្វើបច្ចុប្បន្នភាពទិន្នន័យ');
  });

  it('E2E-5: Confirms interactive inline menus and sub-navigation keyboards', () => {
    const inlineMenu = getMainInlineMenu();
    const studyNav = getStudyNavMarkup();
    const workNav = getWorkNavMarkup();
    const locNav = getLocationNavMarkup();
    const welcomeText = buildMainMenuText();

    expect(welcomeText).toContain('Galaxy TV 4K');
    expect(welcomeText).toContain('ផ្ទាំងបញ្ជាខាងក្រោម');

    // Check inline menu callbacks
    expect(inlineMenu.inline_keyboard[0][0].callback_data).toBe('menu_summary');
    expect(inlineMenu.inline_keyboard[1][0].callback_data).toBe('menu_study');
    expect(inlineMenu.inline_keyboard[1][1].callback_data).toBe('menu_work');
    expect(inlineMenu.inline_keyboard[2][0].callback_data).toBe('menu_location');
    expect(inlineMenu.inline_keyboard[2][1].callback_data).toBe('menu_leave');
    expect(inlineMenu.inline_keyboard[3][0].callback_data).toBe('menu_all_staff');

    // Check sub-navigation keyboards have back to menu button
    expect(studyNav.inline_keyboard[1][0].callback_data).toBe('menu_main');
    expect(workNav.inline_keyboard[1][0].callback_data).toBe('menu_main');
    expect(locNav.inline_keyboard[1][0].callback_data).toBe('menu_main');
  });

  it('E2E-6: Confirms cryptographic token security for Telegram Bot tokens', () => {
    const token = '8172635449:AAFn_testToken1234567890abcdefg';
    const encrypted = encryptText(token);
    const decrypted = decryptText(encrypted);
    const masked = maskToken(token);

    expect(encrypted).not.toBe(token);
    expect(decrypted).toBe(token);
    expect(masked).toBe('••••••••••••defg');
    expect(masked).not.toContain('8172635449');
  });
});
