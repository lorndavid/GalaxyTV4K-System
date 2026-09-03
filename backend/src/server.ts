import { app } from './app.js';
import { config } from './config/index.js';
import { prisma } from './utils/prisma.js';

async function startServer() {
  try {
    // Verify database connection
    await prisma.$connect();
    console.log('✓ Connected to PostgreSQL database via Prisma');

    // Auto-seed official employees if not already present
    try {
      const { seedOfficialEmployees } = await import('./services/seedEmployeesService.js');
      const employeeCount = await prisma.employee.count();
      const firstOfficial = await prisma.employee.findUnique({
        where: { email: 'bunthoeun@galaxytv4k.com' },
      });
      if (employeeCount < 20 || !firstOfficial) {
        console.log('🌱 Official employees not found or outdated. Running automated sync...');
        await seedOfficialEmployees(prisma);
      }
    } catch (seedErr) {
      console.warn('⚠️ Auto-seed check notice:', seedErr);
    }

    const server = app.listen(config.port, () => {
      console.log(`=========================================`);
      console.log(`🚀 System HR Backend Server Running`);
      console.log(`📡 Listening on http://localhost:${config.port}`);
      console.log(`🌍 Environment: ${config.nodeEnv}`);
      console.log(`⏱️ Default Timezone: ${config.defaultTimezone}`);
      console.log(`=========================================`);
    });

    // Graceful Shutdown
    const shutdown = async (signal: string) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        console.log('Database disconnected. Process exited.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
