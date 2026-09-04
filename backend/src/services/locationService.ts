import { PrismaClient, LocationStatus, LocationEventType, ActorType } from '@prisma/client';
import { TelegramService } from './telegramService.js';
import { Response } from 'express';

const prisma = new PrismaClient();

// Active SSE client connections for real-time location stream
const sseClients = new Set<Response>();

// Configurable constants for GPS security & anomaly detection
export const MAX_REASONABLE_SPEED_KMH = 120; // 120 km/h reasonable threshold for urban/suburban transit
export const MIN_ANOMALY_DISTANCE_METERS = 300; // Ignore tiny jumps within normal GPS drift

export interface LocationEvaluation {
  distanceMeters: number;
  status: LocationStatus;
  isInsideOffice: boolean;
  freshness: 'LIVE' | 'RECENT' | 'STALE';
  isAnomaly: boolean;
  anomalyReason?: string;
  estimatedSpeedKmh?: number;
}

export class LocationService {
  /**
   * Validate raw coordinates against mathematical and geographical bounds
   */
  public static validateCoordinates(latitude: number, longitude: number, accuracy: number): {
    isValid: boolean;
    error?: string;
  } {
    if (typeof latitude !== 'number' || isNaN(latitude) || latitude < -90 || latitude > 90) {
      return { isValid: false, error: 'Latitude must be a valid number between -90 and 90.' };
    }
    if (typeof longitude !== 'number' || isNaN(longitude) || longitude < -180 || longitude > 180) {
      return { isValid: false, error: 'Longitude must be a valid number between -180 and 180.' };
    }
    if (typeof accuracy !== 'number' || isNaN(accuracy) || accuracy < 0) {
      return { isValid: false, error: 'GPS accuracy must be a non-negative number.' };
    }
    return { isValid: true };
  }

  /**
   * Calculate Haversine distance between two coordinates in meters
   */
  public static calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Evaluate employee location against company office, previous coordinate sequence,
   * speed threshold, and geofence hysteresis
   */
  public static evaluateLocation(
    latitude: number,
    longitude: number,
    accuracy: number,
    recordedAt: Date,
    previousLocation?: {
      latitude: number;
      longitude: number;
      recordedAt: Date;
      status?: LocationStatus | null;
    } | LocationStatus | null,
    settings?: {
      latitude: number;
      longitude: number;
      allowedRadiusMeters: number;
      gpsAccuracyThresholdMeters: number;
      geofenceInsideBufferMeters?: number;
    }
  ): LocationEvaluation {
    const officeLat = settings?.latitude || 11.5564;
    const officeLng = settings?.longitude || 104.9282;
    // Ensure effective radius is at least 30.0 meters so employees around 30m are strictly inside office
    const radius = Math.max(settings?.allowedRadiusMeters || 100.0, 30.0);
    const accuracyThreshold = settings?.gpsAccuracyThresholdMeters || 50.0;
    const buffer = settings?.geofenceInsideBufferMeters || 10.0;

    const distanceMeters = this.calculateHaversineDistance(
      latitude,
      longitude,
      officeLat,
      officeLng
    );

    // 1. Anti-Spoofing / Impossible Travel Speed Analysis
    let isAnomaly = false;
    let anomalyReason: string | undefined;
    let estimatedSpeedKmh: number | undefined;

    let prevStatus: LocationStatus | null | undefined;

    if (previousLocation) {
      if (typeof previousLocation === 'string') {
        prevStatus = previousLocation as LocationStatus;
      } else if (typeof previousLocation === 'object' && previousLocation.recordedAt) {
        prevStatus = previousLocation.status;
        const timeDeltaSeconds =
          (recordedAt.getTime() - new Date(previousLocation.recordedAt).getTime()) / 1000;

        // Only evaluate speed for readings within 1 hour and with positive time delta
        if (timeDeltaSeconds > 0 && timeDeltaSeconds <= 3600) {
          const deltaDistanceMeters = this.calculateHaversineDistance(
            previousLocation.latitude,
            previousLocation.longitude,
            latitude,
            longitude
          );

          estimatedSpeedKmh = (deltaDistanceMeters / 1000) / (timeDeltaSeconds / 3600);

          if (
            estimatedSpeedKmh > MAX_REASONABLE_SPEED_KMH &&
            deltaDistanceMeters > MIN_ANOMALY_DISTANCE_METERS
          ) {
            isAnomaly = true;
            anomalyReason = `Impossible travel speed: ${Math.round(estimatedSpeedKmh)} km/h across ${Math.round(deltaDistanceMeters)}m in ${Math.round(timeDeltaSeconds)}s.`;
          }
        }
      }
    }

    // 2. Check GPS accuracy threshold
    if (accuracy > Math.max(accuracyThreshold * 3, 200)) {
      return {
        distanceMeters,
        status: LocationStatus.LOCATION_UNRELIABLE,
        isInsideOffice: distanceMeters <= radius,
        freshness: this.getFreshness(recordedAt),
        isAnomaly,
        anomalyReason,
        estimatedSpeedKmh,
      };
    }

    // 3. Geofence evaluation: Any reading <= 30m is guaranteed to be INSIDE_OFFICE
    let status: LocationStatus;

    if (distanceMeters <= 30.0) {
      status = LocationStatus.INSIDE_OFFICE;
    } else if (prevStatus === LocationStatus.INSIDE_OFFICE) {
      // Must move beyond radius + buffer to be considered OUTSIDE
      status =
        distanceMeters > radius + buffer
          ? LocationStatus.OUTSIDE_OFFICE
          : LocationStatus.INSIDE_OFFICE;
    } else {
      // Must move within radius - buffer (or <= 30m) to transition into INSIDE
      status =
        distanceMeters <= Math.max(radius - buffer, 30.0)
          ? LocationStatus.INSIDE_OFFICE
          : LocationStatus.OUTSIDE_OFFICE;
    }

    return {
      distanceMeters,
      status,
      isInsideOffice: status === LocationStatus.INSIDE_OFFICE,
      freshness: this.getFreshness(recordedAt),
      isAnomaly,
      anomalyReason,
      estimatedSpeedKmh,
    };
  }

