import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { TelegramService } from '../services/telegramService';
import { startTelegramBotPolling } from '../services/telegramBotService';
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

      if (updated.enabled && updated.botTokenEncrypted) {
        startTelegramBotPolling().catch((err) =>
          console.error('[TelegramController] Failed to restart bot polling:', err)
        );
      }

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
   * Add or update Telegram Chat ID (Admin) - Supports Personal, Group, and Channel
   */
  public static async addChat(req: Request, res: Response): Promise<void> {
    try {
      const { chatId, label, chatType } = req.body;

      if (!chatId) {
        res.status(400).json({ success: false, error: { message: 'Chat ID is required.' } });
        return;
      }

      const strId = String(chatId).trim();
      const strLabel = (label ? String(label).trim() : '') || `Chat ${strId}`;

      // Auto-detect chat type if not provided
      let determinedType = (chatType ? String(chatType).toUpperCase() : '') as 'PERSONAL' | 'GROUP' | 'CHANNEL';
      if (!['PERSONAL', 'GROUP', 'CHANNEL'].includes(determinedType)) {
        if (strId.startsWith('-100')) {
          determinedType = 'CHANNEL';
        } else if (strId.startsWith('-')) {
          determinedType = 'GROUP';
        } else {
          determinedType = 'PERSONAL';
        }
      }

      const chat = await prisma.telegramChat.upsert({
        where: { chatId: strId },
        create: {
          chatId: strId,
          label: strLabel,
          chatType: determinedType,
          enabled: true,
        },
        update: {
          label: strLabel,
          chatType: determinedType,
          enabled: true,
        },
      });

      res.status(200).json({ success: true, data: chat });
    } catch (err: any) {
      console.error('[TelegramController] addChat error:', err);
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
   * Send 7:00 AM Daily Summary (Admin manual trigger or automated test)
   */
  public static async sendDailySummary(req: Request, res: Response): Promise<void> {
    try {
      const result = await TelegramService.sendDailyMorningSummary();

      res.status(200).json({
        success: true,
        message: `បានផ្ញើរបាយការណ៍សង្ខេបប្រចាំថ្ងៃទៅ Telegram ជោគជ័យ (បុគ្គលិកសរុប ${result.totalEmployees} នាក់, រៀន ${result.studentCount} នាក់, ធ្វើការ ${result.workingCount} នាក់)`,
        data: result,
      });
    } catch (err: any) {
      console.error('[TelegramController] sendDailySummary error:', err);
      res.status(500).json({ success: false, error: { message: 'Failed to dispatch daily summary to Telegram.' } });
    }
  }

  /**
   * Get Live Preview of Clean Khmer Morning Summary (Admin)
   */
  public static async getDailySummaryPreview(req: Request, res: Response): Promise<void> {
    try {
      const preview = await TelegramService.buildDailyMorningSummaryKhmer();
      res.status(200).json({
        success: true,
        data: preview,
      });
    } catch (err: any) {
      console.error('[TelegramController] getDailySummaryPreview error:', err);
      res.status(500).json({ success: false, error: { message: 'Failed to generate summary preview.' } });
    }
  }
}
