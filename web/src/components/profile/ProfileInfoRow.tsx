import React, { useState } from 'react';
import { LucideIcon, Copy, Check } from 'lucide-react';

interface ProfileInfoRowProps {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  copyable?: boolean;
  copyValue?: string;
  badge?: React.ReactNode;
  className?: string;
}

export const ProfileInfoRow: React.FC<ProfileInfoRowProps> = ({
  icon: Icon,
  label,
  value,
  copyable = false,
  copyValue,
  badge,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!copyable) return;
    const textToCopy = copyValue || (typeof value === 'string' ? value : '');
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={`min-h-[52px] py-3 px-4 flex items-center justify-between gap-3 text-xs transition-colors hover:bg-slate-50/50 dark:hover:bg-dark-elevated/30 ${className}`}
    >
      {/* Icon & Label */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-dark-elevated text-slate-500 dark:text-slate-400 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 stroke-[1.8]" />
        </div>
        <span className="font-normal text-slate-500 dark:text-slate-400 truncate">
          {label}
        </span>
      </div>

      {/* Value & Actions */}
      <div className="flex items-center gap-2 flex-shrink-0 text-right">
        {badge}
        <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
          {value || '—'}
        </div>

        {copyable && (
          <button
            onClick={handleCopy}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-elevated transition-colors"
            title="Copy to clipboard"
            aria-label={`Copy ${label}`}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};
