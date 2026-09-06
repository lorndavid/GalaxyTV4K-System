import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useLocationTracker } from '../../hooks/useLocationTracker';
import { PwaInstallBanner } from '../pwa/PwaInstallBanner';
import { AppSplashScreen } from '../pwa/AppSplashScreen';
import { BottomNav } from './BottomNav';
import { ThemeToggle } from '../ui/ThemeToggle';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { AvatarUploadModal } from '../profile/AvatarUploadModal';
import { WifiOff } from 'lucide-react';

export const EmployeeLayout: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { isOnline } = useNetworkStatus();
  const { i18n } = useTranslation();
  const isKhmer = !i18n.language?.startsWith('en');

  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);

  // Automatically acquire and stream location in background when employee opens the app
  const isLocationSharingActive = user?.employee?.isLocationSharingActive ?? true;
  useLocationTracker(isLocationSharingActive, 30);

  // App bootstrap loading state (branded splash)
  if (isLoading) {
    return <AppSplashScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const employeeName = isKhmer
    ? (user?.employee?.khmerName || user?.employee?.displayName || user?.email?.split('@')[0] || 'បុគ្គលិក')
    : (user?.employee?.latinName || user?.employee?.displayName || user?.email?.split('@')[0] || 'Employee');
  const profilePhoto = user?.employee?.profilePhoto;

  const getInitials = (text: string) => {
    const parts = (text || 'Employee').trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (text || 'EM').slice(0, 2).toUpperCase();
  };

  const initials = getInitials(employeeName);

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-dark-bg flex flex-col justify-between transition-colors duration-150">
      <div className="max-w-md w-full mx-auto min-h-screen bg-white dark:bg-dark-surface flex flex-col border-x border-slate-200/80 dark:border-dark-border pb-28 shadow-xs">
        {/* Offline Notice Banner */}
        {!isOnline && (
          <div className="bg-warning-500 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 sticky top-0 z-40 animate-slide-up">
            <WifiOff className="w-3.5 h-3.5" />
            <span>You're offline. Connect to the internet to record attendance.</span>
          </div>
        )}

        {/* Top App Bar Header - Replaced static logo with interactive Profile Avatar */}
        <header className="min-h-[4.25rem] py-3 bg-white/95 dark:bg-dark-surface/95 backdrop-blur-md border-b border-slate-100 dark:border-dark-border px-4 sm:px-5 flex items-center justify-between sticky top-0 z-30 pt-[calc(env(safe-area-inset-top)+0.625rem)] transition-colors duration-150">
          <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
            {/* Clickable Profile Avatar Button (Replaces Logo) */}
            <button
              type="button"
              onClick={() => setIsAvatarModalOpen(true)}
              className="relative group cursor-pointer active:scale-95 transition-transform flex-shrink-0"
              title={isKhmer ? 'ចុចដើម្បីប្តូររូបភាពប្រវត្តិរូប (Click to change photo)' : 'Click to change profile photo'}
            >
              <div className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-brand-500/30 dark:ring-brand-400/30 bg-gradient-to-br from-brand-500/20 to-brand-600/10 flex items-center justify-center shadow-xs border-2 border-white dark:border-dark-surface">
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt={employeeName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-bold text-sm text-brand-600 dark:text-brand-400 tracking-wider">
                    {initials}
                  </span>
                )}
              </div>
            </button>

            {/* Clean Employee Name */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">
                {employeeName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <LanguageSwitcher compact />
            <ThemeToggle compact />
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 animate-fade-in text-slate-900 dark:text-slate-100">
          <PwaInstallBanner />
          <Outlet />
        </main>
      </div>

      {/* Floating Bottom Navigation with Center QR Action */}
      <BottomNav />

      {/* Interactive Avatar Upload Modal */}
      <AvatarUploadModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
      />
    </div>
  );
};
