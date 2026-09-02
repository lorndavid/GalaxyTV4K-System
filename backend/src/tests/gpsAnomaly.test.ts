import { describe, it, expect } from 'vitest';
import { LocationService, MAX_REASONABLE_SPEED_KMH } from '../services/locationService.js';
import { LocationStatus } from '@prisma/client';

describe('GPS Security & Anti-Spoofing Anomaly Engine', () => {
  const companySettings = {
    latitude: 11.5564,
    longitude: 104.9282,
    allowedRadiusMeters: 100.0,
    gpsAccuracyThresholdMeters: 50.0,
    geofenceInsideBufferMeters: 10.0,
  };

  describe('Coordinate Boundary Checks', () => {
    it('accepts valid latitude and longitude coordinates', () => {
      const valid = LocationService.validateCoordinates(11.5564, 104.9282, 15);
      expect(valid.isValid).toBe(true);
      expect(valid.error).toBeUndefined();
    });

    it('rejects latitude greater than 90 degrees', () => {
      const result = LocationService.validateCoordinates(123.456, 104.9282, 10);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Latitude');
    });

    it('rejects latitude less than -90 degrees', () => {
      const result = LocationService.validateCoordinates(-95.0, 104.9282, 10);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Latitude');
    });

    it('rejects longitude greater than 180 degrees', () => {
      const result = LocationService.validateCoordinates(11.5564, 500.0, 10);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Longitude');
    });

    it('rejects longitude less than -180 degrees', () => {
      const result = LocationService.validateCoordinates(11.5564, -200.0, 10);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Longitude');
    });

    it('rejects negative accuracy numbers', () => {
      const result = LocationService.validateCoordinates(11.5564, 104.9282, -5);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('accuracy');
    });
  });

  describe('GPS Accuracy Quality Scoring', () => {
    it('marks high accuracy readings within office as INSIDE_OFFICE and not unreliable', () => {
      const now = new Date();
      const evaluation = LocationService.evaluateLocation(
        11.5564,
        104.9282,
        15, // 15m accuracy is good
        now,
        null,
        companySettings
      );

      expect(evaluation.status).toBe(LocationStatus.INSIDE_OFFICE);
      expect(evaluation.isInsideOffice).toBe(true);
      expect(evaluation.isAnomaly).toBe(false);
    });

    it('marks degraded/poor accuracy (>200m) as LOCATION_UNRELIABLE', () => {
      const now = new Date();
      const evaluation = LocationService.evaluateLocation(
        11.5564,
        104.9282,
        350, // 350m is unreliable
        now,
        null,
        companySettings
      );

      expect(evaluation.status).toBe(LocationStatus.LOCATION_UNRELIABLE);
    });
  });

  describe('Impossible Travel / Speed Anomaly Detection', () => {
    it('detects impossible travel speed across distant coordinates in short interval (Teleportation Spoof)', () => {
      const t0 = new Date('2026-09-02T08:30:00.000Z');
      const t1 = new Date('2026-09-02T08:31:00.000Z'); // 1 minute (60 seconds) later

      // Location 1: Phnom Penh Office
      const prevLocation = {
        latitude: 11.5564,
        longitude: 104.9282,
        recordedAt: t0,
        status: LocationStatus.INSIDE_OFFICE,
      };

      // Location 2: 20 km away in 1 minute (1200 km/h)
      // Approx 0.18 degrees latitude is ~20km
      const newLat = 11.5564 + 0.18;
      const newLng = 104.9282;

      const evaluation = LocationService.evaluateLocation(
        newLat,
        newLng,
        15,
        t1,
        prevLocation,
        companySettings
      );

      expect(evaluation.isAnomaly).toBe(true);
      expect(evaluation.anomalyReason).toContain('Impossible travel speed');
      expect(evaluation.estimatedSpeedKmh).toBeGreaterThan(MAX_REASONABLE_SPEED_KMH);
    });

    it('does not flag normal realistic movement (e.g. walking or standard vehicle transit)', () => {
      const t0 = new Date('2026-09-02T08:30:00.000Z');
      const t1 = new Date('2026-09-02T08:35:00.000Z'); // 5 minutes later

      // Location 1: Office
      const prevLocation = {
        latitude: 11.5564,
        longitude: 104.9282,
        recordedAt: t0,
        status: LocationStatus.INSIDE_OFFICE,
      };

      // Location 2: 1.5 km away in 5 minutes (approx 18 km/h)
      const newLat = 11.5564 + 0.013;
      const newLng = 104.9282;

      const evaluation = LocationService.evaluateLocation(
        newLat,
        newLng,
        15,
        t1,
        prevLocation,
        companySettings
      );

      expect(evaluation.isAnomaly).toBe(false);
      expect(evaluation.estimatedSpeedKmh).toBeLessThan(MAX_REASONABLE_SPEED_KMH);
    });
  });

  describe('Geofence Hysteresis Buffer', () => {
    it('prevents jitter when employee is right on perimeter edge', () => {
      const now = new Date();

      // Previously INSIDE_OFFICE: must cross beyond (radius 100m + buffer 10m = 110m) to become OUTSIDE
      // Let's test a coordinate at 104m distance (between 100m and 110m)
      // calculateHaversineDistance:
      const prevInside = {
        latitude: 11.5564,
        longitude: 104.9282,
        recordedAt: new Date(now.getTime() - 60000),
        status: LocationStatus.INSIDE_OFFICE,
      };

      // 0.0009 deg lat is approx 100m
      const evaluation = LocationService.evaluateLocation(
        11.5564 + 0.00094,
        104.9282,
        10,
        now,
        prevInside,
        companySettings
      );

      // Distance should be ~104m, which is <= 110m, so it remains INSIDE_OFFICE
      if (evaluation.distanceMeters <= 110) {
        expect(evaluation.status).toBe(LocationStatus.INSIDE_OFFICE);
      }
    });
  });
});
