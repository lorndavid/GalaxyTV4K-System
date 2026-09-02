import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { ProfileInfoRow } from '../components/profile/ProfileInfoRow';
import { SettingsSection } from '../components/settings/SettingsSection';
import { SettingsRow } from '../components/settings/SettingsRow';
import { ConfirmationModal } from '../components/settings/ConfirmationModal';
import { ChangePasswordModal } from '../components/settings/ChangePasswordModal';
import { ActiveSessionsModal } from '../components/settings/ActiveSessionsModal';
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Building2,
  Calendar,
  Sparkles,
  Palette,
  Languages,
  Type,
  KeyRound,
  MonitorSmartphone,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Award,
  BookOpen,
  Settings as SettingsIcon,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, currentColor, khmerFont, englishFont } = usePreferences();

  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const emp = user?.employee;
  const currentLang = i18n.language || 'km';

  const handleToggleLanguage = () => {
    const nextLang = currentLang === 'km' ? 'en' : 'km';
    i18n.changeLanguage(nextLang);
    try {
      localStorage.setItem('system_hr_language', nextLang);
      document.documentElement.lang = nextLang;
    } catch {}
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } catch (e) {
      navigate('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="space-y-5 max-w-xl mx-auto pb-14 animate-fade-in">
      {/* Top Bar with Segmented Tab Navigation: Profile / Settings */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-dark-elevated rounded-2xl border border-slate-200/60 dark:border-dark-border">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
              activeTab === 'profile'
                ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 shadow-xs border border-slate-200/80 dark:border-dark-border'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            {t('profile.tabProfile', 'Profile')}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
              activeTab === 'settings'
                ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 shadow-xs border border-slate-200/80 dark:border-dark-border'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            {t('profile.tabSettings', 'Settings')}
          </button>
        </div>

        <button
          onClick={() => navigate('/settings')}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-dark-elevated transition-colors active:scale-95"
          title="All Settings"
          aria-label="Open Settings"
        >
          <SettingsIcon className="w-5 h-5 stroke-[1.8]" />
        </button>
      </div>

      {/* Profile Header Card */}
      <ProfileHeader
        displayName={emp?.displayName || user?.email?.split('@')[0] || 'Employee'}
        latinName={emp?.latinName}
        employeeCode={emp?.employeeCode || 'EMP-001'}
        position={emp?.position || 'Employee'}
        departmentName={emp?.department?.name || 'General Department'}
      />

      {activeTab === 'profile' ? (
        <div className="space-y-5 animate-fade-in">
          {/* Section 1: Personal Information */}
          <SettingsSection
            title={t('profile.personalInfo', 'Personal Information')}
            description={t('profile.personalInfoDesc', 'Your legal identity and contact details')}
          >
            <ProfileInfoRow
              icon={User}
              label={t('profile.fullName', 'Full Name')}
              value={emp?.displayName || '—'}
            />

            {emp?.khmerName && (
              <ProfileInfoRow
                icon={User}
                label={t('profile.khmerName', 'Khmer Name')}
                value={emp.khmerName}
              />
            )}

            {emp?.latinName && (
              <ProfileInfoRow
                icon={User}
                label={t('profile.latinName', 'Latin Name')}
                value={emp.latinName}
              />
            )}

            <ProfileInfoRow
              icon={Mail}
              label={t('profile.email', 'Work Email')}
              value={emp?.email || user?.email || '—'}
              copyable={true}
              copyValue={emp?.email || user?.email}
            />

            <ProfileInfoRow
              icon={Phone}
              label={t('profile.phone', 'Phone Number')}
              value={emp?.phone || '+855 (0) 12 345 678'}
              copyable={!!emp?.phone}
            />

            {emp?.gender && (
              <ProfileInfoRow
                icon={User}
                label={t('profile.gender', 'Gender')}
                value={emp.gender}
              />
            )}
          </SettingsSection>

          {/* Section 2: Work Information */}
          <SettingsSection
            title={t('profile.workInfo', 'Work Information')}
            description={t('profile.workInfoDesc', 'Department assignment, role, and schedule')}
          >
            <ProfileInfoRow
              icon={Briefcase}
              label={t('profile.employeeId', 'Employee ID')}
              value={emp?.employeeCode || 'EMP-001'}
              copyable={true}
            />

            <ProfileInfoRow
              icon={Building2}
              label={t('profile.department', 'Department')}
              value={emp?.department?.name || 'General Operations'}
            />

            <ProfileInfoRow
              icon={Briefcase}
              label={t('profile.position', 'Position')}
              value={emp?.position || 'Staff Member'}
            />

            {emp?.skill && (
              <ProfileInfoRow
                icon={Award}
                label={t('profile.skill', 'Specialization')}
                value={emp.skill}
              />
            )}

            {emp?.studyDay && (
              <ProfileInfoRow
                icon={BookOpen}
                label={t('profile.studyDay', 'Study / Shift Schedule')}
                value={emp.studyDay}
              />
            )}

            {/* Quick Attendance History Link Row */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate('/attendance')}
              className="min-h-[52px] py-3 px-4 flex items-center justify-between gap-3 text-xs cursor-pointer hover:bg-slate-50/50 dark:hover:bg-dark-elevated/30 transition-colors select-none"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 stroke-[1.8]" />
                </div>
                <div>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                    {t('profile.attendanceHistory', 'Attendance History')}
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    {t('profile.attendanceHistoryDesc', 'Review monthly punches and work hours')}
                  </span>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-400 stroke-[2] flex-shrink-0" />
            </div>
          </SettingsSection>

          {/* Section 3: Quick Preferences */}
          <SettingsSection
            title={t('profile.preferences', 'Preferences')}
            description={t('profile.preferencesDesc', 'Personalize display, colors, and typography')}
          >
            <SettingsRow
              icon={Palette}
              title={t('profile.appearance', 'Appearance & Theme')}
              description={`${t(`settings.${theme}`, theme)} • ${currentColor.name}`}
              value={
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-3.5 h-3.5 rounded-full inline-block shadow-xs border border-white dark:border-dark-surface"
                    style={{ backgroundColor: currentColor.primary }}
                  />
                  <span className="capitalize">{currentColor.name}</span>
                </div>
              }
              onClick={() => navigate('/settings/appearance')}
            />

            <SettingsRow
              icon={Languages}
              title={t('profile.language', 'Language')}
              description={currentLang === 'km' ? 'ភាសាខ្មែរ (Khmer)' : 'English (US)'}
              value={currentLang === 'km' ? 'ខ្មែរ' : 'English'}
              onClick={handleToggleLanguage}
            />

            <SettingsRow
              icon={Type}
              title={t('profile.typography', 'Typography')}
              description={`${khmerFont} / ${englishFont}`}
              value={englishFont}
              onClick={() => navigate('/settings/typography')}
            />
          </SettingsSection>

          {/* Section 4: Security & Sign Out */}
          <SettingsSection title={t('profile.security', 'Security')}>
            <SettingsRow
              icon={KeyRound}
              title={t('profile.changePassword', 'Change Password')}
              description={t('profile.changePasswordDesc', 'Update your sign-in credentials')}
              onClick={() => setIsPasswordModalOpen(true)}
            />

            <SettingsRow
              icon={MonitorSmartphone}
              title={t('profile.activeSessions', 'Active Sessions')}
              description={t('profile.activeSessionsDesc', 'Manage devices signed into your account')}
              value="1 Device"
              onClick={() => setIsSessionsModalOpen(true)}
            />

            <SettingsRow
              icon={LogOut}
              title={t('common.signOut', 'Sign Out')}
              description="Sign out from this device"
              destructive={true}
              showChevron={false}
              onClick={() => setIsLogoutModalOpen(true)}
            />
          </SettingsSection>
        </div>
      ) : (
        /* Settings Tab View */
        <div className="space-y-5 animate-fade-in">
          <SettingsSection title={t('profile.preferences', 'Preferences')}>
            <SettingsRow
              icon={Palette}
              title={t('profile.appearance', 'Appearance & Theme')}
              description={`${t(`settings.${theme}`, theme)} • ${currentColor.name}`}
              value={
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-3.5 h-3.5 rounded-full inline-block shadow-xs border border-white dark:border-dark-surface"
                    style={{ backgroundColor: currentColor.primary }}
                  />
                  <span className="capitalize">{currentColor.name}</span>
                </div>
              }
              onClick={() => navigate('/settings/appearance')}
            />

            <SettingsRow
              icon={Languages}
              title={t('profile.language', 'Language')}
              description={currentLang === 'km' ? 'ភាសាខ្មែរ (Khmer)' : 'English (US)'}
              value={currentLang === 'km' ? 'ខ្មែរ' : 'English'}
              onClick={handleToggleLanguage}
            />

            <SettingsRow
              icon={Type}
              title={t('profile.typography', 'Typography & Fonts')}
              description={`${khmerFont} / ${englishFont}`}
              value={englishFont}
              onClick={() => navigate('/settings/typography')}
            />
          </SettingsSection>

          <SettingsSection title={t('profile.privacy', 'Privacy')}>
            <SettingsRow
              icon={ShieldCheck}
              title={t('common.locationPrivacy', 'Location & Geofence Privacy')}
              description="Review company office radius check status"
              value="Active"
              onClick={() => navigate('/location-privacy')}
            />
          </SettingsSection>

          <SettingsSection title={t('profile.security', 'Security')}>
            <SettingsRow
              icon={KeyRound}
              title={t('profile.changePassword', 'Change Password')}
              onClick={() => setIsPasswordModalOpen(true)}
            />

            <SettingsRow
              icon={MonitorSmartphone}
              title={t('profile.activeSessions', 'Active Sessions')}
              value="1 Device"
              onClick={() => setIsSessionsModalOpen(true)}
            />

            <SettingsRow
              icon={LogOut}
              title={t('common.signOut', 'Sign Out')}
              destructive={true}
              showChevron={false}
              onClick={() => setIsLogoutModalOpen(true)}
            />
          </SettingsSection>
        </div>
      )}

      {/* Confirmation & Security Modals */}
      <ConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
        title={t('profile.signOutConfirmTitle', 'Sign out of this device?')}
        description={t(
          'profile.signOutConfirmDesc',
          'You will need to sign back in with your employee email and password to punch attendance.'
        )}
        confirmLabel={t('common.signOut', 'Sign Out')}
        cancelLabel={t('common.cancel', 'Cancel')}
        destructive={true}
        isLoading={isLoggingOut}
      />

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />

      <ActiveSessionsModal
        isOpen={isSessionsModalOpen}
        onClose={() => setIsSessionsModalOpen(false)}
      />
    </div>
  );
};
