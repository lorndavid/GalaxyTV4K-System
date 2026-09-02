import React from 'react';
import { Menu, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ThemeToggle } from '../ui/ThemeToggle';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';

interface HeaderProps {
  onOpenSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSidebar }) => {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white dark:bg-dark-surface border-b border-slate-200 dark:border-dark-border sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between transition-colors duration-150">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-elevated rounded-xl transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:inline">
            Apex Enterprise
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-success-50 dark:bg-success-950/40 text-success-700 dark:text-success-400 border border-success-200 dark:border-success-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse" />
            Live Server
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Language & Theme Selectors */}
        <LanguageSwitcher compact />
        <ThemeToggle compact />

        <div className="h-4 w-[1px] bg-slate-200 dark:bg-dark-border mx-1 hidden sm:block" />

        <div className="text-right hidden sm:block">
          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
            {user?.employee?.displayName || 'System Admin'}
          </p>
          <p className="text-[10px] text-slate-400 font-medium">Administrator</p>
        </div>

        <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-800/60 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-xs shadow-xs">
          <ShieldCheck className="w-4 h-4" />
        </div>
      </div>
    </header>
  );
};
