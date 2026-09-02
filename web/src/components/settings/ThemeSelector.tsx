import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePreferences, ThemeMode } from '../../contexts/PreferencesContext';
import { Sun, Moon, Monitor } from 'lucide-react';

export const ThemeSelector: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { t } = useTranslation();
  const { theme, setTheme } = usePreferences();

  const options: { id: ThemeMode; label: string; icon: React.ElementType }[] = [
    { id: 'light', label: t('settings.light', 'Light'), icon: Sun },
    { id: 'system', label: t('settings.system', 'System'), icon: Monitor },
    { id: 'dark', label: t('settings.dark', 'Dark'), icon: Moon },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Theme mode"
      className={`grid grid-cols-3 gap-1.5 p-1.5 bg-slate-100 dark:bg-dark-elevated rounded-2xl border border-slate-200/60 dark:border-dark-border select-none ${className}`}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isSelected = theme === opt.id;

        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => setTheme(opt.id)}
            className={`min-h-[44px] py-2.5 px-3 rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-semibold transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              isSelected
                ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 shadow-sm border border-slate-200/80 dark:border-dark-border'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Icon className={`w-4 h-4 ${isSelected ? 'stroke-[2.2]' : 'stroke-[1.8]'}`} />
            <span className="text-[11px] font-medium tracking-tight truncate">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};
