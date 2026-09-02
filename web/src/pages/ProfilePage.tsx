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
  GraduationCap,
  Calendar,
  Briefcase,
  UserCheck,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const emp = user?.employee;

  const displayName = emp?.khmerName || emp?.latinName || emp?.displayName || 'Employee';
  const initial = (emp?.latinName || emp?.khmerName || emp?.displayName || 'U').charAt(0).toUpperCase();

  return (
    <div className="space-y-4 animate-fade-in pb-6">
      {/* Header */}
      <div className="pt-1">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          {t('profile.title', 'My Profile')}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
          {t('profile.subtitle', 'Personal employment details and preferences')}
        </p>
      </div>

      {/* Main Identity Profile Card */}
      <Card className="p-5 text-center space-y-3 border border-slate-100 dark:border-dark-border">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-blue-500 flex items-center justify-center text-white text-2xl font-bold mx-auto shadow-md shadow-brand-500/20">
          {initial}
        </div>

        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {displayName}
          </h2>
          {emp?.latinName && emp?.khmerName && (
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
              {emp.latinName}
            </p>
          )}
          <p className="text-xs font-medium text-brand-600 dark:text-brand-400 pt-0.5">
            {emp?.position || 'Staff'} • {emp?.department?.name || 'Operations'}
          </p>
          <div className="pt-1">
            <span className="inline-block text-[11px] font-medium bg-slate-100 dark:bg-dark-elevated text-slate-600 dark:text-slate-300 px-3 py-0.5 rounded-full border border-slate-200/60 dark:border-dark-border">
              {emp?.employeeCode || 'EMP-001'}
            </span>
          </div>
        </div>
      </Card>

      {/* Group 1: Personal & Contact Information */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-0.5">
          {t('profile.employmentInfo', 'Personal Information')}
        </h2>

        <Card padding="none" className="divide-y divide-slate-100 dark:divide-dark-border overflow-hidden text-xs border border-slate-100 dark:border-dark-border">
          {/* Khmer Name */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 font-normal">
              <User className="w-4 h-4 text-slate-400 stroke-[1.8]" />
              <span>{t('profile.khmerName', 'Khmer Name')}</span>
            </div>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {emp?.khmerName || emp?.displayName || '—'}
            </span>
          </div>

          {/* Latin Name */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 font-normal">
              <UserCheck className="w-4 h-4 text-slate-400 stroke-[1.8]" />
              <span>{t('profile.latinName', 'Latin Name')}</span>
            </div>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {emp?.latinName || emp?.displayName || '—'}
            </span>
          </div>

          {/* Gender */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 font-normal">
              <User className="w-4 h-4 text-slate-400 stroke-[1.8]" />
              <span>{t('profile.gender', 'Gender')}</span>
            </div>
            <span className="font-medium text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded bg-slate-100 dark:bg-dark-elevated text-[11px]">
              {emp?.gender || 'Male'}
            </span>
          </div>

          {/* Phone */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 font-normal">
              <Phone className="w-4 h-4 text-slate-400 stroke-[1.8]" />
              <span>{t('profile.phone', 'Phone')}</span>
            </div>
            <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
              {emp?.phone || '—'}
            </span>
          </div>

          {/* Email */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 font-normal">
              <Mail className="w-4 h-4 text-slate-400 stroke-[1.8]" />
              <span>{t('profile.email', 'Work Email')}</span>
            </div>
            <span className="font-normal text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
              {user?.email}
            </span>
          </div>
        </Card>
      </div>

      {/* Group 2: Job & Specialization Details */}
      <div className="space-y-2 pt-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-0.5">
          {t('profile.position', 'Role & Specialization')}
        </h2>

        <Card padding="none" className="divide-y divide-slate-100 dark:divide-dark-border overflow-hidden text-xs border border-slate-100 dark:border-dark-border">
          {/* Position */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 font-normal">
              <Briefcase className="w-4 h-4 text-slate-400 stroke-[1.8]" />
              <span>{t('profile.position', 'Role / Position')}</span>
            </div>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {emp?.position || 'Staff'}
            </span>
          </div>

          {/* Department */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 font-normal">
              <Building2 className="w-4 h-4 text-slate-400 stroke-[1.8]" />
              <span>{t('profile.department', 'Department')}</span>
            </div>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {emp?.department?.name || 'Galaxy TV4K Operations'}
            </span>
          </div>

          {/* Skill / Specialization */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 font-normal">
              <GraduationCap className="w-4 h-4 text-slate-400 stroke-[1.8]" />
              <span>{t('profile.skill', 'Skill / Specialization')}</span>
            </div>
            <span className="font-medium text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/50 px-2 py-0.5 rounded text-[11px] border border-brand-100 dark:border-brand-900/50">
              {emp?.skill || 'General'}
            </span>
          </div>

          {/* Study Day / Shift */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 font-normal">
              <Calendar className="w-4 h-4 text-slate-400 stroke-[1.8]" />
              <span>{t('profile.studyDay', 'Study Schedule / Shift')}</span>
            </div>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {emp?.studyDay || 'Mon – Fri'}
            </span>
          </div>
        </Card>
      </div>

      {/* Group 3: Settings & Preferences */}
      <div className="space-y-2 pt-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-0.5">
          {t('profile.preferences', 'Settings & Preferences')}
        </h2>

        <Card padding="none" className="divide-y divide-slate-100 dark:divide-dark-border overflow-hidden text-xs border border-slate-100 dark:border-dark-border">
          {/* Theme Mode Toggle */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 font-normal">
              <Palette className="w-4 h-4 text-slate-400 stroke-[1.8]" />
              <span>{t('profile.theme', 'Theme Mode')}</span>
            </div>
            <ThemeToggle />
          </div>

          {/* App Language Toggle */}
          <div className="p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 font-normal">
              <Globe className="w-4 h-4 text-slate-400 stroke-[1.8]" />
              <span>{t('profile.appLanguage', 'App Language')}</span>
            </div>
            <LanguageSwitcher />
          </div>

          {/* Location & Privacy Link */}
          <Link
            to="/location-privacy"
            className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-dark-elevated/50 transition-colors"
          >
            <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 font-normal">
              <MapPin className="w-4 h-4 text-emerald-500 stroke-[1.8]" />
              <span>{t('profile.locationPrivacy', 'Location & Privacy Settings')}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 stroke-[2]" />
          </Link>
        </Card>
      </div>

      {/* Sign Out Action Button */}
      <div className="pt-2">
        <Button
          variant="secondary"
          size="lg"
          icon={LogOut}
          onClick={logout}
          className="w-full text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-slate-200 dark:border-dark-border rounded-xl font-semibold text-xs"
        >
          {t('common.signOut', 'Sign Out')}
        </Button>
      </div>
    </div>
  );
};
