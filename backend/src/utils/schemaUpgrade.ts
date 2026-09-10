import { PrismaClient } from '@prisma/client';
import { sanitizeAttendanceNote } from './noteUtils.js';

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
          "studyClassInfo" = 'រៀនភាសាចិន ពេលព្រឹក (08:00 - 11:00)'
      WHERE "khmerName" LIKE '%ស្រីនាង%' OR "latinName" ILIKE '%SREYNEANG%'
         OR "khmerName" LIKE '%ហុីម វ៉ាន់%' OR "latinName" ILIKE '%HIM VANN%'
         OR "employeeCode" IN ('EMP-004', 'EMP-008');

      -- Dynamically sync standard & afternoon employees workEndTime from CompanySettings if configured
      UPDATE "Employee"
      SET "workEndTime" = (SELECT "workEndTime" FROM "CompanySettings" WHERE "id" = 'default')
      WHERE ("shiftType" = 'STANDARD' OR "shiftType" IS NULL OR "shiftType" = 'AFTERNOON')
        AND EXISTS (SELECT 1 FROM "CompanySettings" WHERE "id" = 'default' AND "workEndTime" IS NOT NULL);

      -- Clean up all automated/technical strings from Attendance.notes in PostgreSQL
      UPDATE "Attendance"
      SET "notes" = NULL
      WHERE "notes" LIKE '%1-Click%'
        AND "notes" NOT LIKE '%ចិន%'
        AND "notes" NOT ILIKE '%chinese%'
        AND (
          "notes" LIKE '%Manual edit: 1-Click%'
          OR "notes" = '1-Click In-Zone Check-In'
          OR "notes" = '1-Click Check-Out'
          OR "notes" = '1-Click In-Zone Check-In | 1-Click Check-Out'
          OR "notes" LIKE '%1-Click In-Zone Check-In | 1-Click Check-Out%'
          OR "notes" LIKE '%Manual edit: 7%'
          OR "notes" = 'Manual creation by admin: No reason provided'
        );

      -- Restore Chinese study notes for employees with studyClassInfo or afternoon shift
      UPDATE "Attendance" a
      SET "notes" = 'រៀនភាសាចិន (Study Chinese)'
      FROM "Employee" e
      WHERE a."employeeId" = e."id"
        AND (e."studyClassInfo" IS NOT NULL OR e."shiftType" = 'AFTERNOON' OR a."notes" LIKE '%ចិន%' OR a."notes" ILIKE '%chinese%')
        AND (a."notes" IS NULL OR a."notes" LIKE '%1-Click%' OR a."notes" LIKE '%Manual edit:%');
    `);

    // Programmatically clean any remaining notes with legacy technical boilerplates
    const contaminated = await prisma.attendance.findMany({
      where: {
        OR: [
          { notes: { contains: '1-Click' } },
          { notes: { contains: 'Manual edit' } },
          { notes: { contains: 'Manual creation by admin' } },
        ],
      },
      include: {
        employee: true,
      },
    });

    for (const rec of contaminated) {
      const isChinese =
        Boolean(rec.employee?.studyClassInfo) ||
        rec.employee?.shiftType === 'AFTERNOON' ||
        (rec.notes?.includes('ចិន') ?? false) ||
        (rec.notes?.toLowerCase().includes('chinese') ?? false);

      const cleaned = sanitizeAttendanceNote(
        rec.notes,
        isChinese,
        rec.employee?.shiftType === 'AFTERNOON'
      );

      await prisma.attendance.update({
        where: { id: rec.id },
        data: { notes: cleaned },
      });
    }

    console.log('✓ PostgreSQL schema and clean attendance notes verified');
  } catch (err) {
    console.warn('⚠️ Schema upgrade check notice:', err);
  }
}
