import React from 'react';
import { LucideIcon } from 'lucide-react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  variant?: 'default' | 'primary' | 'danger' | 'amber';
  size?: 'sm' | 'md';
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon: Icon,
  label,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}) => {
  const variantStyles = {
    default: 'text-slate-400 hover:text-slate-700 hover:bg-slate-100',
    primary: 'text-slate-400 hover:text-brand-600 hover:bg-brand-50',
    danger: 'text-slate-400 hover:text-danger-600 hover:bg-danger-50',
    amber: 'text-slate-400 hover:text-warning-600 hover:bg-warning-50',
  };

  const sizeStyles = {
    sm: 'p-1 rounded',
    md: 'p-1.5 rounded-lg',
  };

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`transition-all duration-150 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
    </button>
  );
};
