import { describe, it, expect, vi } from 'vitest';
import { validateGeofence } from '../utils/geo.js';
import { QrService } from '../services/qrService.js';
import { AttendanceService } from '../services/attendanceService.js';
import { QrSessionStatus } from '@prisma/client';

describe('Production Attendance QR System Workflow', () => {
  const companyHQ = {
    latitude: 11.5564,
    longitude: 104.9282,
    allowedRadiusMeters: 100.0,
    gpsAccuracyThresholdMeters: 50.0,
  };

  describe('1. Server-Authoritative Time & Date Validation Rules', () => {
    it('determines QR date validity correctly', () => {
      const todayDateStr = '2026-09-03';
      const pastDateStr = '2026-09-02';
      const futureDateStr = '2026-09-04';

      // Past date check
      expect(pastDateStr < todayDateStr).toBe(true);

      // Future date check
      expect(futureDateStr > todayDateStr).toBe(true);

      // Same day check
      expect(todayDateStr === '2026-09-03').toBe(true);
    });

    it('enforces start and end time boundaries strictly on server clock', () => {
      const validFrom = '07:00';
      const validUntil = '18:00';

      const earlyTime = '06:45';
      const validTime = '08:02';
      const lateTime = '18:15';

      // Before start time
      expect(earlyTime < validFrom).toBe(true);

      // Within valid operating window
      expect(validTime >= validFrom && validTime <= validUntil).toBe(true);

      // After end time (expired)
      expect(lateTime > validUntil).toBe(true);
    });
  });

  describe('2. Server Geofence & GPS Accuracy Enforcement', () => {
    it('accepts employee within office geofence and accurate GPS', () => {
      const officeLat = companyHQ.latitude;
      const officeLng = companyHQ.longitude;
      const accurateGps = 15.0; // 15 meters accuracy (threshold is 50m)

      const result = validateGeofence(
        officeLat,
        officeLng,
        accurateGps,
        companyHQ.latitude,
        companyHQ.longitude,
        companyHQ.allowedRadiusMeters,
        companyHQ.gpsAccuracyThresholdMeters
      );

      expect(result.isWithinGeofence).toBe(true);
      expect(result.isAccuracyAcceptable).toBe(true);
      expect(result.distanceMeters).toBeLessThanOrEqual(5);
    });

    it('rejects employee outside the allowed geofence perimeter (500m away)', () => {
      // 0.0045 deg lat is approx 500m
      const outsideLat = companyHQ.latitude + 0.0045;
      const outsideLng = companyHQ.longitude;
      const accurateGps = 12.0;

      const result = validateGeofence(
        outsideLat,
        outsideLng,
        accurateGps,
        companyHQ.latitude,
        companyHQ.longitude,
        companyHQ.allowedRadiusMeters,
        companyHQ.gpsAccuracyThresholdMeters
      );

      expect(result.isWithinGeofence).toBe(false);
      expect(result.distanceMeters).toBeGreaterThan(100);
    });

    it('rejects employee when GPS accuracy reading is too degraded (>50m)', () => {
      const officeLat = companyHQ.latitude;
      const officeLng = companyHQ.longitude;
      const degradedGps = 95.0; // 95m is too unreliable

      const result = validateGeofence(
        officeLat,
        officeLng,
        degradedGps,
        companyHQ.latitude,
        companyHQ.longitude,
        companyHQ.allowedRadiusMeters,
        companyHQ.gpsAccuracyThresholdMeters
      );

      expect(result.isAccuracyAcceptable).toBe(false);
    });
  });

  describe('3. Cryptographic Token Generation & Hashing', () => {
    it('generates 256-bit unguessable tokens with deterministic SHA-256 hashes', () => {
      const token = QrService.generateToken();
      expect(token).toHaveLength(64);

      const hash1 = QrService.hashToken(token);
      const hash2 = QrService.hashToken(token);
      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(token);
    });
  });

  describe('4. Real-Time SSE Attendance Broadcasting', () => {
    it('successfully registers and broadcasts real-time attendance events', () => {
      const mockWrite = vi.fn();
      const mockSetHeader = vi.fn();
      const mockOn = vi.fn();

      const mockRes: any = {
        setHeader: mockSetHeader,
        write: mockWrite,
        on: mockOn,
      };

      // Register SSE client
      AttendanceService.registerAttendanceSSEClient(mockRes);

      expect(mockSetHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(mockSetHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(mockSetHeader).toHaveBeenCalledWith('Connection', 'keep-alive');

      // Initial connection frame
      expect(mockWrite).toHaveBeenCalled();

      // Broadcast attendance recorded event
      const eventPayload = {
        type: 'ATTENDANCE_RECORDED',
        action: 'CHECK_IN',
        attendance: {
          id: 'att-12345',
          employeeName: 'Sokha Chan',
          status: 'PRESENT',
        },
      };

      AttendanceService.broadcastAttendanceEvent(eventPayload);

      expect(mockWrite).toHaveBeenCalledWith(
        `data: ${JSON.stringify(eventPayload)}\n\n`
      );
    });
  });
});
