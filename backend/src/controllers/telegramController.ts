import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { TelegramService } from '../services/telegramService';
import { encryptText, decryptText, maskToken } from '../utils/encryption';
import { z } from 'zod';

const prisma = new PrismaClient();

export class TelegramController {
  /**
   * Get Telegram configuration and authorized chats (Admin)
   */
  public static async getConfig(req: Request, res: Response): Promise<void> {
    try {
      let config = await prisma.telegramConfig.findUnique({
        where: { id: 'default' },
      });

      if (!config) {
        config = await prisma.telegramConfig.create({
          data: { id: 'default' },
        });
      }

      const chats = await prisma.telegramChat.findMany({
        orderBy: { createdAt: 'desc' },
      });

      const rawToken = config.botTokenEncrypted ? decryptText(config.botTokenEncrypted) : '';
      const maskedToken = rawToken ? maskToken(rawToken) : '';

      res.status(200).json({
        success: true,
        data: {
          id: config.id,
          hasBotToken: Boolean(config.botTokenEncrypted),
          botTokenMasked: maskedToken,
          botUsername: config.botUsername,
          enabled: config.enabled,
          attendanceNotificationsEnabled: config.attendanceNotificationsEnabled,
          locationNotificationsEnabled: config.locationNotificationsEnabled,
          dailySummaryEnabled: config.dailySummaryEnabled,
          systemAlertsEnabled: config.systemAlertsEnabled,
          chats,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { message: 'Failed to retrieve Telegram configuration.' } });
    }
  }

  /**
   * Save Telegram configuration (Admin)
   */
  public static async saveConfig(req: Request, res: Response): Promise<void> {
    try {
      const {
        botToken,
        enabled,
        attendanceNotificationsEnabled,
        locationNotificationsEnabled,
        dailySummaryEnabled,
        systemAlertsEnabled,
      } = req.body;

      const currentConfig = await prisma.telegramConfig.findUnique({
        where: { id: 'default' },
      });

      const updateData: any = {
        enabled: Boolean(enabled),
        attendanceNotificationsEnabled: Boolean(attendanceNotificationsEnabled),
        locationNotificationsEnabled: Boolean(locationNotificationsEnabled),
        dailySummaryEnabled: Boolean(dailySummaryEnabled),
        systemAlertsEnabled: Boolean(systemAlertsEnabled),
      };

      // Only update token if a new, unmasked token string was passed
      if (botToken && !botToken.startsWith('••••')) {
        updateData.botTokenEncrypted = encryptText(botToken.trim());

        // Validate token with Telegram getMe
        const testRes = await TelegramService.testConnection(botToken.trim());
        if (testRes.success && testRes.botUsername) {
          updateData.botUsername = testRes.botUsername;
        }
      }

      const updated = await prisma.telegramConfig.upsert({
        where: { id: 'default' },
        create: {
          id: 'default',
          ...updateData,
        },
        update: updateData,
      });

      res.status(200).json({
        success: true,
        data: {
          enabled: updated.enabled,
          botUsername: updated.botUsername,
          hasBotToken: Boolean(updated.botTokenEncrypted),
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { message: err?.message || 'Failed to save Telegram config.' } });
    }
  }

  /**
   * Test Telegram connection (Admin)
   */
  public static async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const { botToken, chatId } = req.body;

      let tokenToTest = botToken;
      if (!tokenToTest || tokenToTest.startsWith('••••')) {
        const config = await prisma.telegramConfig.findUnique({
          where: { id: 'default' },
        });
        if (!config?.botTokenEncrypted) {
          res.status(400).json({ success: false, error: { message: 'No Bot Token configured. Please enter a Bot Token first.' } });
          return;
        }
        tokenToTest = decryptText(config.botTokenEncrypted);
      }

      const result = await TelegramService.testConnection(tokenToTest, chatId);

      if (!result.success) {
        res.status(400).json({ success: false, error: { message: result.message } });
        return;
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { message: 'Telegram test failed.' } });
    }
  }

  /**
   * Add or update Telegram Chat ID (Admin)
   */
  public static async addChat(req: Request, res: Response): Promise<void> {
    try {
      const { chatId, label } = req.body;

      if (!chatId || !label) {
        res.status(400).json({ success: false, error: { message: 'Chat ID and Label are required.' } });
        return;
      }

      const chat = await prisma.telegramChat.upsert({
        where: { chatId: String(chatId).trim() },
        create: {
          chatId: String(chatId).trim(),
          label: String(label).trim(),
          enabled: true,
        },
        update: {
          label: String(label).trim(),
          enabled: true,
        },
      });

      res.status(200).json({ success: true, data: chat });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { message: 'Failed to add Telegram Chat.' } });
    }
  }

  /**
   * Toggle or delete Telegram Chat ID (Admin)
   */
  public static async deleteChat(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await prisma.telegramChat.delete({ where: { id } });
      res.status(200).json({ success: true, message: 'Chat ID removed.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { message: 'Failed to delete Telegram Chat.' } });
    }
  }

  /**
   * Send Manual Daily Summary (Admin)
   */
  public static async sendDailySummary(req: Request, res: Response): Promise<void> {
    try {
      const todayDate = new Date().toISOString().split('T')[0];

      const totalEmployees = await prisma.employee.count({ where: { status: 'ACTIVE' } });
      const attendances = await prisma.attendance.findMany({ where: { date: todayDate } });

      const presentCount = attendances.filter((a) => a.status === 'PRESENT').length;
      const lateCount = attendances.filter((a) => a.status === 'LATE').length;
      const onLeaveCount = attendances.filter((a) => a.status === 'ON_LEAVE').length;
      const absentCount = attendances.filter((a) => a.status === 'ABSENT').length;

      const employees = await prisma.employee.findMany({ where: { status: 'ACTIVE' } });
      const insideCount = employees.filter((e) => e.lastLocationStatus === 'INSIDE_OFFICE').length;
      const outsideCount = employees.filter((e) => e.lastLocationStatus === 'OUTSIDE_OFFICE').length;

      await TelegramService.notifyDailySummary({
        date: todayDate,
        totalEmployees,
        presentCount,
        lateCount,
        onLeaveCount,
        absentCount,
        insideCount,
        outsideCount,
      });

      res.status(200).json({ success: true, message: 'Daily summary notification sent to Telegram.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { message: 'Failed to dispatch daily summary.' } });
    }
  }
}
