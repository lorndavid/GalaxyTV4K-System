import React from 'react';

interface BadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ status, size = 'md' }) => {
  const getColors = (s: string) => {
    switch (s?.toUpperCase()) {
      case 'PRESENT':
      case 'APPROVED':
      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'LATE':
      case 'PENDING':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'ABSENT':
      case 'REJECTED':
      case 'REVOKED':
      case 'SUSPENDED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'EARLY_LEAVE':
      case 'EXPIRED':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'ON_LEAVE':
      case 'CANCELLED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'MANUAL_ADJUSTMENT':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const formatText = (s: string) => {
    return s?.replace(/_/g, ' ');
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium uppercase tracking-wider ${sizeClasses} ${getColors(
        status
      )}`}
    >
      {formatText(status)}
    </span>
  );
};
