import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePwaUpdate } from '../../contexts/PwaUpdateContext';
import { RefreshCw, Download, Sparkles, X, AlertCircle } from 'lucide-react';

export const PwaUpdateNotification: React.FC = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const {
    updateAvailable,
    isUpdating,
    updateStage,
    currentVersion,
    newVersion,
    releaseNotes,
    updateError,
    isDismissed,
    performUpdate,
    dismissUpdate,
    resetUpdate,
  } = usePwaUpdate();

  // Safety Rule: Never interrupt active QR scanning or attendance operations!
  const isScannerActive =
    location.pathname === '/scan' ||
    location.pathname === '/attendance/scan' ||
    location.pathname.startsWith('/scan');

  // If dismissed, not available, or user is currently in the camera scanner, hide banner
  if (!updateAvailable || isDismissed || isScannerActive) {
    return null;
  }

  // Text for current update stage
  const getStageMessage = () => {
    switch (updateStage) {
      case 'DOWNLOADING':
        return t('pwa.downloading', 'Downloading update...');
      case 'INSTALLING':
        return t('pwa.installing', 'Installing update...');
      case 'ACTIVATING':
        return t('pwa.activating', 'Finishing activation...');
      case 'COMPLETE':
        return t('pwa.complete', 'Update complete! Refreshing...');
      default:
        return t('pwa.updating', 'Updating application...');
    }
  };

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="PWA Update Available"
      className="fixed z-50 transition-all duration-300 left-3 right-3 sm:left-auto sm:right-6 bottom-[calc(max(env(safe-area-inset-bottom),12px)+72px)] sm:bottom-6 max-w-sm sm:w-96 mx-auto sm:mx-0 animate-slide-up"
    >
      <div className="bg-white/95 dark:bg-dark-surface/95 backdrop-blur-xl border border-slate-200/80 dark:border-dark-border rounded-2xl p-4 shadow-xl shadow-slate-900/10 dark:shadow-black/50 space-y-3 transition-colors">
        {/* Top Row: Icon, Title & Dismiss */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 flex items-center justify-center flex-shrink-0">
              <RefreshCw
                className={`w-4 h-4 stroke-[2.2] ${isUpdating ? 'animate-spin' : ''}`}
              />
            </div>

            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                {t('pwa.title', 'New update available')}
              </h2>
              {newVersion && (
                <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                  v{currentVersion} → <span className="font-semibold text-brand-600 dark:text-brand-400">v{newVersion}</span>
                </p>
              )}
            </div>
          </div>

          {!isUpdating && (
            <button
              type="button"
              onClick={dismissUpdate}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-elevated transition-colors"
              title={t('pwa.later', 'Later')}
              aria-label="Dismiss update banner"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Error Notification if update failed */}
        {updateError ? (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-start gap-2 text-[11px] text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{t('pwa.failed', "Update couldn't be completed.")}</p>
              <p className="text-rose-600/80 dark:text-rose-400/80 mt-0.5">{updateError}</p>
            </div>
          </div>
        ) : (
          /* Description & Release Notes */
          <div className="space-y-1.5">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              {isUpdating
                ? getStageMessage()
                : t(
                    'pwa.subtitle',
                    'A new version of the app is ready. Update now for the latest features and improvements.'
                  )}
            </p>

            {/* Optional Release Highlights */}
            {!isUpdating && releaseNotes.length > 0 && (
              <ul className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 pt-0.5">
                {releaseNotes.slice(0, 2).map((note, index) => (
                  <li key={index} className="flex items-center gap-1.5 truncate">
                    <span className="w-1 h-1 rounded-full bg-brand-500 flex-shrink-0" />
                    <span className="truncate">{note}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Actions Row */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-dark-border/80">
          {updateError ? (
            <button
              type="button"
              onClick={resetUpdate}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-dark-elevated transition-colors"
            >
              {t('common.close', 'Close')}
            </button>
          ) : (
            !isUpdating && (
              <button
                type="button"
                onClick={dismissUpdate}
                className="px-3 py-2 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
              >
                {t('pwa.later', 'Later')}
              </button>
            )
          )}

          <button
            type="button"
            disabled={isUpdating}
            onClick={performUpdate}
            className={`min-h-[38px] px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all duration-150 flex items-center justify-center gap-2 shadow-xs ${
              isUpdating
                ? 'opacity-80 cursor-not-allowed'
                : 'active:scale-95 hover:opacity-95'
            }`}
            style={{
              backgroundColor: 'var(--color-primary, #2563EB)',
            }}
          >
            {isUpdating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{getStageMessage()}</span>
              </>
            ) : updateError ? (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t('common.retry', 'Try Again')}</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>{t('pwa.updateNow', 'Update now')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
