import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../common/Modal';
import { Button } from '../ui/Button';
import { Smartphone, Monitor, ShieldCheck, Globe } from 'lucide-react';

interface ActiveSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ActiveSessionsModal: React.FC<ActiveSessionsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const platform = isMobile ? 'Mobile Browser (PWA)' : 'Desktop Browser';
  const browserName = navigator.userAgent.includes('Chrome')
    ? 'Chrome'
    : navigator.userAgent.includes('Safari')
    ? 'Safari'
    : 'Web Browser';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('settings.sessionsModalTitle', 'Active Devices & Sessions')}
    >
      <div className="space-y-4 text-xs font-sans">
        <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
          {t('settings.sessionsModalDesc', 'Review browsers and devices currently signed in to your employee account.')}
        </p>

        {/* Current Active Device Card */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-elevated border border-slate-200/70 dark:border-dark-border space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center flex-shrink-0">
                {isMobile ? <Smartphone className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
              </div>

              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                  {platform} • {browserName}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                  Phnom Penh, Cambodia (Current IP)
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{t('profile.lastActive', 'Active now')}</span>
            </span>
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-dark-border flex items-center justify-between text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
              <span>HTTPS Encrypted Session</span>
            </span>
            <span className="font-mono text-slate-400">Token ID: ••••-7d9a</span>
          </div>
        </div>

        <div className="flex items-center justify-end pt-2">
          <Button variant="secondary" size="sm" onClick={onClose} className="rounded-xl font-medium">
            {t('common.close', 'Close')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
