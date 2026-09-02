import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'gray';
  index?: number;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'blue',
  index = 0,
}) => {
  const iconVariants = {
    blue: 'bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-800/50',
    green: 'bg-success-50 dark:bg-success-950/50 text-success-600 dark:text-success-400 border border-success-100 dark:border-success-800/50',
    amber: 'bg-warning-50 dark:bg-amber-950/50 text-warning-600 dark:text-amber-400 border border-warning-100 dark:border-amber-800/50',
    red: 'bg-danger-50 dark:bg-danger-950/50 text-danger-600 dark:text-danger-400 border border-danger-100 dark:border-danger-800/50',
    purple: 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-800/50',
    gray: 'bg-slate-100 dark:bg-dark-elevated text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-dark-border',
  };

  return (
    <div
      className="bg-white dark:bg-dark-surface p-5 rounded-2xl border border-slate-200/90 dark:border-dark-border shadow-xs flex items-start justify-between transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600 animate-slide-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="space-y-1 min-w-0">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">{title}</p>
        <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          {value}
        </p>
        {subtitle && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate">
            {subtitle}
          </p>
        )}
      </div>
      <div className={`p-2.5 rounded-xl ${iconVariants[variant]} flex-shrink-0 shadow-xs`}>
        <Icon className="w-5 h-5 stroke-[2.2px]" />
      </div>
    </div>
  );
};
