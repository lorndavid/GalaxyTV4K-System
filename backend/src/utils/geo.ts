/**
 * Geographic calculation utilities using Haversine formula.
 */

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface GeofenceResult {
  distanceMeters: number;
  isWithinGeofence: boolean;
  isAccuracyAcceptable: boolean;
}

/**
 * Calculates the great-circle distance between two points on a sphere in meters.
 * Uses the standard Haversine formula.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const EARTH_RADIUS_METERS = 6371000; // Mean earth radius in meters

  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = EARTH_RADIUS_METERS * c;
  return Math.round(distance * 100) / 100; // 2 decimal precision
}

/**
 * Validates whether coordinates fall within an allowed company radius and accuracy threshold.
 */
export function validateGeofence(
  employeeLat: number,
  employeeLon: number,
  employeeAccuracy: number,
  companyLat: number,
  companyLon: number,
  allowedRadiusMeters: number,
  accuracyThresholdMeters: number
): GeofenceResult {
  const distanceMeters = calculateHaversineDistance(
    employeeLat,
    employeeLon,
    companyLat,
    companyLon
  );

  const isWithinGeofence = distanceMeters <= allowedRadiusMeters;
  const isAccuracyAcceptable = employeeAccuracy <= accuracyThresholdMeters;

  return {
    distanceMeters,
    isWithinGeofence,
    isAccuracyAcceptable,
  };
}
