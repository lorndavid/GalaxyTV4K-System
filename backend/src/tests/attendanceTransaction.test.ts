import { describe, it, expect } from 'vitest';
import { AttendanceService } from '../services/attendanceService.js';
import { QrService } from '../services/qrService.js';
import { validateGeofence } from '../utils/geo.js';

describe('Attendance Transaction Integrity & Signal Validation', () => {
  const companyHQ = {
    latitude: 11.5564,
    longitude: 104.9282,
    allowedRadiusMeters: 100.0,
    gpsAccuracyThresholdMeters: 50.0,
  };

  describe('Geofence & Multi-Signal Independent Verification', () => {
    it('verifies that location coordinates within 100m are accepted', () => {
      // 0.0003 deg latitude offset is approx 33 meters
      const clientLat = 11.5564 + 0.0003;
      const clientLng = 104.9282;
      const accuracy = 12.0;

      const result = validateGeofence(
        clientLat,
        clientLng,
        accuracy,
        companyHQ.latitude,
        companyHQ.longitude,
        companyHQ.allowedRadiusMeters,
        companyHQ.gpsAccuracyThresholdMeters
      );

      expect(result.isWithinGeofence).toBe(true);
      expect(result.isAccuracyAcceptable).toBe(true);
      expect(result.distanceMeters).toBeLessThan(100);
    });

    it('rejects coordinates outside the allowed radius (e.g. 250m away)', () => {
      // 0.0025 deg offset is approx 275 meters
      const clientLat = 11.5564 + 0.0025;
      const clientLng = 104.9282;
      const accuracy = 15.0;

      const result = validateGeofence(
        clientLat,
        clientLng,
        accuracy,
        companyHQ.latitude,
        companyHQ.longitude,
        companyHQ.allowedRadiusMeters,
        companyHQ.gpsAccuracyThresholdMeters
      );

      expect(result.isWithinGeofence).toBe(false);
      expect(result.distanceMeters).toBeGreaterThan(100);
    });

    it('rejects degraded GPS accuracy (>50m threshold)', () => {
      const clientLat = 11.5564;
      const clientLng = 104.9282;
      const poorAccuracy = 85.0; // 85m is worse than 50m threshold

      const result = validateGeofence(
        clientLat,
        clientLng,
        poorAccuracy,
        companyHQ.latitude,
        companyHQ.longitude,
        companyHQ.allowedRadiusMeters,
        companyHQ.gpsAccuracyThresholdMeters
      );

      expect(result.isAccuracyAcceptable).toBe(false);
    });
  });

  describe('QR Dynamic Token Security', () => {
    it('generates cryptographic, high-entropy tokens and valid SHA-256 hashes', () => {
      const token1 = QrService.generateToken();
      const token2 = QrService.generateToken();

      expect(token1).toHaveLength(64); // 32 random bytes in hex
      expect(token2).toHaveLength(64);
      expect(token1).not.toBe(token2);

      const hash1 = QrService.hashToken(token1);
      const hash2 = QrService.hashToken(token2);

      expect(hash1).toHaveLength(64);
      expect(hash2).toHaveLength(64);
      expect(hash1).not.toBe(hash2);

      // Verify determinism of hash
      expect(QrService.hashToken(token1)).toBe(hash1);
    });
  });
});
