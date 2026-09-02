import React from 'react';
import { LucideIcon, ChevronRight } from 'lucide-react';

interface SettingsRowProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  value?: React.ReactNode;
  onClick?: () => void;
  isToggle?: boolean;
  toggleChecked?: boolean;
  onToggleChange?: (checked: boolean) => void;
  showChevron?: boolean;
  destructive?: boolean;
  className?: string;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({
  icon: Icon,
  title,
  description,
  value,
  onClick,
  isToggle = false,
  toggleChecked = false,
  onToggleChange,
  showChevron = true,
  destructive = false,
  className = '',
}) => {
  const isClickable = !!onClick && !isToggle;

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? onClick : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`min-h-[58px] py-3.5 px-4 flex items-center justify-between gap-3 text-xs transition-colors select-none ${
        isClickable
          ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-dark-elevated/40 active:bg-slate-100 dark:active:bg-dark-elevated/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500'
          : ''
      } ${destructive ? 'text-rose-600 dark:text-rose-400' : ''} ${className}`}
    >
      {/* Left Icon & Title/Description */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
            destructive
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
              : 'bg-slate-100 dark:bg-dark-elevated text-slate-600 dark:text-slate-300'
          }`}
        >
          <Icon className="w-4 h-4 stroke-[1.8]" />
        </div>

        <div className="space-y-0.5 min-w-0 flex-1">
          <p
            className={`font-semibold text-xs sm:text-sm truncate ${
              destructive ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {title}
          </p>
          {description && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal leading-snug line-clamp-1">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Right Controls: Value, Toggle, or Chevron */}
      <div className="flex items-center gap-2 flex-shrink-0 text-right">
        {value && (
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 max-w-[140px] truncate">
            {value}
          </span>
        )}

        {isToggle && onToggleChange && (
          <button
            type="button"
            role="switch"
            aria-checked={toggleChecked}
            aria-label={title}
            onClick={() => onToggleChange(!toggleChecked)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
              toggleChecked ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                toggleChecked ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        )}

        {isClickable && showChevron && (
          <ChevronRight className="w-4 h-4 text-slate-400 stroke-[2] flex-shrink-0" />
        )}
      </div>
    </div>
  );
};
