import { PrismaClient } from '@prisma/client';

/**
 * Ensures newly added columns exist in PostgreSQL without requiring table drops or manual migrations.
 */
export async function ensureSchemaUpgrades(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "shiftType" TEXT DEFAULT 'STANDARD';
      ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "checkInStartTime" TEXT DEFAULT '08:00';
      ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "checkInDeadline" TEXT DEFAULT '08:00';
      ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "workEndTime" TEXT DEFAULT '17:30';
      ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "studyClassInfo" TEXT;
      ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "startTime" TEXT;
      ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "endTime" TEXT;
      ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "isPermission" BOOLEAN DEFAULT FALSE;
      ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "permissionType" TEXT;
      ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
    `);
    console.log('✓ PostgreSQL schema verified and up-to-date');
  } catch (err) {
    console.warn('⚠️ Schema upgrade check notice:', err);
  }
}
