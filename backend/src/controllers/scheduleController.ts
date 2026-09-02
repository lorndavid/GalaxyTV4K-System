import { Response } from 'express';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { ScheduleService } from '../services/scheduleService.js';

export class ScheduleController {
  static async list(req: AuthenticatedRequest, res: Response) {
    const schedules = await ScheduleService.getAllSchedules();
    return sendSuccess(res, schedules);
  }

  static async getById(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const schedule = await ScheduleService.getScheduleById(id);
    if (!schedule) return sendError(res, 'NOT_FOUND', 'Schedule not found', 404);
    return sendSuccess(res, schedule);
  }

  static async create(req: AuthenticatedRequest, res: Response) {
    const { name, description, timezone, isDefault, days } = req.body;
    if (!name || !days || !Array.isArray(days)) {
      return sendError(res, 'INVALID_INPUT', 'Schedule name and days configuration are required.', 400);
    }

    const schedule = await ScheduleService.createSchedule({
      name,
      description,
      timezone,
      isDefault,
      days,
      adminUserId: req.user!.userId,
    });

    return sendSuccess(res, schedule, 201);
  }

  static async update(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { name, description, timezone, isDefault, days } = req.body;

    const schedule = await ScheduleService.updateSchedule(id, {
      name,
      description,
      timezone,
      isDefault,
      days,
      adminUserId: req.user!.userId,
    });

    return sendSuccess(res, schedule);
  }

  static async recalculate(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return sendError(res, 'DATE_RANGE_REQUIRED', 'Start date and end date are required for recalculation.', 400);
    }

    try {
      const result = await ScheduleService.recalculateAttendance({
        scheduleId: id,
        startDate,
        endDate,
        adminUserId: req.user!.userId,
      });

      return sendSuccess(res, result);
    } catch (err: any) {
      return sendError(res, err.code || 'RECALCULATION_FAILED', err.message, err.status || 400);
    }
  }
}
