import { PrismaClient, UserRole, UserStatus, EmployeeStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

export interface OfficialEmployeeData {
  code: string;
  khmerName: string;
  latinName: string;
  gender: 'ប្រុស' | 'ស្រី';
  skill: string;
  studyDay: string;
  phone: string;
  position: string;
  departmentName: string;
  departmentCode: string;
  email: string;
}

export const OFFICIAL_EMPLOYEES: OfficialEmployeeData[] = [
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

export async function seedOfficialEmployees(prisma: PrismaClient) {
  console.log('🔄 Starting official employee data migration & seeding...');

  // 1. Password hashes
  const employeePasswordHash = await bcrypt.hash('galaxytv@@', 10);
  const adminPasswordHash = await bcrypt.hash('galaxytv@@', 10);

  // 2. Ensure Admin accounts exist
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

  // 3. Ensure Default Schedule
  let defaultSchedule = await prisma.schedule.findFirst({ where: { isDefault: true } });
  if (!defaultSchedule) {
    defaultSchedule = await prisma.schedule.findFirst();
  }

  // 4. Upsert Departments
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

  // 5. Clean up old employee records that are not part of the official list
  const officialEmails = OFFICIAL_EMPLOYEES.map((e) => e.email.toLowerCase());
  const officialCodes = OFFICIAL_EMPLOYEES.map((e) => e.code);

  const employeesToDelete = await prisma.employee.findMany({
    where: {
      NOT: {
        OR: [
          { email: { in: officialEmails } },
          { employeeCode: { in: officialCodes } },
        ],
      },
    },
    include: { user: true },
  });

  for (const oldEmp of employeesToDelete) {
    if (oldEmp.user && oldEmp.user.role !== UserRole.ADMIN) {
      await prisma.session.deleteMany({ where: { userId: oldEmp.user.id } });
      await prisma.user.delete({ where: { id: oldEmp.user.id } });
    }
    await prisma.attendance.deleteMany({ where: { employeeId: oldEmp.id } });
    await prisma.leaveBalance.deleteMany({ where: { employeeId: oldEmp.id } });
    await prisma.leaveRequest.deleteMany({ where: { employeeId: oldEmp.id } });
    await prisma.outRequest.deleteMany({ where: { employeeId: oldEmp.id } });
    await prisma.employeeLocation.deleteMany({ where: { employeeId: oldEmp.id } });
    await prisma.locationEvent.deleteMany({ where: { employeeId: oldEmp.id } });
    await prisma.employee.delete({ where: { id: oldEmp.id } });
  }

  console.log(`✓ Removed ${employeesToDelete.length} obsolete employee records`);

  // 6. Insert or Update all 20 official employees
  const currentYear = new Date().getFullYear();
  let createdCount = 0;
  let updatedCount = 0;

  for (const empData of OFFICIAL_EMPLOYEES) {
    const deptId = deptMap.get(empData.departmentName);

    // Check if employee exists by code or email
    const existingEmployee = await prisma.employee.findFirst({
      where: {
        OR: [{ email: empData.email.toLowerCase() }, { employeeCode: empData.code }],
      },
    });

    let employeeId: string;

    if (existingEmployee) {
      const updated = await prisma.employee.update({
        where: { id: existingEmployee.id },
        data: {
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
      employeeId = updated.id;
      updatedCount++;
    } else {
      const created = await prisma.employee.create({
        data: {
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
      employeeId = created.id;
      createdCount++;
    }

    // Upsert User login account
    await prisma.user.upsert({
      where: { email: empData.email.toLowerCase() },
      update: {
        passwordHash: employeePasswordHash,
        status: UserStatus.ACTIVE,
        employeeId: employeeId,
      },
      create: {
        email: empData.email.toLowerCase(),
        passwordHash: employeePasswordHash,
        role: UserRole.EMPLOYEE,
        status: UserStatus.ACTIVE,
        employeeId: employeeId,
      },
    });

    // Ensure Leave Balance
    await prisma.leaveBalance.upsert({
      where: {
        employeeId_year: {
          employeeId: employeeId,
          year: currentYear,
        },
      },
      update: {},
      create: {
        employeeId: employeeId,
        year: currentYear,
        annualTotal: 15.0,
        sickTotal: 10.0,
        personalTotal: 5.0,
      },
    });
  }

  console.log(
    `✅ Official Employees Processed: ${createdCount} created, ${updatedCount} updated. Total: ${OFFICIAL_EMPLOYEES.length}`
  );

  return {
    total: OFFICIAL_EMPLOYEES.length,
    created: createdCount,
    updated: updatedCount,
    deleted: employeesToDelete.length,
  };
}
