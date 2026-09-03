import React, { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Sparkles, RefreshCw, X } from 'lucide-react';
import { apiClient } from '../../api/client';

export const VersionUpdatePrompt: React.FC = () => {
  const [hasServerUpdate, setHasServerUpdate] = useState(false);
  const [remoteVersion, setRemoteVersion] = useState<string>('');
  const [isDismissed, setIsDismissed] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const localVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';

  // 1. PWA Service Worker Hook
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        // Poll for Service Worker update every 60 seconds
        setInterval(() => {
          registration.update().catch(() => {});
        }, 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.warn('PWA registration notice:', error);
    },
  });

  // 2. HTTP Backend Version Polling
  useEffect(() => {
    let isMounted = true;

    const checkRemoteVersion = async () => {
      try {
        const res = await apiClient.get('/version', {
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
          params: { _t: Date.now() },
        });

        if (res.data?.success && res.data?.data?.version) {
          const ver = res.data.data.version;
          if (isMounted && ver && ver !== localVersion) {
            setRemoteVersion(ver);
            setHasServerUpdate(true);
          }
        }
      } catch {
        // Silently catch network errors
      }
    };

    checkRemoteVersion();
    const timer = setInterval(checkRemoteVersion, 60 * 1000);

    const handleWindowFocus = () => {
      checkRemoteVersion();
    };
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      isMounted = false;
      clearInterval(timer);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [localVersion]);

  const shouldShowPrompt = (needRefresh || hasServerUpdate) && !isDismissed;

  if (!shouldShowPrompt) {
    return null;
  }

  const handleApplyUpdate = async () => {
    setIsUpdating(true);
    try {
      if (needRefresh) {
        await updateServiceWorker(true);
      }
    } catch {
      // Fallback
    } finally {
      setTimeout(() => {
        window.location.reload();
      }, 250);
    }
  };

  return (
    <aside
      aria-label="App Update Available"
      className="fixed top-3 inset-x-3 sm:inset-x-auto sm:right-4 sm:max-w-md z-50 animate-slide-down"
    >
      <div className="bg-slate-900/95 dark:bg-dark-surface/95 text-white p-4 rounded-2xl shadow-2xl border border-brand-500/40 backdrop-blur-md flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 animate-pulse text-amber-300" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold tracking-tight">
                មានកំណែទម្រង់ប្រព័ន្ធថ្មី {remoteVersion ? `(v${remoteVersion})` : ''}
              </h4>
              <p className="text-[11px] text-slate-300 dark:text-slate-400 mt-0.5">
                មុខងារថ្មីៗត្រូវបានដាក់ឱ្យដំណើរការ។ ទិន្នន័យ និងវត្តមានរបស់អ្នកត្រូវបានរក្សាទុកសុវត្ថិភាព។
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer flex-shrink-0"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800 dark:border-dark-border">
          <button
            onClick={() => setIsDismissed(true)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            ពេលក្រោយ (Later)
          </button>
          <button
            onClick={handleApplyUpdate}
            disabled={isUpdating}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-brand-600 hover:bg-brand-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{isUpdating ? 'កំពុងធ្វើបច្ចុប្បន្នភាព...' : 'ធ្វើបច្ចុប្បន្នភាពឥឡូវនេះ (Update Now)'}</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
