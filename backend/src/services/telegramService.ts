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
      `📊 <b>Daily Attendance Summary</b>`,
      `📅 <b>Date:</b> ${data.date}`,
      `━━━━━━━━━━━━━━━━━━`,
      `👥 <b>Total Headcount:</b> ${data.totalEmployees}`,
      `✅ <b>Present:</b> ${data.presentCount}`,
      `⚠️ <b>Late:</b> ${data.lateCount}`,
      `🌴 <b>On Leave:</b> ${data.onLeaveCount}`,
      `❌ <b>Absent:</b> ${data.absentCount}`,
      `━━━━━━━━━━━━━━━━━━`,
      `🏢 <b>Currently Inside:</b> ${data.insideCount}`,
      `🌍 <b>Currently Outside:</b> ${data.outsideCount}`,
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
      `⚠️ <b>System Alert</b>`,
      `━━━━━━━━━━━━━━━━━━`,
      `<b>Message:</b> ${data.message}`,
      data.errorCode ? `<b>Code:</b> <code>${data.errorCode}</code>` : '',
      `<b>Time:</b> ${new Date().toISOString()}`,
    ]
      .filter(Boolean)
      .join('\n');

    await this.broadcastMessage(msg, 'system');
  }
}
