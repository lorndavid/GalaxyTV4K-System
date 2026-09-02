import { prisma } from '../utils/prisma.js';
import { stringify } from 'csv-stringify/sync';
import { AttendanceStatus } from '@prisma/client';

export class ReportService {
  static async getAttendanceReport({
    startDate,
    endDate,
    departmentId,
    employeeId,
    status,
  }: {
    startDate?: string;
    endDate?: string;
    departmentId?: string;
    employeeId?: string;
    status?: AttendanceStatus;
  }) {
    const where: any = {};

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    if (status) {
      where.status = status;
    }

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (departmentId) {
      where.employee = { departmentId };
    }

    const records = await prisma.attendance.findMany({
      where,
      include: {
        employee: {
          include: { department: true },
        },
        schedule: true,
      },
      orderBy: [{ date: 'desc' }, { employee: { displayName: 'asc' } }],
    });

    return records;
  }

  static async getAttendanceSummaryReport({
    startDate,
    endDate,
    departmentId,
  }: {
    startDate?: string;
    endDate?: string;
    departmentId?: string;
  }) {
    const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().substring(0, 10);
    const end = endDate || new Date().toISOString().substring(0, 10);

    const where: any = {
      date: { gte: start, lte: end },
    };

    if (departmentId) {
      where.employee = { departmentId };
    }

    const records = await prisma.attendance.findMany({
      where,
      include: {
        employee: {
          include: { department: true },
        },
      },
    });

    const totalRecords = records.length;
    const presentCount = records.filter(
      (r) => r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.LATE || r.status === AttendanceStatus.EARLY_LEAVE
    ).length;
    const lateCount = records.filter((r) => r.status === AttendanceStatus.LATE).length;
    const absentCount = records.filter((r) => r.status === AttendanceStatus.ABSENT).length;
    const earlyLeaveCount = records.filter((r) => r.status === AttendanceStatus.EARLY_LEAVE).length;
    const totalWorkedMinutes = records.reduce((sum, r) => sum + (r.workedMinutes || 0), 0);
    const attendanceRate = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 100;

    // Group by Department
    const deptMap = new Map<string, { total: number; present: number }>();
    records.forEach((r) => {
      const deptName = r.employee?.department?.name || 'General';
      const current = deptMap.get(deptName) || { total: 0, present: 0 };
      current.total += 1;
      if (
        r.status === AttendanceStatus.PRESENT ||
        r.status === AttendanceStatus.LATE ||
        r.status === AttendanceStatus.EARLY_LEAVE
      ) {
        current.present += 1;
      }
      deptMap.set(deptName, current);
    });

    const byDepartment = Array.from(deptMap.entries()).map(([name, data]) => ({
      name,
      total: data.total,
      present: data.present,
      rate: data.total > 0 ? Math.round((data.present / data.total) * 100) : 100,
    }));

    // Group by Employee
    const empMap = new Map<
      string,
      {
        employeeId: string;
        employeeCode: string;
        displayName: string;
        department?: string;
        present: number;
        late: number;
        absent: number;
        workedMinutes: number;
      }
    >();

    records.forEach((r) => {
      const empId = r.employeeId;
      const current = empMap.get(empId) || {
        employeeId: empId,
        employeeCode: r.employee?.employeeCode || '',
        displayName: r.employee?.displayName || '',
        department: r.employee?.department?.name,
        present: 0,
        late: 0,
        absent: 0,
        workedMinutes: 0,
      };

      if (r.status === AttendanceStatus.PRESENT || r.status === AttendanceStatus.EARLY_LEAVE) {
        current.present += 1;
      } else if (r.status === AttendanceStatus.LATE) {
        current.present += 1;
        current.late += 1;
      } else if (r.status === AttendanceStatus.ABSENT) {
        current.absent += 1;
      }

      current.workedMinutes += r.workedMinutes || 0;
      empMap.set(empId, current);
    });

    const employeeSummaries = Array.from(empMap.values());

    return {
      period: { startDate: start, endDate: end },
      summary: {
        totalRecords,
        presentCount,
        lateCount,
        absentCount,
        earlyLeaveCount,
        totalWorkedMinutes,
        attendanceRate,
      },
      byDepartment,
      employeeSummaries,
    };
  }

  static async generateAttendanceCsv(records: any[]): Promise<string> {
    const data = records.map((r) => ({
      'Employee Code': r.employee.employeeCode,
      'Employee Name': r.employee.displayName,
      Department: r.employee.department?.name || 'N/A',
      Position: r.employee.position,
      Date: r.date,
      'Check In': r.checkInAt ? new Date(r.checkInAt).toISOString().substring(11, 19) : '',
      'Check Out': r.checkOutAt ? new Date(r.checkOutAt).toISOString().substring(11, 19) : '',
      'Worked Hours': (r.workedMinutes / 60).toFixed(2),
      'Late (Mins)': r.lateMinutes,
      'Early Leave (Mins)': r.earlyLeaveMinutes,
      Status: r.status,
      'Check-in Distance (m)': r.checkInDistanceMeters !== null ? r.checkInDistanceMeters.toFixed(1) : '',
      Notes: r.notes || '',
    }));

    return stringify(data, { header: true });
  }

  static async getDashboardMetrics() {
    const settings = await prisma.companySettings.findUnique({ where: { id: 'default' } });
    const today = new Date().toISOString().substring(0, 10);

    const totalEmployees = await prisma.employee.count({
      where: { status: 'ACTIVE' },
    });

    const todayAttendances = await prisma.attendance.findMany({
      where: { date: today },
    });

    const presentCount = todayAttendances.filter((a) => a.checkInAt !== null).length;
    const lateCount = todayAttendances.filter((a) => a.status === AttendanceStatus.LATE).length;
    const earlyLeaveCount = todayAttendances.filter((a) => a.status === AttendanceStatus.EARLY_LEAVE).length;

    const onLeaveCount = await prisma.leaveRequest.count({
      where: {
        status: 'APPROVED',
        startDate: { lte: today },
        endDate: { gte: today },
      },
    });

    const currentlyOutCount = await prisma.outRequest.count({
      where: {
        status: 'APPROVED',
        date: today,
      },
    });

    const absentCount = Math.max(0, totalEmployees - presentCount - onLeaveCount);
    const attendancePercentage = totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0;

    const pendingLeaveCount = await prisma.leaveRequest.count({
      where: { status: 'PENDING' },
    });

    const pendingOutCount = await prisma.outRequest.count({
      where: { status: 'PENDING' },
    });

    const recentActivity = await prisma.attendance.findMany({
      where: { date: today },
      include: { employee: true },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    return {
      today,
      totalEmployees,
      presentCount,
      lateCount,
      earlyLeaveCount,
      onLeaveCount,
      currentlyOutCount,
      absentCount,
      attendancePercentage,
      pendingLeaveCount,
      pendingOutCount,
      recentActivity,
      companyLocation: {
        latitude: settings?.latitude,
        longitude: settings?.longitude,
        allowedRadius: settings?.allowedRadiusMeters,
      },
    };
  }
}
