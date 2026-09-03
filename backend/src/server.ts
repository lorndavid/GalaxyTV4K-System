import { app } from './app.js';
import { config } from './config/index.js';
import { prisma } from './utils/prisma.js';

import { startTelegramScheduler, stopTelegramScheduler } from './services/telegramScheduler.js';

async function startServer() {
  try {
    // Verify database connection
    await prisma.$connect();
    console.log('✓ Connected to PostgreSQL database via Prisma');

    const server = app.listen(config.port, () => {
      console.log(`=========================================`);
      console.log(`🚀 System HR Backend Server Running`);
      console.log(`📡 Listening on http://localhost:${config.port}`);
      console.log(`🌍 Environment: ${config.nodeEnv}`);
      console.log(`⏱️ Default Timezone: ${config.defaultTimezone}`);
      console.log(`=========================================`);

      // Initialize Telegram 7:00 AM Daily Summary Scheduler
      startTelegramScheduler();
    });

    // Graceful Shutdown
    const shutdown = async (signal: string) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      stopTelegramScheduler();
      server.close(async () => {
        await prisma.$disconnect();
        console.log('Database disconnected. Process exited.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Non-blocking background check for official employee sync
    setTimeout(async () => {
      try {
        const { seedOfficialEmployees } = await import('./services/seedEmployeesService.js');
        const employeeCount = await prisma.employee.count();
        if (employeeCount < 20) {
          console.log('🌱 Official employees not found or outdated. Running automated sync...');
          await seedOfficialEmployees(prisma);
        }
      } catch (seedErr) {
        console.warn('⚠️ Auto-seed check notice:', seedErr);
      }
    }, 1000);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
