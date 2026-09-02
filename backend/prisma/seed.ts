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

  // 4. Admin User
  const adminPasswordHash = await bcrypt.hash('Admin@123456', 10);
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
  console.log('✓ Super Admin created: admin@company.com / Admin@123456');

  // 5. Sample Employees
  const employeePasswordHash = await bcrypt.hash('Employee@123456', 10);

  const sampleEmployees = [
    {
      code: 'EMP-001',
      khmerName: 'ចាន់ សុខា',
      latinName: 'Chan Sokha',
      gender: 'ប្រុស',
      skill: 'Full Stack & Cloud Architecture',
      studyDay: 'ច័ន្ទ - សុក្រ (Mon - Fri)',
      email: 'sokha.chan@company.com',
      phone: '012 345 678',
      position: 'Senior Full Stack Lead',
      departmentId: deptEng.id,
      hireDate: new Date('2023-01-15'),
    },
    {
      code: 'EMP-002',
      khmerName: 'វង្ស តារា',
      latinName: 'Vong Dara',
      gender: 'ប្រុស',
      skill: 'Frontend & Mobile PWA',
      studyDay: 'ច័ន្ទ - សៅរ៍ (Mon - Sat)',
      email: 'dara.vong@company.com',
      phone: '017 890 123',
      position: 'Frontend React Specialist',
      departmentId: deptEng.id,
      hireDate: new Date('2023-04-01'),
    },
    {
      code: 'EMP-003',
      khmerName: 'ហេង បុប្ផា',
      latinName: 'Heng Bopha',
      gender: 'ស្រី',
      skill: 'People Ops & Talent Acquisition',
      studyDay: 'ច័ន្ទ - សុក្រ (Mon - Fri)',
      email: 'bopha.heng@company.com',
      phone: '077 456 789',
      position: 'HR & People Operations',
      departmentId: deptHR.id,
      hireDate: new Date('2022-08-10'),
    },
    {
      code: 'EMP-004',
      khmerName: 'ម៉េង ចេត',
      latinName: 'Meng Chet',
      gender: 'ប្រុស',
      skill: 'Digital Marketing & Content Strategy',
      studyDay: 'ច័ន្ទ - សុក្រ (Mon - Fri)',
      email: 'chet.meng@company.com',
      phone: '089 234 567',
      position: 'Senior Marketing Lead',
      departmentId: deptMkt.id,
      hireDate: new Date('2023-06-15'),
    },
    {
      code: 'EMP-005',
      khmerName: 'នួន សុផល',
      latinName: 'Nuon Sophal',
      gender: 'ស្រី',
      skill: 'Operations & Media Production',
      studyDay: 'វេនព្រឹក (Morning Shift)',
      email: 'sophal.nuon@company.com',
      phone: '092 678 901',
      position: 'Operations Manager',
      departmentId: deptOps.id,
      hireDate: new Date('2022-03-20'),
    },
  ];

  const currentYear = new Date().getFullYear();

  for (const emp of sampleEmployees) {
    const employee = await prisma.employee.upsert({
      where: { employeeCode: emp.code },
      update: {
        khmerName: emp.khmerName,
        latinName: emp.latinName,
        gender: emp.gender,
        skill: emp.skill,
        studyDay: emp.studyDay,
        phone: emp.phone,
        position: emp.position,
        displayName: emp.khmerName,
        departmentId: emp.departmentId,
        scheduleId: defaultSchedule.id,
      },
      create: {
        employeeCode: emp.code,
        firstName: '',
        lastName: '',
        displayName: emp.khmerName,
        khmerName: emp.khmerName,
        latinName: emp.latinName,
        gender: emp.gender,
        skill: emp.skill,
        studyDay: emp.studyDay,
        email: emp.email,
        phone: emp.phone,
        position: emp.position,
        departmentId: emp.departmentId,
        scheduleId: defaultSchedule.id,
        hireDate: emp.hireDate,
        status: EmployeeStatus.ACTIVE,
      },
    });

    // Create User account linked to employee
    await prisma.user.upsert({
      where: { email: emp.email },
      update: {
        passwordHash: employeePasswordHash,
        employeeId: employee.id,
        role: UserRole.EMPLOYEE,
        status: UserStatus.ACTIVE,
      },
      create: {
        email: emp.email,
        passwordHash: employeePasswordHash,
        role: UserRole.EMPLOYEE,
        status: UserStatus.ACTIVE,
        employeeId: employee.id,
      },
    });

    // Create Leave Balance
    await prisma.leaveBalance.upsert({
      where: {
        employeeId_year: {
          employeeId: employee.id,
          year: currentYear,
        },
      },
      update: {},
      create: {
        employeeId: employee.id,
        year: currentYear,
        annualTotal: 15.0,
        annualUsed: 0.0,
        sickTotal: 10.0,
        sickUsed: 0.0,
        personalTotal: 5.0,
        personalUsed: 0.0,
        unpaidUsed: 0.0,
        maternityTotal: 90.0,
        maternityUsed: 0.0,
        paternityTotal: 5.0,
        paternityUsed: 0.0,
        otherTotal: 0.0,
        otherUsed: 0.0,
      },
    });
  }
  console.log(`✓ 5 Sample employees created (Password for all: Employee@123456)`);

  // 6. Holidays
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
