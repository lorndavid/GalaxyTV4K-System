import React from 'react';
import { useTranslation } from 'react-i18next';
import { ProfileAvatar } from './ProfileAvatar';
import { ShieldCheck, Copy, Check, Settings as SettingsIcon } from 'lucide-react';

interface ProfileHeaderProps {
  displayName: string;
  latinName?: string;
  employeeCode: string;
  position: string;
  departmentName: string;
  status?: string;
  onOpenSettings?: () => void;
  className?: string;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  displayName,
  latinName,
  employeeCode,
  position,
  departmentName,
  status = 'Active',
  onOpenSettings,
  className = '',
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = React.useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(employeeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`bg-white dark:bg-dark-surface border border-slate-200/70 dark:border-dark-border rounded-3xl p-5 sm:p-7 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none transition-colors ${className}`}
    >
      {/* Responsive layout: Centered on mobile, clean horizontal flex on tablet/desktop */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left">
        {/* Avatar */}
        <ProfileAvatar name={displayName} size="lg" showStatus={true} />

        {/* Text Details */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                {displayName}
              </h1>
              {latinName && latinName !== displayName && (
                <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  {latinName}
                </p>
              )}
            </div>

            {/* Status & Code pill row */}
            <div className="flex items-center justify-center sm:justify-start gap-2 pt-1 sm:pt-0">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{t('profile.activeStatus', 'Active Employee')}</span>
              </span>

              <button
                onClick={handleCopyCode}
                title="Copy Employee ID"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-slate-100 dark:bg-dark-elevated text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-dark-border transition-colors active:scale-95"
              >
                <span>{employeeCode}</span>
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3 text-slate-400" />
                )}
              </button>
            </div>
          </div>

          <p className="text-xs sm:text-sm font-semibold text-brand-600 dark:text-brand-400 pt-1">
            {position} <span className="text-slate-300 dark:text-slate-600 font-normal mx-1.5">•</span>{' '}
            <span className="text-slate-600 dark:text-slate-300 font-normal">{departmentName}</span>
          </p>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-0.5">
            {t('profile.workLocation', 'Work Location')}: {t('profile.mainOffice', 'Phnom Penh Headquarters')}
          </p>
        </div>
      </div>
    </div>
  );
};
