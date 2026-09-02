import { describe, it, expect } from 'vitest';
import { calculateHaversineDistance, validateGeofence } from '../utils/geo.js';

describe('GPS & Geofence (Haversine Formula)', () => {
  // Office coordinates: Phnom Penh (11.5564, 104.9282)
  const officeLat = 11.5564;
  const officeLon = 104.9282;
  const allowedRadius = 100; // 100 meters
  const maxAccuracy = 50; // 50 meters

  it('calculates 0 distance for identical coordinates', () => {
    const distance = calculateHaversineDistance(officeLat, officeLon, officeLat, officeLon);
    expect(distance).toBe(0);
  });

  it('calculates distance correctly for known approximate coordinate offsets', () => {
    // 0.0004 degrees latitude is approximately ~44.4 meters
    const nearbyLat = officeLat + 0.0004;
    const distance = calculateHaversineDistance(officeLat, officeLon, nearbyLat, officeLon);
    expect(distance).toBeGreaterThan(40);
    expect(distance).toBeLessThan(50);
  });

  it('ACCEPTS attendance when employee is ~45m away (inside 100m radius) with good accuracy (15m)', () => {
    const employeeLat = officeLat + 0.0004;
    const employeeLon = officeLon;
    const accuracy = 15;

    const result = validateGeofence(
      employeeLat,
      employeeLon,
      accuracy,
      officeLat,
      officeLon,
      allowedRadius,
      maxAccuracy
    );

    expect(result.isWithinGeofence).toBe(true);
    expect(result.isAccuracyAcceptable).toBe(true);
    expect(result.distanceMeters).toBeLessThan(100);
  });

  it('REJECTS attendance when employee is ~150m+ away (outside 100m radius)', () => {
    // 0.0015 degrees lat is approximately ~166 meters
    const farLat = officeLat + 0.0015;
    const employeeLon = officeLon;
    const accuracy = 10;

    const result = validateGeofence(
      farLat,
      employeeLon,
      accuracy,
      officeLat,
      officeLon,
      allowedRadius,
      maxAccuracy
    );

    expect(result.isWithinGeofence).toBe(false);
    expect(result.distanceMeters).toBeGreaterThan(100);
  });

  it('REJECTS attendance when GPS accuracy is too low (e.g. ±120m accuracy vs max ±50m allowed)', () => {
    const employeeLat = officeLat; // Exactly at office
    const employeeLon = officeLon;
    const poorAccuracy = 120; // 120m accuracy

    const result = validateGeofence(
      employeeLat,
      employeeLon,
      poorAccuracy,
      officeLat,
      officeLon,
      allowedRadius,
      maxAccuracy
    );

    expect(result.isWithinGeofence).toBe(true);
    expect(result.isAccuracyAcceptable).toBe(false);
  });
});
