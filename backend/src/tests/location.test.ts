import { describe, it, expect } from 'vitest';
import { LocationService } from '../services/locationService';
import { LocationStatus } from '@prisma/client';

describe('LocationService & Geofencing Tests', () => {
  const companyLat = 11.5564;
  const companyLng = 104.9282;
  const radius = 100.0;
  const accuracyThreshold = 50.0;

  it('calculates accurate Haversine distance', () => {
    // Exact same coordinates -> 0 meters
    const distZero = LocationService.calculateHaversineDistance(
      companyLat,
      companyLng,
      companyLat,
      companyLng
    );
    expect(distZero).toBe(0);

    // Coordinate ~50m away
    const dist50m = LocationService.calculateHaversineDistance(
      companyLat,
      companyLng,
      companyLat + 0.00045,
      companyLng
    );
    expect(dist50m).toBeGreaterThan(40);
    expect(dist50m).toBeLessThan(60);
  });

  it('classifies employee 45m away as INSIDE_OFFICE', () => {
    const evalResult = LocationService.evaluateLocation(
      companyLat + 0.00035, // ~39m
      companyLng,
      12.0, // accurate GPS
      new Date(),
      null,
      {
        latitude: companyLat,
        longitude: companyLng,
        allowedRadiusMeters: radius,
        gpsAccuracyThresholdMeters: accuracyThreshold,
        geofenceInsideBufferMeters: 10.0,
      }
    );

    expect(evalResult.isInsideOffice).toBe(true);
    expect(evalResult.status).toBe(LocationStatus.INSIDE_OFFICE);
    expect(evalResult.freshness).toBe('LIVE');
  });

  it('classifies employee 180m away as OUTSIDE_OFFICE', () => {
    const evalResult = LocationService.evaluateLocation(
      companyLat + 0.0016, // ~177m
      companyLng,
      15.0,
      new Date(),
      null,
      {
        latitude: companyLat,
        longitude: companyLng,
        allowedRadiusMeters: radius,
        gpsAccuracyThresholdMeters: accuracyThreshold,
        geofenceInsideBufferMeters: 10.0,
      }
    );

    expect(evalResult.isInsideOffice).toBe(false);
    expect(evalResult.status).toBe(LocationStatus.OUTSIDE_OFFICE);
  });

  it('flags poor GPS accuracy as LOCATION_UNRELIABLE', () => {
    const evalResult = LocationService.evaluateLocation(
      companyLat,
      companyLng,
      280.0, // 280m accuracy exceeds limit
      new Date(),
      null,
      {
        latitude: companyLat,
        longitude: companyLng,
        allowedRadiusMeters: radius,
        gpsAccuracyThresholdMeters: accuracyThreshold,
      }
    );

    expect(evalResult.status).toBe(LocationStatus.LOCATION_UNRELIABLE);
  });

  it('applies hysteresis buffer to prevent boundary jitter', () => {
    // If previously INSIDE, employee at 105m (radius 100 + buffer 10 = 110m) stays INSIDE
    const evalInside = LocationService.evaluateLocation(
      companyLat + 0.00094, // ~104m
      companyLng,
      10.0,
      new Date(),
      LocationStatus.INSIDE_OFFICE,
      {
        latitude: companyLat,
        longitude: companyLng,
        allowedRadiusMeters: 100.0,
        gpsAccuracyThresholdMeters: 50.0,
        geofenceInsideBufferMeters: 10.0,
      }
    );
    expect(evalInside.status).toBe(LocationStatus.INSIDE_OFFICE);

    // If previously OUTSIDE, employee at 95m (needs <= 90m) stays OUTSIDE
    const evalOutside = LocationService.evaluateLocation(
      companyLat + 0.00085, // ~95m
      companyLng,
      10.0,
      new Date(),
      LocationStatus.OUTSIDE_OFFICE,
      {
        latitude: companyLat,
        longitude: companyLng,
        allowedRadiusMeters: 100.0,
        gpsAccuracyThresholdMeters: 50.0,
        geofenceInsideBufferMeters: 10.0,
      }
    );
    expect(evalOutside.status).toBe(LocationStatus.OUTSIDE_OFFICE);
  });

  it('computes correct location freshness', () => {
    const now = new Date();
    expect(LocationService.getFreshness(now)).toBe('LIVE');

    const fourMinsAgo = new Date(Date.now() - 4 * 60 * 1000);
    expect(LocationService.getFreshness(fourMinsAgo)).toBe('RECENT');

    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    expect(LocationService.getFreshness(tenMinsAgo)).toBe('STALE');
  });
});
