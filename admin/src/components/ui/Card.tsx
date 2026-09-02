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
    sm: 'p-3',
    md: 'p-4 sm:p-5',
    lg: 'p-6 sm:p-7',
  }[padding];

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-dark-surface border border-slate-200 dark:border-dark-border rounded-xl shadow-xs transition-colors duration-150 ${paddingClasses} ${className}`}
    >
      {children}
    </div>
  );
};
