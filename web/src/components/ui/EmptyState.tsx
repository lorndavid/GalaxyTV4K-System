import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`py-12 px-6 text-center flex flex-col items-center justify-center max-w-xs mx-auto animate-fade-in ${className}`}>
      <div className="relative mb-3.5">
        <div className="w-14 h-14 rounded-2xl bg-slate-100/80 dark:bg-dark-elevated/80 border border-slate-200/60 dark:border-dark-border flex items-center justify-center text-slate-400 dark:text-slate-500 shadow-xs">
          <Icon className="w-6 h-6 stroke-[1.8]" />
        </div>
      </div>

      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
        {title}
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5 leading-relaxed">
        {description}
      </p>

      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction} className="rounded-xl shadow-xs text-xs font-semibold">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
