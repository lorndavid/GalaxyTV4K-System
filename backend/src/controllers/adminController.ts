import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { ReportService } from '../services/reportService.js';
import { EmployeeStatus, UserRole, UserStatus, ActorType } from '@prisma/client';
import { createAuditLog } from '../utils/audit.js';

export class AdminController {
  static async getDashboard(req: AuthenticatedRequest, res: Response) {
    const data = await ReportService.getDashboardMetrics();
    return sendSuccess(res, data);
  }

  static async getEmployees(req: AuthenticatedRequest, res: Response) {
    const { departmentId, status, search } = req.query;

    const where: any = {};
    if (departmentId) where.departmentId = String(departmentId);
    if (status) where.status = status as EmployeeStatus;
    if (search) {
      where.OR = [
        { displayName: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } },
        { employeeCode: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        department: true,
        schedule: true,
        user: { select: { id: true, email: true, role: true, status: true } },
      },
      orderBy: { employeeCode: 'asc' },
    });

    return sendSuccess(res, employees);
  }

  static async getEmployeeById(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        schedule: { include: { days: true } },
        user: { select: { id: true, email: true, role: true, status: true, lastLoginAt: true } },
        leaveBalances: { orderBy: { year: 'desc' } },
      },
    });

    if (!employee) return sendError(res, 'EMPLOYEE_NOT_FOUND', 'Employee not found.', 404);
    return sendSuccess(res, employee);
  }

  static async createEmployee(req: AuthenticatedRequest, res: Response) {
    const {
      employeeCode,
      firstName,
      lastName,
      displayName,
      email,
      phone,
      departmentId,
      position,
      scheduleId,
      hireDate,
      initialPassword,
      role = UserRole.EMPLOYEE,
    } = req.body;

    const existing = await prisma.employee.findFirst({
      where: {
        OR: [{ email: email.toLowerCase().trim() }, { employeeCode }],
      },
    });

    if (existing) {
      return sendError(res, 'DUPLICATE_EMPLOYEE', 'Employee with this email or employee code already exists.', 400);
    }

    const passwordHash = await bcrypt.hash(initialPassword || 'Employee@123456', 10);
    const currentYear = new Date().getFullYear();

    const result = await prisma.$transaction(async (tx) => {
      const employee = await tx.employee.create({
        data: {
          employeeCode,
          firstName,
          lastName,
          displayName: displayName || `${firstName} ${lastName}`,
          email: email.toLowerCase().trim(),
          phone,
          position,
          departmentId: departmentId || null,
          scheduleId: scheduleId || null,
          hireDate: hireDate ? new Date(hireDate) : new Date(),
          status: EmployeeStatus.ACTIVE,
        },
      });

      const user = await tx.user.create({
        data: {
          email: employee.email,
          passwordHash,
          role: role as UserRole,
          status: UserStatus.ACTIVE,
          employeeId: employee.id,
        },
      });

      await tx.leaveBalance.create({
        data: {
          employeeId: employee.id,
          year: currentYear,
          annualTotal: 15.0,
          sickTotal: 10.0,
          personalTotal: 5.0,
        },
      });

      await createAuditLog(
        {
          actorId: req.user!.userId,
          actorType: ActorType.ADMIN,
          action: 'EMPLOYEE_CREATED',
          entityType: 'Employee',
          entityId: employee.id,
          metadata: { employeeCode, email: employee.email },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
        tx
      );

      return { employee, user };
    });

    return sendSuccess(res, result, 201);
  }

  static async updateEmployee(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      displayName,
      email,
      phone,
      departmentId,
      position,
      scheduleId,
      status,
    } = req.body;

    const updated = await prisma.$transaction(async (tx) => {
      const emp = await tx.employee.update({
        where: { id },
        data: {
          firstName,
          lastName,
          displayName,
          email: email ? email.toLowerCase().trim() : undefined,
          phone,
          departmentId,
          position,
          scheduleId,
          status,
        },
      });

      // Sync status to user account
      if (status) {
        await tx.user.updateMany({
          where: { employeeId: id },
          data: {
            status:
              status === EmployeeStatus.ACTIVE
                ? UserStatus.ACTIVE
                : status === EmployeeStatus.SUSPENDED
                ? UserStatus.SUSPENDED
                : UserStatus.INACTIVE,
          },
        });
      }

      await createAuditLog(
        {
          actorId: req.user!.userId,
          actorType: ActorType.ADMIN,
          action: 'EMPLOYEE_UPDATED',
          entityType: 'Employee',
          entityId: id,
          metadata: { changes: req.body },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
        tx
      );

      return emp;
    });

    return sendSuccess(res, updated);
  }

  static async resetEmployeePassword(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return sendError(res, 'INVALID_PASSWORD', 'Password must be at least 6 characters.', 400);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const user = await prisma.user.findFirst({
      where: { employeeId: id },
    });

    if (!user) {
      return sendError(res, 'USER_NOT_FOUND', 'User account for this employee not found.', 404);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await createAuditLog({
      actorId: req.user!.userId,
      actorType: ActorType.ADMIN,
      action: 'EMPLOYEE_PASSWORD_RESET',
      entityType: 'User',
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendSuccess(res, { message: 'Password reset successfully.' });
  }

  // Departments
  static async getDepartments(req: AuthenticatedRequest, res: Response) {
    const departments = await prisma.department.findMany({
      include: {
        _count: { select: { employees: true } },
      },
      orderBy: { name: 'asc' },
    });
    return sendSuccess(res, departments);
  }

  static async createDepartment(req: AuthenticatedRequest, res: Response) {
    const { name, code, description } = req.body;
    const dept = await prisma.department.create({
      data: { name, code: code.toUpperCase(), description },
    });
    return sendSuccess(res, dept, 201);
  }

  // Holidays
  static async getHolidays(req: AuthenticatedRequest, res: Response) {
    const holidays = await prisma.holiday.findMany({
      orderBy: { date: 'asc' },
    });
    return sendSuccess(res, holidays);
  }

  static async createHoliday(req: AuthenticatedRequest, res: Response) {
    const { name, date, isRecurring, description } = req.body;
    const holiday = await prisma.holiday.create({
      data: { name, date, isRecurring: !!isRecurring, description },
    });
    return sendSuccess(res, holiday, 201);
  }
}
