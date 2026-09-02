import { Request, Response } from 'express';
import { PrismaClient, LocationStatus } from '@prisma/client';
import { LocationService } from '../services/locationService';
import { z } from 'zod';

const prisma = new PrismaClient();

const locationUpdateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(50000),
  recordedAt: z.string().optional(),
});

export class LocationController {
  /**
   * Employee sends periodic location update
   */
  public static async updateLocation(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      if (!user || !user.employeeId) {
        res.status(403).json({ success: false, error: { message: 'Only employees can submit location updates.' } });
        return;
      }

      const parsed = locationUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, error: { message: 'Invalid location coordinates or accuracy.', details: parsed.error.format() } });
        return;
      }

      const employee = await prisma.employee.findUnique({
        where: { id: user.employeeId },
      });

      if (!employee || employee.status !== 'ACTIVE') {
        res.status(403).json({ success: false, error: { message: 'Employee account is not active.' } });
        return;
      }

      // If employee has disabled location sharing, reject
      if (!employee.isLocationSharingActive) {
        res.status(400).json({ success: false, error: { message: 'Location sharing is disabled in your profile settings.' } });
        return;
      }

      const clientTimestamp = parsed.data.recordedAt ? new Date(parsed.data.recordedAt) : new Date();

      const result = await LocationService.recordEmployeeLocation(
        user.employeeId,
        parsed.data.latitude,
        parsed.data.longitude,
        parsed.data.accuracy,
        clientTimestamp
      );

      res.status(200).json({
        success: true,
        data: {
          distanceFromOffice: Math.round(result.evaluation.distanceMeters),
          status: result.evaluation.status,
          isInsideOffice: result.evaluation.isInsideOffice,
          freshness: result.evaluation.freshness,
          recordedAt: result.location.recordedAt,
        },
      });
    } catch (err: any) {
      console.error('[LocationController] updateLocation error:', err);
      res.status(500).json({ success: false, error: { message: err?.message || 'Failed to record location update.' } });
    }
  }

  /**
   * Employee checks own location sharing state
   */
  public static async getMyLocation(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      if (!user || !user.employeeId) {
        res.status(403).json({ success: false, error: { message: 'Employee account required.' } });
        return;
      }

      const employee = await prisma.employee.findUnique({
        where: { id: user.employeeId },
        select: {
          id: true,
          displayName: true,
          isLocationSharingActive: true,
          lastLocationStatus: true,
          lastLocationAt: true,
          lastLatitude: true,
          lastLongitude: true,
          lastAccuracy: true,
          lastDistanceMeters: true,
        },
      });

      if (!employee) {
        res.status(404).json({ success: false, error: { message: 'Employee not found.' } });
        return;
      }

      const settings = await prisma.companySettings.findUnique({
        where: { id: 'default' },
      });

      const freshness = employee.lastLocationAt
        ? LocationService.getFreshness(employee.lastLocationAt)
        : 'STALE';

      res.status(200).json({
        success: true,
        data: {
          isLocationSharingActive: employee.isLocationSharingActive,
          lastLocation: {
            latitude: employee.lastLatitude,
            longitude: employee.lastLongitude,
            accuracy: employee.lastAccuracy,
            distanceFromOffice: employee.lastDistanceMeters ? Math.round(employee.lastDistanceMeters) : null,
            status: employee.lastLocationStatus || LocationStatus.LOCATION_INACTIVE,
            recordedAt: employee.lastLocationAt,
            freshness,
          },
          companyOffice: {
            name: settings?.companyName,
            latitude: settings?.latitude,
            longitude: settings?.longitude,
            radiusMeters: settings?.allowedRadiusMeters,
            updateIntervalSeconds: settings?.locationUpdateIntervalSeconds || 60,
          },
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { message: 'Failed to retrieve location status.' } });
    }
  }

  /**
   * Employee toggles location sharing consent
   */
  public static async toggleSharing(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      if (!user || !user.employeeId) {
        res.status(403).json({ success: false, error: { message: 'Employee account required.' } });
        return;
      }

      const { active } = req.body;
      const updated = await prisma.employee.update({
        where: { id: user.employeeId },
        data: {
          isLocationSharingActive: Boolean(active),
          ...(!active ? { lastLocationStatus: LocationStatus.LOCATION_INACTIVE } : {}),
        },
      });

      res.status(200).json({
        success: true,
        data: {
          isLocationSharingActive: updated.isLocationSharingActive,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { message: 'Failed to update location sharing consent.' } });
    }
  }

  /**
   * Admin: List all employees with live location status
   */
  public static async getAdminEmployeesLocation(req: Request, res: Response): Promise<void> {
    try {
      const employees = await prisma.employee.findMany({
        where: { status: 'ACTIVE' },
        include: {
          department: true,
        },
        orderBy: { displayName: 'asc' },
      });

      const settings = await prisma.companySettings.findUnique({
        where: { id: 'default' },
      });

      const list = employees.map((emp) => {
        let status = emp.lastLocationStatus || LocationStatus.LOCATION_UNKNOWN;
        let freshness: 'LIVE' | 'RECENT' | 'STALE' = 'STALE';

        if (!emp.isLocationSharingActive) {
          status = LocationStatus.LOCATION_INACTIVE;
        } else if (emp.lastLocationAt) {
          freshness = LocationService.getFreshness(emp.lastLocationAt);
          if (freshness === 'STALE' && status === LocationStatus.INSIDE_OFFICE) {
            status = LocationStatus.LOCATION_STALE;
          }
        }

        return {
          id: emp.id,
          employeeCode: emp.employeeCode,
          displayName: emp.displayName,
          department: emp.department?.name || 'General',
          isLocationSharingActive: emp.isLocationSharingActive,
          latitude: emp.lastLatitude,
          longitude: emp.lastLongitude,
          accuracy: emp.lastAccuracy ? Math.round(emp.lastAccuracy) : null,
          distanceFromOffice: emp.lastDistanceMeters ? Math.round(emp.lastDistanceMeters) : null,
          status,
          freshness,
          lastUpdated: emp.lastLocationAt,
        };
      });

      res.status(200).json({
        success: true,
        data: {
          employees: list,
          companyOffice: {
            name: settings?.companyName || 'Company HQ',
            latitude: settings?.latitude || 11.5564,
            longitude: settings?.longitude || 104.9282,
            radiusMeters: settings?.allowedRadiusMeters || 100,
            accuracyThresholdMeters: settings?.gpsAccuracyThresholdMeters || 50,
          },
        },
      });
    } catch (err: any) {
      console.error('[LocationController] getAdminEmployeesLocation error:', err);
      res.status(500).json({ success: false, error: { message: 'Failed to retrieve employee locations.' } });
    }
  }

  /**
   * Admin: Get single employee location history
   */
  public static async getAdminLocationHistory(req: Request, res: Response): Promise<void> {
    try {
      const { employeeId } = req.params;
      const { date, limit } = req.query;

      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { id: true, displayName: true, employeeCode: true },
      });

      if (!employee) {
        res.status(404).json({ success: false, error: { message: 'Employee not found.' } });
        return;
      }

      const whereClause: any = { employeeId };

      if (date && typeof date === 'string') {
        const start = new Date(`${date}T00:00:00.000Z`);
        const end = new Date(`${date}T23:59:59.999Z`);
        whereClause.recordedAt = { gte: start, lte: end };
      }

      const history = await prisma.employeeLocation.findMany({
        where: whereClause,
        orderBy: { recordedAt: 'desc' },
        take: limit ? parseInt(limit as string, 10) : 200,
      });

      const events = await prisma.locationEvent.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      res.status(200).json({
        success: true,
        data: {
          employee,
          history: history.map((h) => ({
            id: h.id,
            latitude: h.latitude,
            longitude: h.longitude,
            accuracy: Math.round(h.accuracy),
            distanceFromOffice: Math.round(h.distanceFromOffice),
            status: h.status,
            recordedAt: h.recordedAt,
          })),
          events,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: { message: 'Failed to retrieve location history.' } });
    }
  }

  /**
   * Admin: Server-Sent Events (SSE) Live Stream
   */
  public static streamLocations(req: Request, res: Response): void {
    LocationService.registerSSEClient(res);
  }
}
