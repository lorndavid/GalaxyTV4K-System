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

  return (
    <div className="space-y-4 animate-fade-in pb-4">
      {/* Header */}
      <div className="pt-1">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight font-sans">
          {t('common.profile', 'គណនីបុគ្គលិក')}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          ព័ត៌មានលម្អិតអំពីបុគ្គលិក និងការកំណត់កម្មវិធី
        </p>
      </div>

      {/* Main Identity Profile Card */}
      <Card className="p-6 text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center text-white text-2xl font-bold mx-auto shadow-subtle border-2 border-brand-400/30">
          {(emp?.khmerName || emp?.displayName || 'U').charAt(0)}
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-sans">
            {emp?.khmerName || emp?.displayName || 'បុគ្គលិក'}
          </h2>
          {emp?.latinName && (
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {emp.latinName}
            </p>
          )}
          <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 pt-0.5">
            {emp?.position || 'Staff'}
          </p>
          <span className="inline-block mt-1 font-mono text-[11px] font-bold bg-slate-100 dark:bg-dark-elevated text-slate-700 dark:text-slate-300 px-3 py-0.5 rounded-full border border-slate-200 dark:border-dark-border">
            {emp?.employeeCode || 'EMP-001'}
          </span>
        </div>
      </Card>

      {/* 8 Official Employee Details Card */}
      <Card padding="none" className="divide-y divide-slate-100 dark:divide-dark-border overflow-hidden text-xs">
        <div className="p-3.5 bg-slate-50/80 dark:bg-dark-elevated/50 font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
          <span>ព័ត៌មានការងារ (Employment Profile)</span>
          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-brand-400">
            {emp?.gender || 'ប្រុស'}
          </span>
        </div>

        {/* 1. ឈ្មោះ (Khmer Name) */}
        <div className="p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 font-medium">
            <User className="w-4 h-4 text-slate-400" />
            <span>ឈ្មោះ (Khmer Name)</span>
          </div>
          <span className="font-bold text-slate-900 dark:text-slate-100 font-sans">
            {emp?.khmerName || emp?.displayName || '—'}
          </span>
        </div>

        {/* 2. ឡាតាំង (Latin Name) */}
        <div className="p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 font-medium">
            <UserCheck className="w-4 h-4 text-slate-400" />
            <span>ឡាតាំង (Latin Name)</span>
          </div>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {emp?.latinName || emp?.displayName || '—'}
          </span>
        </div>

        {/* 3. ជំនាញ (Skill) */}
        <div className="p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 font-medium">
            <GraduationCap className="w-4 h-4 text-slate-400" />
            <span>ជំនាញ (Skill)</span>
          </div>
          <span className="font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200/60 dark:border-blue-800/40">
            {emp?.skill || 'General Specialist'}
          </span>
        </div>

        {/* 4. ថ្ងៃរៀន (Study Day / Shift) */}
        <div className="p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 font-medium">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>ថ្ងៃរៀន (Study Days / Shift)</span>
          </div>
          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
            {emp?.studyDay || 'ច័ន្ទ - សុក្រ (Mon - Fri)'}
          </span>
        </div>

        {/* 5. លេខទូរសព្ទ (Phone) */}
        <div className="p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 font-medium">
            <Phone className="w-4 h-4 text-slate-400" />
            <span>លេខទូរសព្ទ (Phone)</span>
          </div>
          <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
            {emp?.phone || '012 345 678'}
          </span>
        </div>

        {/* 6. តួនាទី (Role / Position) */}
        <div className="p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 font-medium">
            <Briefcase className="w-4 h-4 text-slate-400" />
            <span>តួនាទី (Position)</span>
          </div>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {emp?.position || 'Staff'}
          </span>
        </div>

        {/* 7. ផ្នែកការងារ (Department) */}
        <div className="p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 font-medium">
            <Building2 className="w-4 h-4 text-slate-400" />
            <span>ផ្នែកការងារ (Department)</span>
          </div>
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {emp?.department?.name || 'Galaxy TV4K Operations'}
          </span>
        </div>

        {/* 8. Work Email */}
        <div className="p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 font-medium">
            <Mail className="w-4 h-4 text-slate-400" />
            <span>អ៊ីមែលការងារ (Email)</span>
          </div>
          <span className="font-mono text-slate-800 dark:text-slate-200">{user?.email}</span>
        </div>
      </Card>

      {/* Preferences & Appearance Card */}
      <Card className="p-4 space-y-3.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          ការកំណត់ & ភាសា (Settings & Language)
        </h3>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 font-semibold">
            <Palette className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <span>ស្បែកផ្ទៃ (Theme Mode)</span>
          </div>
          <ThemeToggle />
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-dark-border">
          <div className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 font-semibold">
            <Globe className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <span>ភាសាកម្មវិធី (Language)</span>
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
              <span>ការចែករំលែកទីតាំង (Location & Privacy)</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>
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
        {t('common.signOut', 'ចាកចេញពីគណនី')}
      </Button>
    </div>
  );
};
