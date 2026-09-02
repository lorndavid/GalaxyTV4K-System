import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Users,
  Clock,
  QrCode,
  MapPin,
  CalendarDays,
  Calendar,
  CalendarOff,
  DoorOpen,
  BarChart3,
  Building2,
  Send,
  Settings,
  ShieldAlert,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  const navItems = [
    { path: '/', labelKey: 'common.dashboard', icon: LayoutDashboard },
    { path: '/employees', labelKey: 'common.employees', icon: Users },
    { path: '/attendance', labelKey: 'common.attendance', icon: Clock },
    { path: '/qr-station', labelKey: 'common.qrAttendance', icon: QrCode },
    { path: '/location', labelKey: 'common.employeeLocation', icon: MapPin },
    { path: '/schedules', labelKey: 'common.schedules', icon: CalendarDays },
    { path: '/holidays', labelKey: 'common.holidays', icon: Calendar },
    { path: '/leave', labelKey: 'common.leaveRequests', icon: CalendarOff },
    { path: '/out-requests', labelKey: 'common.outRequests', icon: DoorOpen },
    { path: '/reports', labelKey: 'common.reports', icon: BarChart3 },
    { path: '/telegram', labelKey: 'common.telegram', icon: Send },
    { path: '/settings', labelKey: 'common.settings', icon: Settings },
    { path: '/audit-logs', labelKey: 'common.auditLogs', icon: ShieldAlert },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white dark:bg-[#0f172a] border-r border-slate-200 dark:border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl p-1 bg-slate-50 dark:bg-dark-elevated border border-slate-200/80 dark:border-slate-700 flex items-center justify-center flex-shrink-0 shadow-xs">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100 tracking-tight block">
                Galaxy TV4K
              </span>
              <span className="text-[10px] text-slate-400 font-medium block">
                Admin Management
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => onClose()}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-xl transition-all duration-150 ${
                    isActive
                      ? 'bg-brand-50 dark:bg-brand-500/15 text-brand-600 dark:text-brand-400 font-bold border-l-2 border-brand-600 dark:border-brand-500 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100 border-l-2 border-transparent'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0 stroke-[2.2px]" />
                <span className="truncate">{t(item.labelKey)}</span>
              </NavLink>
            );
          })}
        </div>

        {/* User Profile & Logout Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/60">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/60 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-brand-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                {user?.email?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {user?.employee?.displayName || 'Administrator'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title={t('common.signOut')}
              className="p-1.5 text-slate-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950/40 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
