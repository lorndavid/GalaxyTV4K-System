import { useState, useEffect, useRef } from 'react';
import apiClient from '../api/client';

export const useLocationTracker = (
  isLocationSharingActive: boolean,
  intervalSeconds: number = 60
) => {
  const [currentCoords, setCurrentCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);

  const [permissionState, setPermissionState] = useState<
    'prompt' | 'granted' | 'denied' | 'unavailable'
  >('prompt');

  const [lastSentAt, setLastSentAt] = useState<Date | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Check initial permission
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setPermissionState('unavailable');
      return;
    }

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((result) => {
          setPermissionState(result.state);
          result.onchange = () => {
            setPermissionState(result.state);
          };
        })
        .catch(() => {
          // fallback
        });
    }
  }, []);

  // Send update function
  const sendLocationUpdate = async (coords: GeolocationCoordinates) => {
    const now = Date.now();
    // Enforce throttling: at least intervalSeconds between pings
    if (now - lastUpdateRef.current < intervalSeconds * 1000) {
      return;
    }

    lastUpdateRef.current = now;
    setIsSending(true);

    try {
      await apiClient.post('/location/update', {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        recordedAt: new Date().toISOString(),
      });
      setLastSentAt(new Date());
    } catch (err) {
      console.warn('[LocationTracker] Update failed:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Watch position and ping periodic updates when sharing is enabled
  useEffect(() => {
    if (!isLocationSharingActive || !('geolocation' in navigator)) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    const handleSuccess = (position: GeolocationPosition) => {
      setPermissionState('granted');
      setCurrentCoords({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });

      sendLocationUpdate(position.coords);
    };

    const handleError = (error: GeolocationPositionError) => {
      if (error.code === error.PERMISSION_DENIED) {
        setPermissionState('denied');
      }
    };

    // 1. Immediate first location fix on app launch / mount
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });

    // 2. Continuous position watcher
    const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000,
    });

    watchIdRef.current = watchId;

    // 3. Fallback periodic ping (every 30s) to keep status LIVE even when stationary
    const intervalId = setInterval(() => {
      if (navigator.onLine && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 10000,
        });
      }
    }, Math.max(intervalSeconds, 30) * 1000);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      clearInterval(intervalId);
    };
  }, [isLocationSharingActive, intervalSeconds]);

  const forceSyncLocation = () => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        lastUpdateRef.current = 0; // Bypass throttle for manual sync
        sendLocationUpdate(pos.coords);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setPermissionState('denied');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return {
    currentCoords,
    permissionState,
    lastSentAt,
    isSending,
    forceSyncLocation,
  };
};
