import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useLocationTracker } from '../../hooks/useLocationTracker';
import { PwaInstallBanner } from '../pwa/PwaInstallBanner';
import { AppSplashScreen } from '../pwa/AppSplashScreen';
import { BottomNav } from './BottomNav';
import { ThemeToggle } from '../ui/ThemeToggle';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { WifiOff } from 'lucide-react';

export const EmployeeLayout: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { isOnline } = useNetworkStatus();

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

  const employeeName = user?.employee?.displayName || user?.email?.split('@')[0] || 'Employee';
  const employeeCode = user?.employee?.employeeCode || 'EMP';
  const departmentName = user?.employee?.department?.name || 'Staff Member';

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

        {/* Top App Bar Header - Resized +20% with larger brand mark & improved typography */}
        <header className="min-h-[4.25rem] py-3 bg-white/95 dark:bg-dark-surface/95 backdrop-blur-md border-b border-slate-100 dark:border-dark-border px-4 sm:px-5 flex items-center justify-between sticky top-0 z-30 pt-[calc(env(safe-area-inset-top)+0.625rem)] transition-colors duration-150">
          <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
            <div className="w-10 h-10 rounded-xl p-1.5 bg-slate-50 dark:bg-dark-elevated border border-slate-200/80 dark:border-dark-border flex items-center justify-center flex-shrink-0 shadow-xs">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">
                {employeeName}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight mt-0.5 break-words">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{employeeCode}</span>
                <span className="mx-1.5 text-slate-300 dark:text-slate-600">•</span>
                <span>{departmentName}</span>
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
    </div>
  );
};
