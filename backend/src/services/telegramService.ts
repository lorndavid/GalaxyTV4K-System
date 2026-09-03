import { PrismaClient } from '@prisma/client';
import { decryptText, maskToken } from '../utils/encryption';
import https from 'https';

const prisma = new PrismaClient();

interface TelegramSendResponse {
  ok: boolean;
  description?: string;
  result?: any;
}

export class TelegramService {
  /**
   * Helper to make HTTPS requests to the Telegram Bot API
   */
  private static async requestTelegram(
    botToken: string,
    endpoint: string,
    payload?: any
  ): Promise<TelegramSendResponse> {
    return new Promise((resolve) => {
      const url = `https://api.telegram.org/bot${botToken}/${endpoint}`;
      const dataString = payload ? JSON.stringify(payload) : '';

      const req = https.request(
        url,
        {
          method: payload ? 'POST' : 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(dataString),
          },
          timeout: 8000,
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            try {
              const json = JSON.parse(body);
              resolve(json);
            } catch {
              resolve({ ok: false, description: 'Invalid JSON from Telegram API' });
            }
          });
        }
      );

      req.on('error', (err) => {
        resolve({ ok: false, description: err.message });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, description: 'Request timeout to Telegram' });
      });

      if (dataString) {
        req.write(dataString);
      }
      req.end();
    });
  }

  /**
   * Test Bot Token and optional Chat ID
   */
  public static async testConnection(
    botToken: string,
    testChatId?: string
  ): Promise<{ success: boolean; botUsername?: string; message: string }> {
    try {
      const getMeRes = await this.requestTelegram(botToken, 'getMe');
      if (!getMeRes.ok) {
        return {
          success: false,
          message: getMeRes.description || 'Invalid Telegram Bot Token.',
        };
      }

      const botUsername = getMeRes.result?.username || 'AttendanceBot';

      if (testChatId) {
        const testMsg = `🔔 <b>Attendance System Test</b>\n\nTelegram notification channel is connected successfully.\n<b>Time:</b> ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' })}`;
        const sendRes = await this.requestTelegram(botToken, 'sendMessage', {
          chat_id: testChatId,
          text: testMsg,
          parse_mode: 'HTML',
        });

        if (!sendRes.ok) {
          return {
            success: false,
            botUsername,
            message: `Bot authenticated as @${botUsername}, but failed to send to Chat ID ${testChatId}: ${sendRes.description}`,
          };
        }
      }

      return {
        success: true,
        botUsername,
        message: `Successfully connected to Telegram Bot @${botUsername}.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Failed to connect to Telegram.',
      };
    }
  }

  /**
   * Broadcast a notification to all active Telegram Chats
   */
  public static async broadcastMessage(
    htmlMessage: string,
    category: 'attendance' | 'location' | 'daily' | 'system' = 'attendance'
  ): Promise<void> {
    try {
      const config = await prisma.telegramConfig.findUnique({
        where: { id: 'default' },
      });

      if (!config || !config.enabled || !config.botTokenEncrypted) {
        return;
      }

      // Check category toggles
      if (category === 'attendance' && !config.attendanceNotificationsEnabled) return;
      if (category === 'location' && !config.locationNotificationsEnabled) return;
      if (category === 'daily' && !config.dailySummaryEnabled) return;
      if (category === 'system' && !config.systemAlertsEnabled) return;

      const botToken = decryptText(config.botTokenEncrypted);
      if (!botToken) return;

      const activeChats = await prisma.telegramChat.findMany({
        where: { enabled: true },
      });

      if (activeChats.length === 0) return;

      // Send to each chat in parallel without blocking
      await Promise.allSettled(
        activeChats.map((chat) =>
          this.requestTelegram(botToken, 'sendMessage', {
            chat_id: chat.chatId,
            text: htmlMessage,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
          })
        )
      );
    } catch (err) {
      // Telegram failure must never crash or bubble up to database transactions
      console.error('[TelegramService] Notification error:', err);
    }
  }

  /**
   * Check-In Notification
   */
  public static async notifyCheckIn(data: {
    employeeName: string;
    employeeCode: string;
    time: string;
    isLate: boolean;
    lateMinutes?: number;
    isInsideOffice: boolean;
    distanceMeters: number;
    accuracyMeters: number;
  }): Promise<void> {
    const statusText = data.isLate
      ? `⚠️ <b>Late</b> (+${data.lateMinutes || 0} mins)`
      : `✅ <b>Present (On Time)</b>`;

    const locText = data.isInsideOffice
      ? `🟢 Inside Office (${Math.round(data.distanceMeters)}m)`
      : `🔴 Outside Office (${Math.round(data.distanceMeters)}m)`;

    const msg = [
      `📍 <b>Attendance Check-In</b>`,
      `━━━━━━━━━━━━━━━━━━`,
      `👤 <b>Employee:</b> ${data.employeeName} (<code>${data.employeeCode}</code>)`,
      `⏰ <b>Time:</b> ${data.time}`,
      `📊 <b>Status:</b> ${statusText}`,
      `🏢 <b>Location:</b> ${locText}`,
      `🎯 <b>GPS Accuracy:</b> ±${Math.round(data.accuracyMeters)}m`,
    ].join('\n');

    await this.broadcastMessage(msg, 'attendance');
  }

  /**
   * Check-Out Notification
   */
  public static async notifyCheckOut(data: {
    employeeName: string;
    employeeCode: string;
    time: string;
    workedDuration: string;
    isInsideOffice: boolean;
    distanceMeters: number;
  }): Promise<void> {
    const locText = data.isInsideOffice
      ? `🟢 Inside Office (${Math.round(data.distanceMeters)}m)`
      : `🔴 Outside Office (${Math.round(data.distanceMeters)}m)`;

    const msg = [
      `🏁 <b>Attendance Check-Out</b>`,
      `━━━━━━━━━━━━━━━━━━`,
      `👤 <b>Employee:</b> ${data.employeeName} (<code>${data.employeeCode}</code>)`,
      `⏰ <b>Time:</b> ${data.time}`,
      `⏳ <b>Worked Time:</b> ${data.workedDuration}`,
      `🏢 <b>Location:</b> ${locText}`,
    ].join('\n');

    await this.broadcastMessage(msg, 'attendance');
  }

  /**
   * Location Event Notification (Office Entry / Exit with Hysteresis)
   */
  public static async notifyLocationEvent(data: {
    employeeName: string;
    employeeCode: string;
    eventType: 'ENTERED_OFFICE' | 'LEFT_OFFICE' | string;
    distanceMeters: number;
    time: string;
  }): Promise<void> {
    const title =
      data.eventType === 'ENTERED_OFFICE'
        ? `🟢 <b>Employee Entered Office</b>`
        : `🔴 <b>Employee Left Office Area</b>`;

    const msg = [
      title,
      `━━━━━━━━━━━━━━━━━━`,
      `👤 <b>Employee:</b> ${data.employeeName} (<code>${data.employeeCode}</code>)`,
      `📏 <b>Distance:</b> ${Math.round(data.distanceMeters)}m from office`,
      `⏰ <b>Time:</b> ${data.time}`,
    ].join('\n');

    await this.broadcastMessage(msg, 'location');
  }

  /**
   * Helper: Convert Arabic digits to Khmer digits
   */
  public static toKhmerDigits(num: number | string): string {
    const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
    return String(num).replace(/[0-9]/g, (w) => khmerDigits[parseInt(w, 10)] || w);
  }

  /**
   * Helper: Check if today is an employee's study day
   */
  public static checkIsStudyDay(studyDay: string | null | undefined, dayIndex: number): boolean {
    if (!studyDay) return false;
    const s = studyDay.trim();
    // 0: Sunday (អាទិត្យ)
    if (dayIndex === 0 && s.includes('អាទិត្យ')) return true;
    // 1: Monday (ចន្ទ)
    if (dayIndex === 1 && s.includes('ចន្ទ')) return true;
    // 2: Tuesday (អង្គារ)
    if (dayIndex === 2 && s.includes('អង្គារ')) return true;
    // 3: Wednesday (ពុធ)
    if (dayIndex === 3 && s.includes('ពុធ')) return true;
    // 4: Thursday (ព្រហស្បតិ៍ or ព្រហ)
    if (dayIndex === 4 && (s.includes('ព្រហ') || s.includes('ព្រហស្បតិ៍'))) return true;
    // 5: Friday (សុក្រ)
    if (dayIndex === 5 && s.includes('សុក្រ')) return true;
    // 6: Saturday (សៅរ៍)
    if (dayIndex === 6 && s.includes('សៅរ៍')) return true;
    return false;
  }

  /**
   * Build Clean Khmer Daily Morning Summary for All 20 Employees (Zero Emojis, Numbered List)
   */
  public static async buildDailyMorningSummaryKhmer(overrideEmployees?: any[]): Promise<{
    dateStr: string;
    totalEmployees: number;
    workingCount: number;
    studentCount: number;
    onLeaveCount: number;
    messages: string[];
    rawText: string;
  }> {
    const KHMER_DAYS = ['អាទិត្យ', 'ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];
    const KHMER_MONTHS = [
      'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
      'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
    ];

    const now = new Date();
    // Use Cambodia Timezone (Asia/Phnom_Penh)
    const cambodiaDate = new Date(cambodiaTimeStr(now));
    const dayIndex = cambodiaDate.getDay();
    const dayNum = cambodiaDate.getDate();
    const monthNum = cambodiaDate.getMonth();
    const yearNum = cambodiaDate.getFullYear();

    const khmerDayName = KHMER_DAYS[dayIndex];
    const khmerMonthName = KHMER_MONTHS[monthNum];
    const khmerDateFormatted = `ថ្ងៃ${khmerDayName} ទី${this.toKhmerDigits(dayNum)} ខែ${khmerMonthName} ឆ្នាំ${this.toKhmerDigits(yearNum)}`;

    // Query all active employees or use override
    let employees = overrideEmployees;
    let leaveEmployeeSet = new Set<string>();

    if (!employees) {
      employees = await prisma.employee.findMany({
        where: { status: 'ACTIVE' },
        include: { department: true },
        orderBy: { employeeCode: 'asc' },
      });

      // Query any active approved leave for today in Cambodia time
      const todayIso = cambodiaDate.toISOString().split('T')[0];
      const activeLeaves = await prisma.leaveRequest.findMany({
        where: {
          status: 'APPROVED',
          startDate: { lte: todayIso },
          endDate: { gte: todayIso },
        },
      });
      leaveEmployeeSet = new Set(activeLeaves.map((l) => l.employeeId));
    }

    let workingCount = 0;
    let studentCount = 0;
    let onLeaveCount = 0;

    const employeeLines: string[] = [];

    employees.forEach((emp, index) => {
      const isStudying = this.checkIsStudyDay(emp.studyDay, dayIndex);
      const isOnLeave = leaveEmployeeSet.has(emp.id);

      let statusKhmer = 'បំពេញការងារ';
      if (isOnLeave) {
        statusKhmer = 'ច្បាប់ឈប់សម្រាក';
        onLeaveCount++;
      } else if (isStudying) {
        // As requested: If employee has study today -> strictly "វេនរៀន" (no "បំពេញការងារ")
        statusKhmer = 'វេនរៀន';
        studentCount++;
      } else {
        // If employee does not have study today -> strictly "បំពេញការងារ"
        statusKhmer = 'បំពេញការងារ';
        workingCount++;
      }

      const numKh = index + 1;
      const khmerName = emp.khmerName || emp.displayName;
      const deptName = emp.department?.name || 'ទូទៅ';
      const position = emp.position || 'បុគ្គលិក';
      const skill = emp.skill || 'ទូទៅ';
      const studyDay = emp.studyDay || 'គ្មាន';

      // As requested: Only Khmer name, NO English name and NO employee ID/code
      employeeLines.push(
        `${numKh}. <b>${khmerName}</b>\n` +
        `   ផ្នែកការងារ: ${deptName}\n` +
        `   តួនាទី: ${position}\n` +
        `   ជំនាញ: ${skill}\n` +
        `   ថ្ងៃរៀន: ${studyDay}\n` +
        `   ស្ថានភាពថ្ងៃនេះ: <b>${statusKhmer}</b>`
      );
    });

    const header = [
      `<b>កាលវិភាគការងារ និងការសិក្សារបស់បុគ្គលិកប្រចាំថ្ងៃ</b>`,
      `<b>ស្ថាប័ន:</b> Galaxy TV 4K`,
      `<b>កាលបរិច្ឆេទ:</b> ${khmerDateFormatted}`,
      `<b>ម៉ោងចេញផ្សាយ:</b> ០៧:០០ ព្រឹក`,
      `--------------------------------------------------`,
      `<b>សេចក្តីសង្ខេបប្រចាំថ្ងៃ:</b>`,
      `- ចំនួនបុគ្គលិកសរុប: ${this.toKhmerDigits(employees.length)} នាក់`,
      `- ចំនួនបុគ្គលិកបំពេញការងារថ្ងៃនេះ: ${this.toKhmerDigits(workingCount)} នាក់`,
      `- ចំនួនបុគ្គលិកវេនរៀនថ្ងៃនេះ: ${this.toKhmerDigits(studentCount)} នាក់`,
      `- ចំនួនបុគ្គលិកសុំច្បាប់ថ្ងៃនេះ: ${this.toKhmerDigits(onLeaveCount)} នាក់`,
      `--------------------------------------------------`,
      `<b>បញ្ជីឈ្មោះបុគ្គលិកទាំង ${this.toKhmerDigits(employees.length)} រូប:</b>`,
      ``,
    ].join('\n');

    // Telegram has 4096 character limit per message.
    // If all 20 employees exceed 3800 chars, chunk cleanly into Part 1 and Part 2
    const fullMessage = `${header}\n${employeeLines.join('\n\n')}`;

    const messages: string[] = [];
    if (fullMessage.length <= 3800) {
      messages.push(fullMessage);
    } else {
      const mid = Math.ceil(employees.length / 2);
      const part1Lines = employeeLines.slice(0, mid);
      const part2Lines = employeeLines.slice(mid);

      const part1 = `${header}\n${part1Lines.join('\n\n')}\n\n<i>(មានបន្តនៅសារបន្ទាប់...)</i>`;
      const part2 = [
        `<b>បញ្ជីឈ្មោះបុគ្គលិក (តចប់ - បុគ្គលិកទី ${this.toKhmerDigits(mid + 1)} ដល់ ${this.toKhmerDigits(employees.length)}):</b>`,
        `--------------------------------------------------`,
        part2Lines.join('\n\n'),
      ].join('\n');

      messages.push(part1, part2);
    }

    return {
      dateStr: khmerDateFormatted,
      totalEmployees: employees.length,
      workingCount,
      studentCount,
      onLeaveCount,
      messages,
      rawText: fullMessage,
    };
  }

  /**
   * Send 7:00 AM Daily Morning Summary to Telegram (Clean Khmer, Numbered List, No Emojis)
   */
  public static async sendDailyMorningSummary(): Promise<{
    success: boolean;
    totalEmployees: number;
    workingCount: number;
    studentCount: number;
    onLeaveCount: number;
    messageCount: number;
  }> {
    const summary = await this.buildDailyMorningSummaryKhmer();

    for (const msg of summary.messages) {
      await this.broadcastMessage(msg, 'daily');
    }

    return {
      success: true,
      totalEmployees: summary.totalEmployees,
      workingCount: summary.workingCount,
      studentCount: summary.studentCount,
      onLeaveCount: summary.onLeaveCount,
      messageCount: summary.messages.length,
    };
  }

  /**
   * Daily Attendance Summary
   */
  public static async notifyDailySummary(data: {
    date: string;
    totalEmployees: number;
    presentCount: number;
    lateCount: number;
    onLeaveCount: number;
    absentCount: number;
    insideCount: number;
    outsideCount: number;
  }): Promise<void> {
    const msg = [
      `<b>Daily Attendance Summary</b>`,
      `<b>Date:</b> ${data.date}`,
      `--------------------------------------------------`,
      `Total Headcount: ${data.totalEmployees}`,
      `Present: ${data.presentCount}`,
      `Late: ${data.lateCount}`,
      `On Leave: ${data.onLeaveCount}`,
      `Absent: ${data.absentCount}`,
      `--------------------------------------------------`,
      `Currently Inside: ${data.insideCount}`,
      `Currently Outside: ${data.outsideCount}`,
    ].join('\n');

    await this.broadcastMessage(msg, 'daily');
  }

  /**
   * System Alert
   */
  public static async notifySystemAlert(data: {
    message: string;
    errorCode?: string;
  }): Promise<void> {
    const msg = [
      `<b>System Alert</b>`,
      `--------------------------------------------------`,
      `<b>Message:</b> ${data.message}`,
      data.errorCode ? `<b>Code:</b> <code>${data.errorCode}</code>` : '',
      `<b>Time:</b> ${new Date().toISOString()}`,
    ]
      .filter(Boolean)
      .join('\n');

    await this.broadcastMessage(msg, 'system');
  }
}

function cambodiaTimeStr(date: Date): string {
  return date.toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' });
}
