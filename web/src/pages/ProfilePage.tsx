import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import {
  User,
  Building2,
  Mail,
  Phone,
  Clock,
  LogOut,
  ShieldCheck,
  MapPin,
  Palette,
  Globe,
  ChevronRight,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const emp = user?.employee;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="pt-1">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          {t('common.profile')}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Your official employment and application preferences
        </p>
      </div>

      {/* Main Identity Profile Card */}
      <Card className="p-6 text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center text-white text-2xl font-bold mx-auto shadow-subtle">
          {emp?.firstName?.[0] || emp?.displayName?.[0] || 'U'}
        </div>

        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {emp?.displayName || 'Employee'}
          </h2>
          <p className="text-xs font-semibold text-brand-600 dark:text-brand-400">
            {emp?.position || 'Staff'}
          </p>
          <span className="inline-block mt-1 font-mono text-[11px] font-bold bg-slate-100 dark:bg-dark-elevated text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-dark-border">
            {emp?.employeeCode || 'EMP-001'}
          </span>
        </div>
      </Card>

      {/* Preferences & Appearance Card */}
      <Card className="p-4 space-y-3.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Preferences & Settings
        </h3>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 font-semibold">
            <Palette className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <span>Theme Mode</span>
          </div>
          <ThemeToggle />
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-dark-border">
          <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 font-semibold">
            <Globe className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <span>App Language</span>
          </div>
          <LanguageSwitcher />
        </div>

        <div className="pt-1 border-t border-slate-100 dark:border-dark-border">
          <Link
            to="/location-privacy"
            className="flex items-center justify-between text-xs py-1 hover:text-brand-600 transition-colors"
          >
            <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300 font-semibold">
              <MapPin className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              <span>Location & Privacy Settings</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>
        </div>
      </Card>

      {/* Detailed Info List */}
      <Card padding="none" className="divide-y divide-slate-100 dark:divide-dark-border overflow-hidden text-xs">
        <div className="p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 font-medium">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span>Department</span>
          </div>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {emp?.department?.name || 'General'}
          </span>
        </div>

        <div className="p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 font-medium">
            <Mail className="w-4 h-4 text-slate-400" />
            <span>Email</span>
          </div>
          <span className="font-semibold text-slate-900 dark:text-slate-100">{user?.email}</span>
        </div>

        <div className="p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 font-medium">
            <Phone className="w-4 h-4 text-slate-400" />
            <span>Phone</span>
          </div>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {emp?.phone || '+855 12 345 678'}
          </span>
        </div>

        <div className="p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 font-medium">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Assigned Shift</span>
          </div>
          <span className="font-semibold text-brand-600 dark:text-brand-400">
            {emp?.schedule?.name || 'Standard Mon-Sat'}
          </span>
        </div>
      </Card>

      {/* Log Out Button */}
      <Button
        variant="secondary"
        size="lg"
        className="w-full text-danger-600 dark:text-danger-400 hover:text-danger-700 hover:bg-danger-50 dark:hover:bg-danger-950/40 border-danger-200 dark:border-danger-800/60"
        icon={LogOut}
        onClick={logout}
      >
        {t('common.signOut')}
      </Button>
    </div>
  );
};
