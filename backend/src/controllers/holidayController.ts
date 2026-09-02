import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class HolidayController {
  public static async list(req: Request, res: Response): Promise<void> {
    try {
      const holidays = await prisma.holiday.findMany({
        orderBy: { date: 'asc' },
      });
      res.status(200).json({ success: true, data: holidays });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { message: 'Failed to list holidays.' } });
    }
  }

  public static async create(req: Request, res: Response): Promise<void> {
    try {
      const { name, date, isRecurring, description } = req.body;
      if (!name || !date) {
        res.status(400).json({ success: false, error: { message: 'Name and date (YYYY-MM-DD) are required.' } });
        return;
      }

      const holiday = await prisma.holiday.create({
        data: {
          name: name.trim(),
          date: date.trim(),
          isRecurring: Boolean(isRecurring),
          description: description?.trim(),
        },
      });

      res.status(201).json({ success: true, data: holiday });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { message: err?.message || 'Failed to create holiday.' } });
    }
  }

  public static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, date, isRecurring, description } = req.body;

      const holiday = await prisma.holiday.update({
        where: { id },
        data: {
          name: name?.trim(),
          date: date?.trim(),
          isRecurring: isRecurring !== undefined ? Boolean(isRecurring) : undefined,
          description: description?.trim(),
        },
      });

      res.status(200).json({ success: true, data: holiday });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { message: 'Failed to update holiday.' } });
    }
  }

  public static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await prisma.holiday.delete({ where: { id } });
      res.status(200).json({ success: true, message: 'Holiday deleted.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { message: 'Failed to delete holiday.' } });
    }
  }
}
