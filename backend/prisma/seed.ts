import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient, UserRole, UserStatus, EmployeeStatus, DayOfWeek } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Company Settings
  await prisma.companySettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      companyName: 'Galaxy TV4K',
      companyLogo: null,
      timezone: 'Asia/Phnom_Penh',
      latitude: 11.5564,
      longitude: 104.9282,
      allowedRadiusMeters: 100.0,
      gpsAccuracyThresholdMeters: 50.0,
      qrExpirationSeconds: 60,
      lateGracePeriodMinutes: 10,
      earlyLeaveGraceMinutes: 0,
      checkInAllowedBeforeMinutes: 60,
      checkOutAllowedAfterMinutes: 120,
    },
  });
  console.log('✓ Company settings initialized');

  // 2. Default Schedule (Mon-Fri 08:00-17:00, Sat 08:00-12:00, Sun off)
  const defaultSchedule = await prisma.schedule.upsert({
    where: { name: 'Standard Office Schedule (Mon-Fri + Sat AM)' },
    update: {},
    create: {
      name: 'Standard Office Schedule (Mon-Fri + Sat AM)',
      description: 'Standard 44-hour weekly office schedule with Saturday morning shift',
      timezone: 'Asia/Phnom_Penh',
      isDefault: true,
      days: {
        create: [
          { dayOfWeek: DayOfWeek.MONDAY, isWorkingDay: true, startTime: '08:00', endTime: '17:00', breakStartTime: '12:00', breakEndTime: '13:00' },
          { dayOfWeek: DayOfWeek.TUESDAY, isWorkingDay: true, startTime: '08:00', endTime: '17:00', breakStartTime: '12:00', breakEndTime: '13:00' },
          { dayOfWeek: DayOfWeek.WEDNESDAY, isWorkingDay: true, startTime: '08:00', endTime: '17:00', breakStartTime: '12:00', breakEndTime: '13:00' },
          { dayOfWeek: DayOfWeek.THURSDAY, isWorkingDay: true, startTime: '08:00', endTime: '17:00', breakStartTime: '12:00', breakEndTime: '13:00' },
          { dayOfWeek: DayOfWeek.FRIDAY, isWorkingDay: true, startTime: '08:00', endTime: '17:00', breakStartTime: '12:00', breakEndTime: '13:00' },
          { dayOfWeek: DayOfWeek.SATURDAY, isWorkingDay: true, startTime: '08:00', endTime: '12:00', breakStartTime: null, breakEndTime: null },
          { dayOfWeek: DayOfWeek.SUNDAY, isWorkingDay: false, startTime: '08:00', endTime: '17:00', breakStartTime: null, breakEndTime: null },
        ],
      },
    },
  });
  console.log('✓ Default schedule initialized');

  // 3. Departments
  const deptEng = await prisma.department.upsert({
    where: { code: 'ENG' },
    update: {},
    create: { name: 'Engineering & Technology', code: 'ENG', description: 'Software and infrastructure development team' },
  });
  const deptHR = await prisma.department.upsert({
    where: { code: 'HR' },
    update: {},
    create: { name: 'Human Resources & People', code: 'HR', description: 'People operations, talent acquisition, and employee care' },
  });
  const deptMkt = await prisma.department.upsert({
    where: { code: 'MKT' },
    update: {},
    create: { name: 'Marketing & Growth', code: 'MKT', description: 'Brand strategy, social media, and client acquisition' },
  });
  const deptOps = await prisma.department.upsert({
    where: { code: 'OPS' },
    update: {},
    create: { name: 'Operations & Logistics', code: 'OPS', description: 'Day-to-day operations and administrative execution' },
  });
  console.log('✓ Departments initialized');

  // 4. Admin Users
  const adminPasswordHash = await bcrypt.hash('galaxytv@@', 10);
  await prisma.user.upsert({
    where: { email: 'admin@galaxytv4k.com' },
    update: { passwordHash: adminPasswordHash, role: UserRole.ADMIN, status: UserStatus.ACTIVE },
    create: {
      email: 'admin@galaxytv4k.com',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: { passwordHash: adminPasswordHash, role: UserRole.ADMIN, status: UserStatus.ACTIVE },
    create: {
      email: 'admin@company.com',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });
  console.log('✓ Super Admin created: admin@galaxytv4k.com / admin@company.com with password galaxytv@@');

  // 5. Official 20 Employees Seeding
  const { seedOfficialEmployees } = await import('../src/services/seedEmployeesService.js');
  await seedOfficialEmployees(prisma);

  // 6. Holidays
  const currentYear = new Date().getFullYear();
  const holidays = [
    { name: "New Year's Day", date: `${currentYear}-01-01`, isRecurring: true, description: 'International New Year' },
    { name: 'Khmer New Year Day 1', date: `${currentYear}-04-14`, isRecurring: false, description: 'Traditional Khmer New Year Celebration' },
    { name: 'Khmer New Year Day 2', date: `${currentYear}-04-15`, isRecurring: false, description: 'Traditional Khmer New Year Celebration' },
    { name: 'Khmer New Year Day 3', date: `${currentYear}-04-16`, isRecurring: false, description: 'Traditional Khmer New Year Celebration' },
    { name: 'International Labor Day', date: `${currentYear}-05-01`, isRecurring: true, description: 'International Workers Day' },
    { name: 'King Father Norodom Sihanouk Day', date: `${currentYear}-10-15`, isRecurring: true, description: 'Commemoration Day of King Father' },
    { name: 'Independence Day', date: `${currentYear}-11-09`, isRecurring: true, description: 'Cambodian National Independence Day' },
    { name: 'Water Festival Day 1', date: `${currentYear}-11-26`, isRecurring: false, description: 'Bon Om Touk Water Festival' },
  ];

  for (const h of holidays) {
    await prisma.holiday.upsert({
      where: { date: h.date },
      update: {},
      create: h,
    });
  }
  console.log('✓ Public holidays seeded');
  console.log('🎉 Seeding successfully finished!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
