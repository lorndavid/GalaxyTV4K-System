import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient, UserRole, UserStatus, EmployeeStatus, DayOfWeek } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const OFFICIAL_EMPLOYEES = [
  {
    code: 'EMP-001',
    khmerName: 'ហួយ ប៊ុនធឿន',
    latinName: 'HUOY BUNTHOEUN',
    gender: 'ប្រុស',
    skill: 'ទីផ្សារឌីជីថល',
    studyDay: 'សុក្រ-សៅរ៍-អាទិត្យ',
    phone: '0886807696',
    position: 'ព័ត៌មានទូទៅ',
    departmentName: 'ព័ត៌មានសង្គម',
    departmentCode: 'SOC-NEWS',
    email: 'bunthoeun@galaxytv4k.com',
  },
  {
    code: 'EMP-002',
    khmerName: 'សរ សីឡា',
    latinName: 'SOR SEILA',
    gender: 'ស្រី',
    skill: 'ទីផ្សារឌីជីថល',
    studyDay: 'សុក្រ-សៅរ៍-អាទិត្យ',
    phone: '0314941439',
    position: 'ព័ត៌មានទូទៅ',
    departmentName: 'ព័ត៌មានសង្គម',
    departmentCode: 'SOC-NEWS',
    email: 'seila@galaxytv4k.com',
  },
  {
    code: 'EMP-003',
    khmerName: 'ធឿន ចន្ធី',
    latinName: 'THOEURN CHANTHY',
    gender: 'ស្រី',
    skill: 'ទីផ្សារឌីជីថល',
    studyDay: 'សុក្រ-សៅរ៍-អាទិត្យ',
    phone: '069901635',
    position: 'ព័ត៌មានទូទៅ',
    departmentName: 'សិល្បៈ',
    departmentCode: 'ART',
    email: 'chanthy@galaxytv4k.com',
  },
  {
    code: 'EMP-004',
    khmerName: 'ហុីម វ៉ាន់',
    latinName: 'HIM VANN',
    gender: 'ប្រុស',
    skill: 'ទីផ្សារឌីជីថល',
    studyDay: 'សុក្រ-សៅរ៍-អាទិត្យ',
    phone: '061756748',
    position: 'ព័ត៌មានទូទៅ',
    departmentName: 'សេដ្ឋកិច្ច និង ហិរញ្ញវត្ថុ',
    departmentCode: 'ECO-FIN',
    email: 'vann@galaxytv4k.com',
  },
  {
    code: 'EMP-005',
    khmerName: 'រឿន ស្រីនិច្ច',
    latinName: 'ROEUEN SREYNICH',
    gender: 'ស្រី',
    skill: 'ព័ត៌មានវិទ្យា',
    studyDay: 'ព្រហ-សុក្រ',
    phone: '0969260319',
    position: 'ព័ត៌មានទូទៅ',
    departmentName: 'សេដ្ឋកិច្ច និង ហិរញ្ញវត្ថុ',
    departmentCode: 'ECO-FIN',
    email: 'sreynich@galaxytv4k.com',
  },
  {
    code: 'EMP-006',
    khmerName: 'ឈួន សុខលាង',
    latinName: 'CHHOUN SOKLEANG',
    gender: 'ស្រី',
    skill: 'ព័ត៌មានវិទ្យា',
    studyDay: 'ព្រហ-សុក្រ',
    phone: '090620477',
    position: 'ព័ត៌មានទូទៅ',
    departmentName: 'សិល្បៈ',
    departmentCode: 'ART',
    email: 'sokleang@galaxytv4k.com',
  },
  {
    code: 'EMP-007',
    khmerName: 'ខូយ ស្រីនី',
    latinName: 'KHOUY SREYNY',
    gender: 'ស្រី',
    skill: 'ព័ត៌មានវិទ្យា',
    studyDay: 'ព្រហ-សុក្រ',
    phone: '0979397592',
    position: 'ព័ត៌មានទូទៅ',
    departmentName: 'សុខភាព និងសម្រស់',
    departmentCode: 'HLT-BTY',
    email: 'sreyny@galaxytv4k.com',
  },
  {
    code: 'EMP-008',
    khmerName: 'តឿន ស្រីនាង',
    latinName: 'TOEUN SREYNEANG',
    gender: 'ស្រី',
    skill: 'ព័ត៌មានវិទ្យា',
    studyDay: 'ព្រហ-សុក្រ',
    phone: '0714484085',
    position: 'ព័ត៌មានទូទៅ',
    departmentName: 'សុខភាព និងសម្រស់',
    departmentCode: 'HLT-BTY',
    email: 'sreyneang@galaxytv4k.com',
  },
  {
    code: 'EMP-009',
    khmerName: 'ម៉ៅ រស្មី',
    latinName: 'MAO REAKSMEY',
    gender: 'ស្រី',
    skill: 'ព័ត៌មានវិទ្យា',
    studyDay: 'ព្រហ-សុក្រ',
    phone: '017614233',
    position: 'ព័ត៌មានទូទៅ',
    departmentName: 'សេដ្ឋកិច្ច និង ហិរញ្ញវត្ថុ',
    departmentCode: 'ECO-FIN',
    email: 'reaksmey@galaxytv4k.com',
  },
  {
    code: 'EMP-010',
    khmerName: 'ខេង ស្រីឡែន',
    latinName: 'KHENG SREYLEN',
    gender: 'ស្រី',
    skill: 'ក្រាហ្វីកឌីហ្សាញ',
    studyDay: 'សុក្រ-សៅរ៍-អាទិត្យ',
    phone: '093959226',
    position: 'ព័ត៌មានទូទៅ',
    departmentName: 'ព័ត៌មានសង្គម',
    departmentCode: 'SOC-NEWS',
    email: 'sreylen@galaxytv4k.com',
  },
  {
    code: 'EMP-011',
    khmerName: 'ព្រឹន ចែហួយ',
    latinName: 'PRIN CHEHOUY',
    gender: 'ស្រី',
    skill: 'រដ្ឋបាលសាធារណៈ',
    studyDay: 'សុក្រ-សៅរ៍-អាទិត្យ',
    phone: '0969075458',
    position: 'ព័ត៌មានទូទៅ',
    departmentName: 'សិល្បៈ',
    departmentCode: 'ART',
    email: 'chehouy@galaxytv4k.com',
  },
  {
    code: 'EMP-012',
    khmerName: 'សំបូរ សម្បត្តិ',
    latinName: 'SAMBO SAMBATH',
    gender: 'ប្រុស',
    skill: 'អង់គ្លេស',
    studyDay: 'ចន្ទ-អង្គារ',
    phone: '0715138360',
    position: 'អន្តរជាតិ',
    departmentName: 'អន្តរជាតិ',
    departmentCode: 'INTL',
    email: 'sambath@galaxytv4k.com',
  },
  {
    code: 'EMP-013',
    khmerName: 'វ៉ន សៃហ្វា',
    latinName: 'VORN SAIFA',
    gender: 'ប្រុស',
    skill: 'អង់គ្លេស',
    studyDay: 'ចន្ទ-អង្គារ',
    phone: '099866365',
    position: 'អន្តរជាតិ',
    departmentName: 'អន្តរជាតិ',
    departmentCode: 'INTL',
    email: 'saifa@galaxytv4k.com',
  },
  {
    code: 'EMP-014',
    khmerName: 'វី សម្ផស្ស',
    latinName: 'VY SAMPHORS',
    gender: 'ស្រី',
    skill: 'អង់គ្លេស',
    studyDay: 'ចន្ទ-អង្គារ',
    phone: '0712933743',
    position: 'អន្តរជាតិ',
    departmentName: 'អន្តរជាតិ',
    departmentCode: 'INTL',
    email: 'samphors@galaxytv4k.com',
  },
  {
    code: 'EMP-015',
    khmerName: 'ហឿន ស្រីម៉ី',
    latinName: 'HOEURN SREYMEY',
    gender: 'ស្រី',
    skill: 'អង់គ្លេស',
    studyDay: 'ចន្ទ-អង្គារ',
    phone: '0963599365',
    position: 'អន្តរជាតិ',
    departmentName: 'អន្តរជាតិ',
    departmentCode: 'INTL',
    email: 'sreymey@galaxytv4k.com',
  },
  {
    code: 'EMP-016',
    khmerName: 'ម៉ាន សំអឿន',
    latinName: 'MAN SAMOERUN',
    gender: 'ស្រី',
    skill: 'អង់គ្លេស',
    studyDay: 'ចន្ទ-អង្គារ',
    phone: '0719584934',
    position: 'អន្តរជាតិ',
    departmentName: 'អន្តរជាតិ',
    departmentCode: 'INTL',
    email: 'samoerun@galaxytv4k.com',
  },
  {
    code: 'EMP-017',
    khmerName: 'ជ្រុន សុខលី',
    latinName: 'CHRON SOKLY',
    gender: 'ស្រី',
    skill: 'អង់គ្លេស',
    studyDay: 'ចន្ទ-អង្គារ',
    phone: '0976967063',
    position: 'អន្តរជាតិ',
    departmentName: 'អន្តរជាតិ',
    departmentCode: 'INTL',
    email: 'sokly@galaxytv4k.com',
  },
  {
    code: 'EMP-018',
    khmerName: 'ជឿ រតនី',
    latinName: 'CHOEUR RATHANY',
    gender: 'ប្រុស',
    skill: 'ព័ត៌មានវិទ្យា',
    studyDay: 'សៅរ៍-អាទិត្យ',
    phone: '0889735058',
    position: 'ព័ត៌មានវិទ្យា',
    departmentName: 'Live and Website',
    departmentCode: 'LIVE-WEB',
    email: 'rathany@galaxytv4k.com',
  },
  {
    code: 'EMP-019',
    khmerName: 'យ៉ែម ដេវន្ដ',
    latinName: 'YEM DEVORN',
    gender: 'ប្រុស',
    skill: 'ទីផ្សារឌីជីថល',
    studyDay: 'សុក្រ-សៅរ៍-អាទិត្យ',
    phone: '0886066835',
    position: 'ទីផ្សារឌីជីថល',
    departmentName: 'Live',
    departmentCode: 'LIVE',
    email: 'devorn@galaxytv4k.com',
  },
  {
    code: 'EMP-020',
    khmerName: 'សៅ បញ្ញា',
    latinName: 'SAO PANHA',
    gender: 'ប្រុស',
    skill: 'ព័ត៌មានវិទ្យា',
    studyDay: 'សៅរ៍-អាទិត្យ',
    phone: '016220913',
    position: 'ឌីហ្សាញ (Design)',
    departmentName: 'Design Galaxy TV 4K',
    departmentCode: 'DSGN-TV4K',
    email: 'panha@galaxytv4k.com',
  },
];

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

  // 2. Default Schedule
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
  const deptMap = new Map<string, string>();
  for (const emp of OFFICIAL_EMPLOYEES) {
    if (!deptMap.has(emp.departmentName)) {
      const dept = await prisma.department.upsert({
        where: { name: emp.departmentName },
        update: { code: emp.departmentCode },
        create: {
          name: emp.departmentName,
          code: emp.departmentCode,
          description: `Department for ${emp.departmentName}`,
        },
      });
      deptMap.set(emp.departmentName, dept.id);
    }
  }
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

  // 5. Safely seed/sync all 20 Official Employees WITHOUT deleting existing attendance, leaves, or GPS settings
  const employeePasswordHash = await bcrypt.hash('galaxytv@@', 10);
  const currentYear = new Date().getFullYear();

  for (const empData of OFFICIAL_EMPLOYEES) {
    const deptId = deptMap.get(empData.departmentName);

    // Upsert Employee to preserve existing ID, relations, and attendance
    const employee = await prisma.employee.upsert({
      where: { employeeCode: empData.code },
      update: {
        displayName: empData.latinName,
        khmerName: empData.khmerName,
        latinName: empData.latinName,
        gender: empData.gender,
        skill: empData.skill,
        studyDay: empData.studyDay,
        phone: empData.phone,
        position: empData.position,
        departmentId: deptId || null,
        scheduleId: defaultSchedule?.id || null,
      },
      create: {
        employeeCode: empData.code,
        displayName: empData.latinName,
        khmerName: empData.khmerName,
        latinName: empData.latinName,
        gender: empData.gender,
        skill: empData.skill,
        studyDay: empData.studyDay,
        email: empData.email.toLowerCase(),
        phone: empData.phone,
        position: empData.position,
        departmentId: deptId || null,
        scheduleId: defaultSchedule?.id || null,
        status: EmployeeStatus.ACTIVE,
      },
    });

    // Upsert User account
    await prisma.user.upsert({
      where: { email: empData.email.toLowerCase() },
      update: {
        employeeId: employee.id,
        role: UserRole.EMPLOYEE,
        status: UserStatus.ACTIVE,
      },
      create: {
        email: empData.email.toLowerCase(),
        passwordHash: employeePasswordHash,
        role: UserRole.EMPLOYEE,
        status: UserStatus.ACTIVE,
        employeeId: employee.id,
      },
    });

    // Upsert Leave Balance
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
        sickTotal: 10.0,
        personalTotal: 5.0,
      },
    });
  }
  console.log(`✓ All ${OFFICIAL_EMPLOYEES.length} official employees safely verified/synced without data loss`);

  // 7. Holidays
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
