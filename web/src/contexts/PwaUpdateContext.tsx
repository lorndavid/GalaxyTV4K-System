import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { registerSW } from 'virtual:pwa-register';

export type UpdateStage =
  | 'IDLE'
  | 'CHECKING'
  | 'AVAILABLE'
  | 'DOWNLOADING'
  | 'INSTALLING'
  | 'ACTIVATING'
  | 'COMPLETE'
  | 'ERROR';

export interface VersionMetadata {
  version: string;
  build?: string;
  releaseDate?: string;
  releaseNotes?: string[];
}

interface PwaUpdateContextType {
  updateAvailable: boolean;
  isUpdating: boolean;
  updateStage: UpdateStage;
  currentVersion: string;
  newVersion: string | null;
  releaseNotes: string[];
  updateError: string | null;
  isDismissed: boolean;
  isOffline: boolean;
  checkForPwaUpdate: () => Promise<boolean>;
  performUpdate: () => Promise<void>;
  dismissUpdate: () => void;
  resetUpdate: () => void;
}

const PwaUpdateContext = createContext<PwaUpdateContextType | undefined>(undefined);

export const PwaUpdateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.1.0';

  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStage, setUpdateStage] = useState<UpdateStage>('IDLE');
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<string[]>([]);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const swRegistrationRef = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const updateSWFnRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);
  const isUpdatingRef = useRef(false);

  // 1. Fetch public version metadata (Live /api/version with fallback to version.json)
  const fetchVersionMetadata = useCallback(async () => {
    try {
      const acknowledgedVer = localStorage.getItem('acknowledged_pwa_version');

      // Primary: Live backend version endpoint
      const apiResponse = await fetch(`/api/version?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      });
      if (apiResponse.ok) {
        const resData = await apiResponse.json();
        const liveVer = resData?.data?.version;
        if (liveVer && liveVer !== currentVersion) {
          if (acknowledgedVer === liveVer) {
            // Already updated and acknowledged! Auto-remove banner!
            setUpdateAvailable(false);
            return null;
          }
          setNewVersion(liveVer);
          setUpdateAvailable(true);
          setUpdateStage('AVAILABLE');
          return resData.data;
        }
      }

      // Secondary: Static version.json fallback
      const response = await fetch(`/version.json?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      });
      if (response.ok) {
        const data: VersionMetadata = await response.json();
        if (data.version && data.version !== currentVersion) {
          if (acknowledgedVer === data.version) {
            setUpdateAvailable(false);
            return null;
          }
          setNewVersion(data.version);
          setUpdateAvailable(true);
          setUpdateStage('AVAILABLE');
          if (Array.isArray(data.releaseNotes)) {
            setReleaseNotes(data.releaseNotes);
          }
          return data;
        }
      }
    } catch {
      // offline or server restarting
    }
    return null;
  }, [currentVersion]);

  // 2. Service Worker Registration via VitePWA
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    try {
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          console.log('[PWA] Service Worker detected a waiting updated version.');
          setUpdateAvailable(true);
          setUpdateStage('AVAILABLE');
          fetchVersionMetadata();
        },
        onOfflineReady() {
          console.log('[PWA] Application is cached and ready for offline use.');
        },
        onRegistered(registration) {
          swRegistrationRef.current = registration;

          if (registration) {
            // Check for update if registration already has a waiting worker
            if (registration.waiting) {
              setUpdateAvailable(true);
              setUpdateStage('AVAILABLE');
              fetchVersionMetadata();
            }

            // Periodic background update check (every 60 seconds)
            const interval = setInterval(() => {
              if (navigator.onLine && !isUpdatingRef.current) {
                registration.update().catch(() => {});
                fetchVersionMetadata();
              }
            }, 60 * 1000);

            const handleFocus = () => {
              if (navigator.onLine && !isUpdatingRef.current) {
                registration.update().catch(() => {});
                fetchVersionMetadata();
              }
            };
            window.addEventListener('focus', handleFocus);

            return () => {
              clearInterval(interval);
              window.removeEventListener('focus', handleFocus);
            };
          }
        },
        onRegisterError(error) {
          console.warn('[PWA] Service worker registration error:', error);
        },
      });

      updateSWFnRef.current = updateSW;
    } catch (err) {
      console.warn('[PWA] Failed to initialize registerSW:', err);
    }
  }, [fetchVersionMetadata]);

  // 3. Online/Offline event handling
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Auto-check for updates when coming back online
      checkForPwaUpdate().catch(() => {});
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 4. Foreground / Tab visibility listener (mobile PWA returning from background)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.onLine && !isUpdatingRef.current) {
        // Debounce foreground update check
        if (swRegistrationRef.current) {
          swRegistrationRef.current.update().catch(() => {});
        }
        fetchVersionMetadata();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [fetchVersionMetadata]);

  // 5. Controller change listener with 5-second reload loop protection
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let refreshing = false;

    const handleControllerChange = () => {
      if (refreshing) return;

      // Check loop guard in sessionStorage
      const lastReload = sessionStorage.getItem('pwa_reload_timestamp');
      const now = Date.now();

      if (lastReload && now - parseInt(lastReload, 10) < 5000) {
        console.warn('[PWA] Suppressing rapid reload loop.');
        return;
      }

      sessionStorage.setItem('pwa_reload_timestamp', String(now));
      refreshing = true;
      setUpdateStage('COMPLETE');

      // Controlled single reload into new version
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  // 6. Manual & Automated Update Check Function
  const checkForPwaUpdate = useCallback(async (): Promise<boolean> => {
    if (!navigator.onLine) {
      setIsOffline(true);
      return false;
    }

    setUpdateError(null);
    setUpdateStage((prev) => (prev === 'AVAILABLE' ? 'AVAILABLE' : 'CHECKING'));

    try {
      // 1. Check version metadata
      const meta = await fetchVersionMetadata();

      // 2. Trigger browser Service Worker update check
      if ('serviceWorker' in navigator) {
        const registration = swRegistrationRef.current || (await navigator.serviceWorker.getRegistration());
        if (registration) {
          swRegistrationRef.current = registration;
          await registration.update();

          if (registration.waiting) {
            setUpdateAvailable(true);
            setUpdateStage('AVAILABLE');
            setIsDismissed(false);
            return true;
          }
        }
      }

      if (meta) {
        setUpdateAvailable(true);
        setUpdateStage('AVAILABLE');
        setIsDismissed(false);
        return true;
      }

      // No updates pending
      setUpdateStage('IDLE');
      return false;
    } catch (err: any) {
      console.warn('[PWA] Update check failed:', err);
      setUpdateStage('IDLE');
      return false;
    }
  }, [fetchVersionMetadata]);

  // 7. Perform Update (Instant 250ms Fast Refresh & Auto-Remove Banner)
  const performUpdate = useCallback(async () => {
    if (isUpdatingRef.current) return;

    isUpdatingRef.current = true;
    setIsUpdating(true);
    setUpdateStage('ACTIVATING');

    // 1. Immediately store acknowledged version so banner NEVER reappears after reload!
    const targetVersion = newVersion || '1.1.0';
    try {
      localStorage.setItem('acknowledged_pwa_version', targetVersion);
      sessionStorage.setItem('pwa_reload_timestamp', String(Date.now()));
    } catch {}

    // 2. Signal service workers to skip waiting (fire and forget)
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        }
      }
      if (updateSWFnRef.current) {
        updateSWFnRef.current(false).catch(() => {});
      }
    } catch (swErr) {
      console.warn('[PWA] SW skipWaiting notice:', swErr);
    }

    // 3. Clear stale dynamic application caches in parallel
    try {
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }
    } catch {}

    // 4. Guaranteed FAST reload within 250ms!
    setUpdateStage('COMPLETE');
    setTimeout(() => {
      window.location.reload();
    }, 250);
  }, [newVersion]);

  const dismissUpdate = useCallback(() => {
    setIsDismissed(true);
    if (newVersion) {
      localStorage.setItem('acknowledged_pwa_version', newVersion);
    }
  }, [newVersion]);

  const resetUpdate = useCallback(() => {
    setUpdateError(null);
    setUpdateStage('IDLE');
  }, []);

  return (
    <PwaUpdateContext.Provider
      value={{
        updateAvailable,
        isUpdating,
        updateStage,
        currentVersion,
        newVersion,
        releaseNotes,
        updateError,
        isDismissed,
        isOffline,
        checkForPwaUpdate,
        performUpdate,
        dismissUpdate,
        resetUpdate,
      }}
    >
      {children}
    </PwaUpdateContext.Provider>
  );
};

export const usePwaUpdate = () => {
  const context = useContext(PwaUpdateContext);
  if (!context) {
    throw new Error('usePwaUpdate must be used within a PwaUpdateProvider');
  }
  return context;
};
