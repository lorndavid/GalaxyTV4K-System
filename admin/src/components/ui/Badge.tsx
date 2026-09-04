import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  Clock,
  XCircle,
  CalendarOff,
  Sun,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  WifiOff,
  AlertCircle,
} from 'lucide-react';

export type StatusType =
  | 'PRESENT'
  | 'LATE'
  | 'ABSENT'
  | 'EARLY_LEAVE'
  | 'ON_LEAVE'
  | 'HOLIDAY'
  | 'REST_DAY'
  | 'INCOMPLETE'
  | 'MANUAL_ADJUSTMENT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'INSIDE_OFFICE'
  | 'OUTSIDE_OFFICE'
  | 'LOCATION_INACTIVE'
  | 'LOCATION_STALE'
  | 'LOCATION_UNRELIABLE';

interface BadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  customLabel?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  status,
  size = 'md',
  className = '',
  customLabel,
}) => {
  const { t } = useTranslation();
  const normalized = (status || '').toUpperCase().trim();

  // Color mappings for light and dark modes
  const configMap: Record<
    string,
    {
      labelKey: string;
      icon: React.ElementType;
      classes: string;
    }
  > = {
    PRESENT: {
      labelKey: 'status.PRESENT',
      icon: CheckCircle2,
      classes:
        'bg-success-50 dark:bg-success-950/40 text-success-700 dark:text-success-400 border-success-200 dark:border-success-800/60',
    },
    APPROVED: {
      labelKey: 'status.APPROVED',
      icon: CheckCircle2,
      classes:
        'bg-success-50 dark:bg-success-950/40 text-success-700 dark:text-success-400 border-success-200 dark:border-success-800/60',
    },
    INSIDE_OFFICE: {
      labelKey: 'status.INSIDE_OFFICE',
      icon: MapPin,
      classes:
        'bg-success-50 dark:bg-success-950/40 text-success-700 dark:text-success-400 border-success-200 dark:border-success-800/60',
    },
    LATE: {
      labelKey: 'status.LATE',
      icon: Clock,
      classes:
        'bg-warning-50 dark:bg-amber-950/40 text-warning-700 dark:text-amber-400 border-warning-200 dark:border-amber-800/60',
    },
    PENDING: {
      labelKey: 'status.PENDING',
      icon: Clock,
      classes:
        'bg-warning-50 dark:bg-amber-950/40 text-warning-700 dark:text-amber-400 border-warning-200 dark:border-amber-800/60',
    },
    OUTSIDE_OFFICE: {
      labelKey: 'status.OUTSIDE_OFFICE',
      icon: AlertTriangle,
      classes:
        'bg-warning-50 dark:bg-amber-950/40 text-warning-700 dark:text-amber-400 border-warning-200 dark:border-amber-800/60',
    },
    ABSENT: {
      labelKey: 'status.ABSENT',
      icon: XCircle,
      classes:
        'bg-danger-50 dark:bg-danger-950/40 text-danger-700 dark:text-danger-400 border-danger-200 dark:border-danger-800/60',
    },
    REJECTED: {
      labelKey: 'status.REJECTED',
      icon: XCircle,
      classes:
        'bg-danger-50 dark:bg-danger-950/40 text-danger-700 dark:text-danger-400 border-danger-200 dark:border-danger-800/60',
    },
    LOCATION_UNRELIABLE: {
      labelKey: 'status.LOCATION_UNRELIABLE',
      icon: AlertCircle,
      classes:
        'bg-danger-50 dark:bg-danger-950/40 text-danger-700 dark:text-danger-400 border-danger-200 dark:border-danger-800/60',
    },
    EARLY_LEAVE: {
      labelKey: 'status.EARLY_LEAVE',
      icon: Clock,
      classes:
        'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/60',
    },
    ON_LEAVE: {
      labelKey: 'status.ON_LEAVE',
      icon: CalendarOff,
      classes:
        'bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400 border-brand-200 dark:border-brand-800/60',
    },
    HOLIDAY: {
      labelKey: 'status.HOLIDAY',
      icon: Sun,
      classes:
        'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60',
    },
    REST_DAY: {
      labelKey: 'status.REST_DAY',
      icon: CalendarOff,
      classes:
        'bg-slate-100 dark:bg-dark-elevated text-slate-600 dark:text-slate-400 border-slate-200 dark:border-dark-border',
    },
    LOCATION_INACTIVE: {
      labelKey: 'status.LOCATION_INACTIVE',
      icon: WifiOff,
      classes:
        'bg-slate-100 dark:bg-dark-elevated text-slate-600 dark:text-slate-400 border-slate-200 dark:border-dark-border',
    },
    LOCATION_STALE: {
      labelKey: 'status.LOCATION_STALE',
      icon: Clock,
      classes:
        'bg-slate-100 dark:bg-dark-elevated text-slate-600 dark:text-slate-400 border-slate-200 dark:border-dark-border',
    },
    MANUAL_ADJUSTMENT: {
      labelKey: 'status.MANUAL_ADJUSTMENT',
      icon: ShieldCheck,
      classes:
        'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/60',
    },
    NOT_CHECKED_IN: {
      labelKey: 'status.NOT_CHECKED_IN',
      icon: Clock,
      classes:
        'bg-slate-100 dark:bg-dark-elevated text-slate-500 dark:text-slate-400 border-slate-200 dark:border-dark-border',
    },
  };

  const item = configMap[normalized] || {
    labelKey: normalized,
    icon: CheckCircle2,
    classes:
      'bg-slate-100 dark:bg-dark-elevated text-slate-700 dark:text-slate-300 border-slate-200 dark:border-dark-border',
  };

  const Icon = item.icon;
  const label = customLabel || t(item.labelKey, { defaultValue: normalized.replace(/_/g, ' ') });

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-0.5 gap-1.5',
    lg: 'text-sm px-3 py-1 gap-2',
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border tracking-tight transition-colors ${sizeClasses} ${item.classes} ${className}`}
    >
      <Icon className={`${iconSizes} flex-shrink-0 stroke-[2.2px]`} />
      <span>{label}</span>
    </span>
  );
};
