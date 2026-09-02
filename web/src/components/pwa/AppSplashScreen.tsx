import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface AppSplashScreenProps {
  error?: string | null;
  onRetry?: () => void;
}

export const AppSplashScreen: React.FC<AppSplashScreenProps> = ({ error, onRetry }) => {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between p-8 bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-slate-100 select-none transition-colors duration-200">
      {/* Top spacing */}
      <div className="w-full pt-4" />

      {/* Center Brand Identity */}
      <div className="flex flex-col items-center text-center max-w-xs space-y-6 animate-fade-in">
        <div className="relative">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl p-3 bg-white dark:bg-dark-surface shadow-card border border-slate-200/80 dark:border-dark-border flex items-center justify-center transition-transform duration-300">
            <img
              src="/logo.png"
              alt="System HR Logo"
              className="w-full h-full object-contain filter drop-shadow-xs"
              loading="eager"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-sans">
            Galaxy TV4K
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            Employee Attendance & HR Portal
          </p>
        </div>

        {/* Loading Indicator or Error State */}
        {error ? (
          <div className="space-y-3 pt-2 w-full animate-slide-up">
            <div className="p-3 bg-danger-50 dark:bg-danger-950/40 border border-danger-200 dark:border-danger-800/60 rounded-2xl flex items-start gap-2.5 text-xs text-danger-700 dark:text-danger-400 text-left">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shadow-xs flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t('common.retry', 'Try Again')}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 pt-4">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-600 animate-bounce [animation-delay:-0.3s]" />
            <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-bounce [animation-delay:-0.15s]" />
            <span className="w-2.5 h-2.5 rounded-full bg-brand-400 animate-bounce" />
          </div>
        )}
      </div>

      {/* Bottom Footer */}
      <div className="text-center">
        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
          Secured with Geofence & Dynamic QR • PWA v1.0
        </p>
      </div>
    </div>
  );
};
