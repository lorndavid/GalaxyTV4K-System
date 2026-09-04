import React, { useEffect, useState } from 'react';
import { Sparkles, RefreshCw, X } from 'lucide-react';
import { apiClient } from '../../api/client';

export const VersionUpdateBanner: React.FC = () => {
  const [hasNewVersion, setHasNewVersion] = useState(false);
  const [serverVersion, setServerVersion] = useState<string>('');
  const [isDismissed, setIsDismissed] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';

  useEffect(() => {
    let isMounted = true;

    const checkVersion = async () => {
      try {
        const res = await apiClient.get('/version', {
          // Bypass HTTP cache
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
          params: { _t: Date.now() },
        });

        if (res.data?.success && res.data?.data?.version) {
          const remoteVersion = res.data.data.version;
          const acknowledgedAdminVer = localStorage.getItem('acknowledged_admin_version');
          if (acknowledgedAdminVer === remoteVersion) {
            setHasNewVersion(false);
            return;
          }
          if (isMounted && remoteVersion && remoteVersion !== currentVersion) {
            setServerVersion(remoteVersion);
            setHasNewVersion(true);
          }
        }
      } catch {
        // Silently ignore network hiccup during polling
      }
    };

    // Initial check on mount
    checkVersion();

    // Check periodically every 60 seconds
    const interval = setInterval(checkVersion, 60 * 1000);

    // Check on window refocus
    const handleFocus = () => {
      checkVersion();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentVersion]);

  if (!hasNewVersion || isDismissed) {
    return null;
  }

  const handleUpdate = () => {
    setIsReloading(true);
    if (serverVersion) {
      localStorage.setItem('acknowledged_admin_version', serverVersion);
    }
    // Smooth reload preserving auth state in localStorage
    setTimeout(() => {
      window.location.reload();
    }, 200);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    if (serverVersion) {
      localStorage.setItem('acknowledged_admin_version', serverVersion);
    }
  };

  return (
    <aside
      aria-label="New Version Notification"
      className="sticky top-0 z-50 bg-gradient-to-r from-blue-600 via-indigo-600 to-brand-600 text-white shadow-lg border-b border-white/20 transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="p-1 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          </span>
          <div className="truncate">
            <span className="font-bold tracking-tight">
              ✨ មានកំណែទម្រង់ប្រព័ន្ធថ្មី (Version {serverVersion || 'ថ្មី'}) ត្រូវបានដាក់ឱ្យប្រើប្រាស់!
            </span>
            <span className="hidden md:inline text-white/80 ml-2">
              — New features are deployed. Settings, employees, and GPS configurations are safely preserved.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleUpdate}
            disabled={isReloading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-brand-700 hover:bg-white/90 active:scale-95 font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin' : ''}`} />
            <span>{isReloading ? 'កំពុងផ្ទុក...' : 'ធ្វើបច្ចុប្បន្នភាព (Update Now)'}</span>
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-colors cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
