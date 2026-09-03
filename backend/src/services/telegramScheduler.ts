import { TelegramService } from './telegramService.js';
import { prisma } from '../utils/prisma.js';

let lastDispatchedDate: string | null = null;
let schedulerTimer: NodeJS.Timeout | null = null;

/**
 * Telegram Automated Daily 7:00 AM Scheduler (Asia/Phnom_Penh)
 * Automatically broadcasts clean Khmer morning summary of what employees work today
 * and student count to all authorized Telegram channels.
 */
export function startTelegramScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
  }

  console.log('⏰ Telegram 7:00 AM Daily Summary Scheduler started (Timezone: Asia/Phnom_Penh)');

  // Poll every 30 seconds
  schedulerTimer = setInterval(async () => {
    try {
      const now = new Date();
      // Formats in Asia/Phnom_Penh (Cambodia time)
      const cambodiaDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Phnom_Penh' }); // YYYY-MM-DD
      const cambodiaHours = parseInt(
        now.toLocaleTimeString('en-US', { timeZone: 'Asia/Phnom_Penh', hour12: false, hour: '2-digit' }),
        10
      );
      const cambodiaMinutes = parseInt(
        now.toLocaleTimeString('en-US', { timeZone: 'Asia/Phnom_Penh', hour12: false, minute: '2-digit' }),
        10
      );

      // Check if it is exactly 07:00 AM in Cambodia and hasn't been sent yet today
      if (cambodiaHours === 7 && cambodiaMinutes === 0 && lastDispatchedDate !== cambodiaDateStr) {
        const config = await prisma.telegramConfig.findUnique({
          where: { id: 'default' },
        });

        if (config && config.enabled && config.dailySummaryEnabled) {
          lastDispatchedDate = cambodiaDateStr;
          console.log(`[TelegramScheduler] Triggering 7:00 AM daily summary for ${cambodiaDateStr}...`);
          
          const result = await TelegramService.sendDailyMorningSummary();
          console.log(
            `✓ [TelegramScheduler] 7:00 AM summary sent successfully (${result.totalEmployees} employees, ${result.studentCount} studying, ${result.workingCount} working)`
          );
        }
      }
    } catch (err) {
      console.error('[TelegramScheduler] Periodic check error:', err);
    }
  }, 30000);
}

export function stopTelegramScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}
