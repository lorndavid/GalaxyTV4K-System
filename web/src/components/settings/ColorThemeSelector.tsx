import React from 'react';
import { usePreferences, COLOR_THEMES, ColorThemeId } from '../../contexts/PreferencesContext';
import { Check } from 'lucide-react';

export const ColorThemeSelector: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { colorTheme, setColorTheme } = usePreferences();

  return (
    <div
      role="radiogroup"
      aria-label="Color Theme"
      className={`grid grid-cols-1 sm:grid-cols-2 gap-2.5 ${className}`}
    >
      {COLOR_THEMES.map((theme) => {
        const isSelected = colorTheme === theme.id;

        return (
          <button
            key={theme.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => setColorTheme(theme.id)}
            className={`min-h-[52px] p-3 rounded-2xl border flex items-center justify-between gap-3 text-left transition-all active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              isSelected
                ? 'bg-white dark:bg-dark-surface border-slate-300 dark:border-slate-700 shadow-xs ring-1 ring-slate-300 dark:ring-slate-700'
                : 'bg-slate-50/70 dark:bg-dark-elevated/40 border-slate-200/70 dark:border-dark-border hover:bg-white dark:hover:bg-dark-surface'
            }`}
          >
            {/* Color Swatch Circle & Name */}
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 shadow-xs transition-transform duration-200"
                style={{ backgroundColor: theme.primary }}
              >
                {isSelected && <Check className="w-4 h-4 text-white stroke-[2.5]" />}
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {theme.name}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  {theme.primary}
                </p>
              </div>
            </div>

            {/* Selected Pill Indicator */}
            {isSelected && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: theme.soft,
                  color: theme.primary,
                }}
              >
                Active
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
