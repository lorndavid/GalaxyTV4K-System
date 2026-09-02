import React from 'react';

interface ProfileAvatarProps {
  name: string;
  photoUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  className?: string;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  name,
  photoUrl,
  size = 'lg',
  showStatus = true,
  className = '',
}) => {
  // Extract initials (up to 2 characters)
  const getInitials = (text: string) => {
    const parts = (text || 'Employee').trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (text || 'EM').slice(0, 2).toUpperCase();
  };

  const initials = getInitials(name);

  // Size mapping:
  // sm: 40px (header)
  // md: 56px (list)
  // lg: 80px mobile / 96px desktop
  // xl: 96px mobile / 112px desktop
  const sizeClasses = {
    sm: 'w-10 h-10 text-xs',
    md: 'w-14 h-14 text-base',
    lg: 'w-20 h-20 sm:w-24 sm:h-24 text-2xl sm:text-3xl',
    xl: 'w-24 h-24 sm:w-28 sm:h-28 text-3xl sm:text-4xl',
  }[size];

  const statusSizeClasses = {
    sm: 'w-2.5 h-2.5 right-0 bottom-0 border-2',
    md: 'w-3.5 h-3.5 right-0.5 bottom-0.5 border-2',
    lg: 'w-4 h-4 right-1 bottom-1 border-2',
    xl: 'w-5 h-5 right-1.5 bottom-1.5 border-[3px]',
  }[size];

  return (
    <div className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}>
      {/* Avatar Container */}
      <div
        className={`${sizeClasses} rounded-full flex items-center justify-center font-bold text-white shadow-md select-none border-2 border-white dark:border-dark-surface overflow-hidden`}
        style={{
          background: 'linear-gradient(135deg, var(--color-primary, #2563EB), var(--color-primary-hover, #1D4ED8))',
        }}
      >
        {photoUrl ? (
          <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="tracking-wider">{initials}</span>
        )}
      </div>

      {/* Online / Active Status Pill */}
      {showStatus && (
        <span
          className={`absolute rounded-full bg-emerald-500 border-white dark:border-dark-surface shadow-xs ${statusSizeClasses}`}
          title="Active status"
          aria-label="Active status"
        />
      )}
    </div>
  );
};
