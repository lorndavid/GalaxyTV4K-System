import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { PwaInstallBanner } from '../pwa/PwaInstallBanner';
import { AppSplashScreen } from '../pwa/AppSplashScreen';
import { BottomNav } from './BottomNav';
import { ThemeToggle } from '../ui/ThemeToggle';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { LogOut, WifiOff } from 'lucide-react';

export const EmployeeLayout: React.FC = () => {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const { isOnline } = useNetworkStatus();

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

        {/* Top App Bar Header */}
        <header className="h-14 bg-white/95 dark:bg-dark-surface/95 backdrop-blur-md border-b border-slate-100 dark:border-dark-border px-4 flex items-center justify-between sticky top-0 z-30 pt-[env(safe-area-inset-top)] transition-colors duration-150">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl p-1 bg-slate-50 dark:bg-dark-elevated border border-slate-200/80 dark:border-dark-border flex items-center justify-center flex-shrink-0 shadow-xs">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">
                {employeeName}
              </p>
              <p className="text-[10px] text-slate-400 font-mono font-medium truncate">
                {employeeCode} • {departmentName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <LanguageSwitcher compact />
            <ThemeToggle compact />
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950/40 rounded-xl transition-colors active:scale-95"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
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
