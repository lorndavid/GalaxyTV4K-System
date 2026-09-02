import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

export const ThemeToggle: React.FC<{ className?: string; compact?: boolean }> = ({
  className = '',
  compact = false,
}) => {
  const { theme, setTheme } = useTheme();

  if (compact) {
    return (
      <button
        onClick={() => {
          if (theme === 'light') setTheme('dark');
          else if (theme === 'dark') setTheme('system');
          else setTheme('light');
        }}
        title={`Theme: ${theme.toUpperCase()}`}
        className={`p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-dark-elevated transition-colors ${className}`}
        aria-label="Toggle theme mode"
      >
        {theme === 'light' ? (
          <Sun className="w-4 h-4 text-amber-500" />
        ) : theme === 'dark' ? (
          <Moon className="w-4 h-4 text-brand-400" />
        ) : (
          <Monitor className="w-4 h-4 text-slate-500" />
        )}
      </button>
    );
  }

  return (
    <div
      className={`inline-flex items-center p-1 bg-slate-100 dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl ${className}`}
    >
      <button
        onClick={() => setTheme('light')}
        title="Light Mode"
        className={`p-1.5 rounded-lg transition-all ${
          theme === 'light'
            ? 'bg-white dark:bg-dark-surface text-amber-600 shadow-xs font-bold'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
        }`}
        aria-label="Set light mode"
      >
        <Sun className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={() => setTheme('dark')}
        title="Dark Mode"
        className={`p-1.5 rounded-lg transition-all ${
          theme === 'dark'
            ? 'bg-white dark:bg-dark-surface text-brand-400 shadow-xs font-bold'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
        }`}
        aria-label="Set dark mode"
      >
        <Moon className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={() => setTheme('system')}
        title="System Preference"
        className={`p-1.5 rounded-lg transition-all ${
          theme === 'system'
            ? 'bg-white dark:bg-dark-surface text-brand-600 shadow-xs font-bold'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
        }`}
        aria-label="Set system theme"
      >
        <Monitor className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
