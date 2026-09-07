import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { InstallGuideModal } from './InstallGuideModal';
import { Download, X, Smartphone, Sparkles } from 'lucide-react';

export const PwaInstallBanner: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isKhmer = !i18n.language?.startsWith('en');
  const { isInstallable, isInstalled, isIos, installApp } = usePwaInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem('system_hr_pwa_dismissed') === 'true';
  });

  // If already running inside standalone app or dismissed, don't display
  if (isInstalled || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('system_hr_pwa_dismissed', 'true');
  };

  const handleAction = () => {
    if (isInstallable) {
      installApp();
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-brand-600 via-brand-700 to-blue-700 text-white p-3 sm:p-3.5 rounded-2xl shadow-md shadow-brand-500/15 mb-4 flex items-center justify-between gap-3 animate-slide-up select-none">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="p-2.5 bg-white/15 backdrop-blur-md rounded-xl flex-shrink-0 flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div className="space-y-0.5 min-w-0 flex-1">
            <p className="text-xs font-bold leading-tight truncate">
              {isKhmer ? 'ដំឡើងកម្មវិធីលើអេក្រង់ដើម' : 'Add to Home Screen'}
            </p>
            <p className="text-[11px] text-white/85 leading-tight truncate">
              {isKhmer
                ? 'ចូលប្រើប្រាស់រហ័ស ដូច App ទូរស័ព្ទពិតៗ'
                : 'One-tap access with full-screen experience'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={handleAction}
            className="px-3 py-1.5 bg-white text-brand-700 hover:bg-brand-50 active:scale-95 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isKhmer ? 'ដំឡើង' : 'Install'}</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 text-white/70 hover:text-white rounded-lg transition-colors active:scale-95 cursor-pointer"
            aria-label="Dismiss install banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* iOS & Android Step-by-Step Interactive Guide */}
      <InstallGuideModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isIos={isIos}
        isInstallable={isInstallable}
        onNativeInstall={installApp}
      />
    </>
  );
};