  /**
   * Determine data freshness based on recorded timestamp
   */
  public static getFreshness(recordedAt: Date): 'LIVE' | 'RECENT' | 'STALE' {
    const ageMs = Date.now() - new Date(recordedAt).getTime();
    if (ageMs <= 2 * 60 * 1000) return 'LIVE'; // 0-2 mins
    if (ageMs <= 5 * 60 * 1000) return 'RECENT'; // 2-5 mins
    return 'STALE'; // 5+ mins
  }

  /**
   * Register SSE client response stream for admin live map
   */
  public static registerSSEClient(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx proxy buffering

    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', time: new Date().toISOString() })}\n\n`);
    sseClients.add(res);

    res.on('close', () => {
      sseClients.delete(res);
    });
  }

  /**
   * Broadcast real-time location event to all connected admin clients via SSE
   */
  public static broadcastLocationUpdate(payload: any): void {
    const dataString = `data: ${JSON.stringify(payload)}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(dataString);
      } catch {
        sseClients.delete(client);
      }
    }
  }

  /**
   * Process employee periodic location update with anomaly logging
   */
  public static async recordEmployeeLocation(
    employeeId: string,
    latitude: number,
    longitude: number,
    accuracy: number,
    clientRecordedAt?: Date
  ): Promise<{
    location: any;
    evaluation: LocationEvaluation;
    event?: LocationEventType;
  }> {
    // 1. Boundary check
    const validation = this.validateCoordinates(latitude, longitude, accuracy);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid coordinates.');
    }

    const settings = await prisma.companySettings.findUnique({
      where: { id: 'default' },
    });

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: true },
    });

    if (!employee) {
      throw new Error('Employee not found');
    }

    // Always use authoritative server time for database audit & history records
    const recordedAt = new Date();

    const previousLocation =
      employee.lastLatitude !== null &&
      employee.lastLongitude !== null &&
      employee.lastLocationAt !== null
        ? {
            latitude: employee.lastLatitude,
            longitude: employee.lastLongitude,
            recordedAt: employee.lastLocationAt,
            status: employee.lastLocationStatus,
          }
        : null;

    const evaluation = this.evaluateLocation(
      latitude,
      longitude,
      accuracy,
      recordedAt,
      previousLocation,
      settings || undefined
    );

    // Save location point to history
    const location = await prisma.employeeLocation.create({
      data: {
        employeeId,
        latitude,
        longitude,
        accuracy,
        distanceFromOffice: evaluation.distanceMeters,
        status: evaluation.status,
        recordedAt,
      },
    });

    // Detect office entry / exit event with hysteresis
    let generatedEvent: LocationEventType | undefined;

    if (evaluation.isAnomaly) {
      generatedEvent = LocationEventType.LOCATION_ANOMALY;

      // Create Audit Log entry for the anomaly
      await prisma.auditLog.create({
        data: {
          actorId: employee.user?.id || null,
          actorType: ActorType.EMPLOYEE,
          action: 'LOCATION_ANOMALY',
          entityType: 'EmployeeLocation',
          entityId: location.id,
          metadata: {
            employeeId,
            employeeCode: employee.employeeCode,
            displayName: employee.displayName,
            reason: evaluation.anomalyReason,
            speedKmh: evaluation.estimatedSpeedKmh,
            latitude,
            longitude,
            accuracy,
          },
        },
      });
    } else if (
      employee.lastLocationStatus === LocationStatus.OUTSIDE_OFFICE &&
      evaluation.status === LocationStatus.INSIDE_OFFICE
    ) {
      generatedEvent = LocationEventType.ENTERED_OFFICE;
    } else if (
      employee.lastLocationStatus === LocationStatus.INSIDE_OFFICE &&
      evaluation.status === LocationStatus.OUTSIDE_OFFICE
    ) {
      generatedEvent = LocationEventType.LEFT_OFFICE;
    }

    if (generatedEvent) {
      await prisma.locationEvent.create({
        data: {
          employeeId,
          type: generatedEvent,
          latitude,
          longitude,
          distanceFromOffice: evaluation.distanceMeters,
        },
      });

      // Send Telegram notification if enabled (asynchronously)
      TelegramService.notifyLocationEvent({
        employeeName: employee.displayName,
        employeeCode: employee.employeeCode,
        eventType: generatedEvent,
        distanceMeters: evaluation.distanceMeters,
        time: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Phnom_Penh',
        }),
      }).catch((err) => console.error('[LocationService] Telegram event error:', err));
    }

    // Update employee current location snapshot
    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        lastLocationStatus: evaluation.status,
        lastLocationAt: recordedAt,
        lastLatitude: latitude,
        lastLongitude: longitude,
        lastAccuracy: accuracy,
        lastDistanceMeters: evaluation.distanceMeters,
      },
    });

    // Broadcast SSE update to admin dashboard map
    this.broadcastLocationUpdate({
      type: 'LOCATION_UPDATED',
      employeeId,
      employeeName: employee.displayName,
      employeeCode: employee.employeeCode,
      latitude,
      longitude,
      accuracy,
      distanceFromOffice: evaluation.distanceMeters,
      status: evaluation.status,
      freshness: evaluation.freshness,
      recordedAt: recordedAt.toISOString(),
      event: generatedEvent,
      isAnomaly: evaluation.isAnomaly,
      anomalyReason: evaluation.anomalyReason,
    });

    return { location, evaluation, event: generatedEvent };
  }

  /**
   * Cleanup old location history records based on company retention policy
   */
  public static async cleanupOldLocations(): Promise<number> {
    try {
      const settings = await prisma.companySettings.findUnique({
        where: { id: 'default' },
      });

      const retentionDays = settings?.locationRetentionDays || 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await prisma.employeeLocation.deleteMany({
        where: {
          recordedAt: {
            lt: cutoffDate,
          },
        },
      });

      return result.count;
    } catch (err) {
      console.error('[LocationService] Cleanup error:', err);
      return 0;
    }
  }
}
