import React, { useState } from 'react';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { Button } from '../ui/Button';
import { Download, X, Smartphone } from 'lucide-react';

export const PwaInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, installApp } = usePwaInstall();
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem('system_hr_pwa_dismissed') === 'true';
  });

  if (isInstalled || !isInstallable || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('system_hr_pwa_dismissed', 'true');
  };

  return (
    <div className="bg-gradient-to-r from-brand-600 to-brand-700 text-white p-3.5 rounded-xl shadow-subtle mb-4 flex items-center justify-between gap-3 animate-slide-up">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white/10 rounded-lg flex-shrink-0">
          <Smartphone className="w-5 h-5 text-white" />
        </div>
        <div className="space-y-0.5">
          <p className="text-xs font-bold leading-tight">Install Attendance App</p>
          <p className="text-[11px] text-white/80 leading-tight">
            Add to home screen for faster one-tap attendance.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={installApp}
          className="px-2.5 py-1.5 bg-white text-brand-700 hover:bg-brand-50 active:bg-brand-100 rounded-lg text-xs font-bold transition-all shadow-xs"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 text-white/70 hover:text-white rounded-md transition-colors"
          aria-label="Dismiss install banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
