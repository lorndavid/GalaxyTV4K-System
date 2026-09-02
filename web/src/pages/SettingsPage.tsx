import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { usePwaUpdate } from '../contexts/PwaUpdateContext';
import { useToast } from '../components/ui/Toast';
import { SettingsSection } from '../components/settings/SettingsSection';
import { SettingsRow } from '../components/settings/SettingsRow';
import { ConfirmationModal } from '../components/settings/ConfirmationModal';
import { ChangePasswordModal } from '../components/settings/ChangePasswordModal';
import { ActiveSessionsModal } from '../components/settings/ActiveSessionsModal';
import {
  Palette,
  Languages,
  Type,
  Bell,
  ShieldCheck,
  KeyRound,
  MonitorSmartphone,
  LogOut,
  Info,
  ChevronLeft,
  FileText,
  Lock,
  RefreshCw,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { logout } = useAuth();
  const { showToast } = useToast();
  const {
    currentVersion,
    updateAvailable,
    updateStage,
    checkForPwaUpdate,
    performUpdate,
  } = usePwaUpdate();

  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const {
    theme,
    currentColor,
    khmerFont,
    englishFont,
    attendanceNotifications,
    setAttendanceNotifications,
    leaveNotifications,
    setLeaveNotifications,
  } = usePreferences();

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  const handleCheckUpdates = async () => {
    setIsCheckingUpdate(true);
    try {
      const hasUpdate = await checkForPwaUpdate();
      if (!hasUpdate) {
        showToast(t('pwa.upToDate', 'You are using the latest version.'));
      }
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-dark-elevated transition-colors active:scale-95"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5 stroke-[2]" />
        </button>

        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {t('common.settings', 'Settings')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
            {t('profile.preferences', 'Preferences and system settings')}
          </p>
        </div>
      </div>

      {/* 1. Preferences: Appearance, Language, Typography */}
      <SettingsSection
        title={t('profile.preferences', 'Preferences')}
        description={t('profile.preferencesDesc', 'Customize visual theme, language, and fonts')}
      >
        <SettingsRow
          icon={Palette}
          title={t('profile.appearance', 'Appearance & Colors')}
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

      {/* 2. Notifications */}
      <SettingsSection
        title={t('profile.notifications', 'Notifications')}
        description={t('profile.notificationsDesc', 'Attendance reminders and leave request updates')}
      >
        <SettingsRow
          icon={Bell}
          title={t('settings.attendanceNotifications', 'Attendance Reminders')}
          description={t('settings.attendanceNotificationsDesc', 'Notify before shift starts and punch confirmation')}
          isToggle={true}
          toggleChecked={attendanceNotifications}
          onToggleChange={setAttendanceNotifications}
          showChevron={false}
        />

        <SettingsRow
          icon={Bell}
          title={t('settings.leaveNotifications', 'Leave Request Updates')}
          description={t('settings.leaveNotificationsDesc', 'Notify when your manager reviews a leave request')}
          isToggle={true}
          toggleChecked={leaveNotifications}
          onToggleChange={setLeaveNotifications}
          showChevron={false}
        />
      </SettingsSection>

      {/* 3. Privacy */}
      <SettingsSection
        title={t('profile.privacy', 'Privacy')}
        description={t('profile.privacyDesc', 'GPS perimeter check and location sharing status')}
      >
        <SettingsRow
          icon={ShieldCheck}
          title={t('common.locationPrivacy', 'Location & Geofence Privacy')}
          description="View company office radius check status"
          value="Enabled"
          onClick={() => navigate('/location-privacy')}
        />
      </SettingsSection>

      {/* 4. Security */}
      <SettingsSection
        title={t('profile.security', 'Security')}
        description={t('profile.securityDesc', 'Password management and active sessions')}
      >
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

      {/* 5. About */}
      <SettingsSection title={t('profile.about', 'About')}>
        <SettingsRow
          icon={Info}
          title={t('profile.appVersion', 'App Version')}
          description="Galaxy TV4K HR PWA"
          value={`v${currentVersion}`}
          showChevron={false}
        />

        <SettingsRow
          icon={RefreshCw}
          title={t('pwa.checkUpdates', 'Check for updates')}
          description={
            isCheckingUpdate
              ? t('pwa.checking', 'Checking for updates...')
              : updateAvailable
              ? t('pwa.title', 'New update available')
              : t('pwa.upToDate', 'You are using the latest version.')
          }
          value={
            updateAvailable ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  performUpdate();
                }}
                disabled={updateStage === 'DOWNLOADING' || updateStage === 'INSTALLING'}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white transition-opacity active:scale-95"
                style={{ backgroundColor: 'var(--color-primary, #2563EB)' }}
              >
                {t('pwa.updateNow', 'Update now')}
              </button>
            ) : isCheckingUpdate ? (
              <span className="text-[11px] text-slate-400 font-medium">Checking...</span>
            ) : (
              'Check'
            )
          }
          onClick={handleCheckUpdates}
        />

        <SettingsRow
          icon={FileText}
          title={t('profile.termsOfService', 'Terms of Service')}
          value="View"
          onClick={() => window.open('https://galaxytv4k.online', '_blank')}
        />
      </SettingsSection>

      {/* Confirmation & Action Modals */}
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
