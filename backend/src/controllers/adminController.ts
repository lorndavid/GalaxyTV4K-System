import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/prisma.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { ReportService } from '../services/reportService.js';
import { EmployeeStatus, UserRole, UserStatus, ActorType } from '@prisma/client';
import { createAuditLog } from '../utils/audit.js';
import { TelegramService } from '../services/telegramService.js';

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
        { khmerName: { contains: String(search), mode: 'insensitive' } },
        { latinName: { contains: String(search), mode: 'insensitive' } },
        { skill: { contains: String(search), mode: 'insensitive' } },
        { phone: { contains: String(search), mode: 'insensitive' } },
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
      khmerName,
      latinName,
      gender,
      skill,
      studyDay,
      phone,
      position = 'Staff',
      departmentId,
      scheduleId,
      employeeCode,
      firstName,
      lastName,
      displayName,
      email,
      hireDate,
      initialPassword,
      role = UserRole.EMPLOYEE,
    } = req.body;

    // Generate clean employee code if not provided
    let finalCode = employeeCode?.trim();
    if (!finalCode) {
      const count = await prisma.employee.count();
      finalCode = `EMP-${String(count + 1).padStart(3, '0')}`;
    }

    // Generate clean unique email if not provided
    let finalEmail = email?.toLowerCase().trim();
    if (!finalEmail) {
      const sanitizedLatin = (latinName || 'employee')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '.');
      finalEmail = `${sanitizedLatin}.${finalCode.toLowerCase().replace(/[^a-z0-9]/g, '')}@galaxytv4k.com`;
    }

    // Determine clean display name
    const finalDisplayName = khmerName?.trim() || latinName?.trim() || displayName?.trim() || `${firstName || ''} ${lastName || ''}`.trim() || 'Employee';

    const existing = await prisma.employee.findFirst({
      where: {
        OR: [{ email: finalEmail }, { employeeCode: finalCode }],
      },
    });

    if (existing) {
      return sendError(res, 'DUPLICATE_EMPLOYEE', 'Employee with this email or code already exists.', 400);
    }

    const passwordHash = await bcrypt.hash(initialPassword || 'Employee@123456', 10);
    const currentYear = new Date().getFullYear();

    const result = await prisma.$transaction(async (tx) => {
      const employee = await tx.employee.create({
        data: {
          employeeCode: finalCode,
          firstName: firstName || '',
          lastName: lastName || '',
          displayName: finalDisplayName,
          khmerName: khmerName?.trim() || null,
          latinName: latinName?.trim() || null,
          gender: gender?.trim() || null,
          skill: skill?.trim() || null,
          studyDay: studyDay?.trim() || null,
          email: finalEmail,
          phone: phone?.trim() || null,
          position: position?.trim() || 'Staff',
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
          actorId: req.user?.userId,
          actorType: ActorType.ADMIN,
          action: 'EMPLOYEE_CREATED',
          entityType: 'Employee',
          entityId: employee.id,
          metadata: {
            employeeCode: finalCode,
            khmerName,
            latinName,
            gender,
            skill,
            studyDay,
            phone,
            position,
            email: employee.email,
          },
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
      khmerName,
      latinName,
      gender,
      skill,
      studyDay,
      firstName,
      lastName,
      displayName,
      email,
      phone,
      departmentId,
      position,
      scheduleId,
      status,
      shiftType,
      checkInStartTime,
      checkInDeadline,
      workEndTime,
      studyClassInfo,
    } = req.body;

    const finalDisplayName = khmerName?.trim() || latinName?.trim() || displayName?.trim();

    const existing = await prisma.employee.findUnique({
      where: { id },
      include: { department: true },
    });

    const updated = await prisma.$transaction(async (tx) => {
      const emp = await tx.employee.update({
        where: { id },
        data: {
          khmerName: khmerName !== undefined ? (khmerName?.trim() || null) : undefined,
          latinName: latinName !== undefined ? (latinName?.trim() || null) : undefined,
          gender: gender !== undefined ? (gender?.trim() || null) : undefined,
          skill: skill !== undefined ? (skill?.trim() || null) : undefined,
          studyDay: studyDay !== undefined ? (studyDay?.trim() || null) : undefined,
          shiftType: shiftType !== undefined ? (shiftType?.trim() || 'STANDARD') : undefined,
          checkInStartTime: checkInStartTime !== undefined ? (checkInStartTime?.trim() || '08:00') : undefined,
          checkInDeadline: checkInDeadline !== undefined ? (checkInDeadline?.trim() || '08:00') : undefined,
          workEndTime: workEndTime !== undefined ? (workEndTime?.trim() || '17:30') : undefined,
          studyClassInfo: studyClassInfo !== undefined ? (studyClassInfo?.trim() || null) : undefined,
          firstName: firstName !== undefined ? firstName : undefined,
          lastName: lastName !== undefined ? lastName : undefined,
          displayName: finalDisplayName || undefined,
          email: email ? email.toLowerCase().trim() : undefined,
          phone: phone !== undefined ? (phone?.trim() || null) : undefined,
          departmentId: departmentId !== undefined ? (departmentId || null) : undefined,
          position: position !== undefined ? position : undefined,
          scheduleId: scheduleId !== undefined ? (scheduleId || null) : undefined,
          status: status !== undefined ? status : undefined,
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
          actorId: req.user?.userId,
          actorType: ActorType.ADMIN,
          action: 'EMPLOYEE_UPDATED',
          entityType: 'Employee',
          entityId: id,
          metadata: { khmerName, latinName, gender, skill, studyDay, position, status },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
        tx
      );

      return emp;
    });

    // Detect changed fields and notify Telegram asynchronously
    const changedFields: string[] = [];
    if (studyDay !== undefined && studyDay?.trim() !== (existing?.studyDay || '').trim()) {
      changedFields.push('ថ្ងៃរៀន (Study Day)');
    }
    if (shiftType !== undefined && shiftType !== existing?.shiftType) {
      changedFields.push('វេនការងារ (Shift)');
    }
    if (checkInDeadline !== undefined && checkInDeadline !== existing?.checkInDeadline) {
      changedFields.push(`ម៉ោងចូល (${checkInDeadline})`);
    }
    if (status !== undefined && status !== existing?.status) {
      changedFields.push('ស្ថានភាព (Status)');
    }
    if (position !== undefined && position?.trim() !== (existing?.position || '').trim()) {
      changedFields.push('តួនាទី (Position)');
    }
    if (departmentId !== undefined && departmentId !== existing?.departmentId) {
      changedFields.push('ផ្នែក (Department)');
    }
    if (khmerName !== undefined && khmerName?.trim() !== (existing?.khmerName || '').trim()) {
      changedFields.push('ឈ្មោះ (Name)');
    }
    if (phone !== undefined && phone?.trim() !== (existing?.phone || '').trim()) {
      changedFields.push('លេខទូរសព្ទ (Phone)');
    }

    if (changedFields.length > 0) {
      prisma.employee
        .findUnique({
          where: { id },
          include: { department: true },
        })
        .then((fullEmp) => {
          if (fullEmp) {
            TelegramService.notifyEmployeeUpdated({
              employeeName: fullEmp.khmerName || fullEmp.displayName || 'Employee',
              employeeCode: fullEmp.employeeCode,
              department: fullEmp.department?.name,
              position: fullEmp.position,
              status: fullEmp.status,
              studyDay: fullEmp.studyDay,
              changedFields,
              updatedBy: req.user?.email || 'Admin',
            }).catch((err) => console.error('[Telegram] notifyEmployeeUpdated error:', err));
          }
        })
        .catch(() => {});
    }

    return sendSuccess(res, updated);
  }

  static async resetPassword(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { newPassword } = req.body;

    const tempPassword = newPassword || `Emp@${Math.floor(100000 + Math.random() * 900000)}`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const user = await prisma.user.findFirst({
      where: { employeeId: id },
    });

    if (!user) return sendError(res, 'USER_NOT_FOUND', 'User account not found for this employee.', 404);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await createAuditLog({
      actorId: req.user?.userId,
      actorType: ActorType.ADMIN,
      action: 'PASSWORD_RESET',
      entityType: 'User',
      entityId: user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return sendSuccess(res, { temporaryPassword: tempPassword });
  }

  static async deleteEmployee(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const adminId = req.user?.userId;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!employee) {
      return sendError(res, 'EMPLOYEE_NOT_FOUND', 'Employee not found.', 404);
    }

    // Safety guard: Prevent deleting yourself
    if (adminId && employee.user?.id === adminId) {
      return sendError(res, 'CANNOT_DELETE_SELF', 'You cannot delete your own administrative account.', 400);
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete associated user account and sessions
      if (employee.user) {
        await tx.session.deleteMany({
          where: { userId: employee.user.id },
        });
        await tx.user.delete({
          where: { id: employee.user.id },
        });
      }

      // 2. Cascade delete related records
      await tx.attendance.deleteMany({ where: { employeeId: id } });
      await tx.leaveBalance.deleteMany({ where: { employeeId: id } });
      await tx.leaveRequest.deleteMany({ where: { employeeId: id } });
      await tx.outRequest.deleteMany({ where: { employeeId: id } });
      await tx.employeeLocation.deleteMany({ where: { employeeId: id } });
      await tx.locationEvent.deleteMany({ where: { employeeId: id } });

      // 3. Delete Employee record
      await tx.employee.delete({
        where: { id },
      });

      // 4. Record Audit Log
      await createAuditLog(
        {
          actorId: adminId || null,
          actorType: ActorType.ADMIN,
          action: 'EMPLOYEE_DELETED',
          entityType: 'Employee',
          entityId: id,
          metadata: {
            employeeCode: employee.employeeCode,
            displayName: employee.displayName,
            email: employee.email,
          },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
        tx
      );
    });

    return sendSuccess(res, { id, message: 'Employee and all associated records deleted successfully.' });
  }

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
      data: { name, code, description },
    });

    return sendSuccess(res, dept, 201);
  }

  static async seedOfficialEmployees(req: AuthenticatedRequest, res: Response) {
    try {
      const { seedOfficialEmployees } = await import('../services/seedEmployeesService.js');
      const result = await seedOfficialEmployees(prisma);
      return sendSuccess(res, result);
    } catch (error: any) {
      return sendError(res, 'SEED_ERROR', error?.message || 'Failed to seed official employees.', 500);
    }
  }
}
