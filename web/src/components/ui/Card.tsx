import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  onClick,
}) => {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3.5',
    md: 'p-4 sm:p-5',
    lg: 'p-5 sm:p-6',
  }[padding];

  const clickableClasses = onClick
    ? 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 active:scale-[0.99] transition-all duration-150'
    : '';

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-dark-surface border border-slate-100 dark:border-dark-border rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.02)] dark:shadow-none transition-colors duration-150 ${paddingClasses} ${clickableClasses} ${className}`}
    >
      {children}
    </div>
  );
};
