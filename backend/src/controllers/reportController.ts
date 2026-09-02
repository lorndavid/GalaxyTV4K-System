import { Response } from 'express';
import { sendSuccess } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { ReportService } from '../services/reportService.js';
import { AttendanceStatus } from '@prisma/client';

export class ReportController {
  static async getAttendanceSummary(req: AuthenticatedRequest, res: Response) {
    const { startDate, endDate, departmentId } = req.query;

    const summary = await ReportService.getAttendanceSummaryReport({
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
      departmentId: departmentId ? String(departmentId) : undefined,
    });

    return sendSuccess(res, summary);
  }

  static async getAttendanceReport(req: AuthenticatedRequest, res: Response) {
    const { startDate, endDate, departmentId, employeeId, status } = req.query;

    const records = await ReportService.getAttendanceReport({
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
      departmentId: departmentId ? String(departmentId) : undefined,
      employeeId: employeeId ? String(employeeId) : undefined,
      status: status ? (status as AttendanceStatus) : undefined,
    });

    return sendSuccess(res, records);
  }

  static async exportCsv(req: AuthenticatedRequest, res: Response) {
    const { startDate, endDate, departmentId, employeeId, status } = req.query;

    const records = await ReportService.getAttendanceReport({
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
      departmentId: departmentId ? String(departmentId) : undefined,
      employeeId: employeeId ? String(employeeId) : undefined,
      status: status ? (status as AttendanceStatus) : undefined,
    });

    const csv = await ReportService.generateAttendanceCsv(records);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="attendance-report-${new Date().toISOString().substring(0, 10)}.csv"`
    );
    return res.send(csv);
  }
}
