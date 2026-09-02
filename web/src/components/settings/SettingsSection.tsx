import React from 'react';

interface SettingsSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  description,
  children,
  className = '',
}) => {
  return (
    <section className={`space-y-2 ${className}`}>
      {title && (
        <div className="px-1 space-y-0.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {title}
          </h2>
          {description && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
              {description}
            </p>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-dark-surface border border-slate-200/70 dark:border-dark-border rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none divide-y divide-slate-100 dark:divide-dark-border overflow-hidden transition-colors">
        {children}
      </div>
    </section>
  );
};
