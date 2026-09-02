import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Clock3, CalendarDays, User, QrCode } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),12px)] select-none">
      <nav className="max-w-md mx-auto bg-white/95 dark:bg-dark-surface/95 backdrop-blur-2xl border border-slate-200/90 dark:border-dark-border rounded-3xl shadow-floating px-2 py-1.5 transition-colors duration-150 relative">
        <div className="grid grid-cols-5 items-center gap-1">
          {/* 1. Home */}
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all duration-200 min-h-[46px] active:scale-95 ${
                isActive
                  ? 'text-brand-600 dark:text-brand-400 font-bold'
                  : 'text-slate-400 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Home
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'stroke-[2.5px] scale-110 text-brand-600 dark:text-brand-400' : 'stroke-[1.8px]'
                  }`}
                />
                <span className="text-[10px] tracking-tight mt-0.5 truncate">{t('common.home', 'Home')}</span>
              </>
            )}
          </NavLink>

          {/* 2. Attendance History */}
          <NavLink
            to="/attendance"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all duration-200 min-h-[46px] active:scale-95 ${
                isActive
                  ? 'text-brand-600 dark:text-brand-400 font-bold'
                  : 'text-slate-400 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Clock3
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'stroke-[2.5px] scale-110 text-brand-600 dark:text-brand-400' : 'stroke-[1.8px]'
                  }`}
                />
                <span className="text-[10px] tracking-tight mt-0.5 truncate">{t('common.attendance', 'Attendance')}</span>
              </>
            )}
          </NavLink>

          {/* 3. Center Elevated Direct Camera QR Scan Action */}
          <div className="flex flex-col items-center justify-center relative -top-5 pointer-events-auto">
            <NavLink
              to="/scan"
              className={({ isActive }) =>
                `w-14 h-14 rounded-full bg-gradient-to-tr from-brand-600 to-blue-500 hover:from-brand-700 hover:to-blue-600 text-white flex flex-col items-center justify-center shadow-floating border-4 border-slate-50 dark:border-dark-bg transition-all duration-200 active:scale-90 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                  isActive ? 'ring-2 ring-brand-500 ring-offset-2 scale-105 shadow-brand-500/40 shadow-xl' : ''
                }`
              }
              aria-label="Open Camera QR Scanner"
            >
              <QrCode className="w-7 h-7 stroke-[2.2px]" />
            </NavLink>
            <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 mt-0.5">
              QR Scan
            </span>
          </div>

          {/* 4. Leave */}
          <NavLink
            to="/leave"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all duration-200 min-h-[46px] active:scale-95 ${
                isActive
                  ? 'text-brand-600 dark:text-brand-400 font-bold'
                  : 'text-slate-400 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <CalendarDays
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'stroke-[2.5px] scale-110 text-brand-600 dark:text-brand-400' : 'stroke-[1.8px]'
                  }`}
                />
                <span className="text-[10px] tracking-tight mt-0.5 truncate">{t('common.leave', 'Leave')}</span>
              </>
            )}
          </NavLink>

          {/* 5. Profile */}
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all duration-200 min-h-[46px] active:scale-95 ${
                isActive
                  ? 'text-brand-600 dark:text-brand-400 font-bold'
                  : 'text-slate-400 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <User
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'stroke-[2.5px] scale-110 text-brand-600 dark:text-brand-400' : 'stroke-[1.8px]'
                  }`}
                />
                <span className="text-[10px] tracking-tight mt-0.5 truncate">{t('common.profile', 'Profile')}</span>
              </>
            )}
          </NavLink>
        </div>
      </nav>
    </div>
  );
};
