import { PrismaClient } from '@prisma/client';

/**
 * Ensures newly added columns exist in PostgreSQL without requiring table drops or manual migrations.
 */
export async function ensureSchemaUpgrades(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "shiftType" TEXT DEFAULT 'STANDARD';
      ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "checkInStartTime" TEXT DEFAULT '07:30';
      ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "checkInDeadline" TEXT DEFAULT '07:30';
      ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "workEndTime" TEXT DEFAULT '17:30';
      ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "studyClassInfo" TEXT;
      ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "isLocationSharingActive" BOOLEAN DEFAULT TRUE;
      ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "startTime" TEXT;
      ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "endTime" TEXT;
      ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "isPermission" BOOLEAN DEFAULT FALSE;
      ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "permissionType" TEXT;
      ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "createdById" TEXT;

      -- Clean system migration to 07:30 start time & 07:00 check-in window
      UPDATE "CompanySettings" 
      SET "workStartTime" = '07:30', 
          "checkInAllowedBeforeMinutes" = 30 
      WHERE "workStartTime" = '08:00' OR "checkInAllowedBeforeMinutes" = 60;

      -- Update standard employees to 07:30 start time (preserving custom afternoon shifts)
      UPDATE "Employee" 
      SET "checkInStartTime" = '07:30', 
          "checkInDeadline" = '07:30' 
      WHERE ("shiftType" = 'STANDARD' OR "shiftType" IS NULL) 
        AND ("checkInStartTime" = '08:00' OR "checkInStartTime" IS NULL);

      -- Ensure location sharing is active by default for all employees
      UPDATE "Employee"
      SET "isLocationSharingActive" = TRUE
      WHERE "isLocationSharingActive" IS NULL OR "isLocationSharingActive" = FALSE;

      -- Ensure afternoon shift and Chinese class info for តឿន ស្រីនាង & ហុីម វ៉ាន់
      UPDATE "Employee"
      SET "shiftType" = 'AFTERNOON',
          "checkInStartTime" = '12:00',
          "checkInDeadline" = '13:00',
          "workEndTime" = '17:30',
          "studyClassInfo" = 'រៀនភាសាចិន ពេលព្រឹក (08:00 - 11:00)'
      WHERE "khmerName" LIKE '%ស្រីនាង%' OR "latinName" ILIKE '%SREYNEANG%'
         OR "khmerName" LIKE '%ហុីម វ៉ាន់%' OR "latinName" ILIKE '%HIM VANN%'
         OR "employeeCode" IN ('EMP-004', 'EMP-008');
    `);
    console.log('✓ PostgreSQL schema verified and 07:30 shift schedule up-to-date');
  } catch (err) {
    console.warn('⚠️ Schema upgrade check notice:', err);
  }
}
