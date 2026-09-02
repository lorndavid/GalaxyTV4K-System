import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePreferences } from '../contexts/PreferencesContext';
import { ThemeSelector } from '../components/settings/ThemeSelector';
import { ColorThemeSelector } from '../components/settings/ColorThemeSelector';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ArrowLeft, Palette, Clock3, Sparkles, QrCode } from 'lucide-react';

export const AppearancePage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentColor } = usePreferences();

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-8 animate-fade-in">
      {/* Header Bar */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-dark-elevated transition-colors active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2]" />
        </button>

        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {t('settings.appearanceTitle', 'Appearance & Theme')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
            {t('settings.appearanceSubtitle', 'Select your display mode and vibrant color palette')}
          </p>
        </div>
      </div>

      {/* 1. Theme Mode (Light / System / Dark) */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-0.5">
          {t('settings.themeMode', 'Display Mode')}
        </h2>
        <ThemeSelector />
      </div>

      {/* 2. Five Color Themes */}
      <div className="space-y-2">
        <div className="space-y-0.5 px-0.5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {t('settings.colorTheme', 'Color Palette')}
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
            {t('settings.colorThemeDesc', 'Primary accent colors applied across the entire app')}
          </p>
        </div>
        <ColorThemeSelector />
      </div>

      {/* 3. Live Interface Preview Widget */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center gap-1.5 px-0.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          <Sparkles className="w-3.5 h-3.5 text-brand-600" />
          <span>{t('settings.livePreview', 'Live Interface Preview')}</span>
        </div>

        {/* Live Attendance Card Preview */}
        <Card className="p-4 sm:p-5 border border-slate-200/80 dark:border-dark-border space-y-3.5 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs"
                style={{ backgroundColor: currentColor.primary }}
              >
                <Clock3 className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {t('home.todayAttendance', "Today's Attendance")}
                </h3>
                <p className="text-[11px] text-slate-400 font-normal">Shift 08:00 AM – 05:00 PM</p>
              </div>
            </div>

            <Badge status="PRESENT" size="sm" />
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-slate-50 dark:bg-dark-elevated p-2.5 rounded-xl border border-slate-100 dark:border-dark-border">
              <span className="text-[10px] text-slate-400 block font-normal">Check-In</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">08:02 AM</span>
            </div>
            <div className="bg-slate-50 dark:bg-dark-elevated p-2.5 rounded-xl border border-slate-100 dark:border-dark-border">
              <span className="text-[10px] text-slate-400 block font-normal">Worked Time</span>
              <span className="font-semibold text-brand-600 dark:text-brand-400 tabular-nums">4h 25m</span>
            </div>
          </div>

          {/* Interactive Button in Selected Color */}
          <button
            type="button"
            className="w-full py-2.5 px-3 rounded-xl text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-transform active:scale-[0.99]"
            style={{ backgroundColor: currentColor.primary }}
          >
            <QrCode className="w-4 h-4" />
            <span>{t('home.scanAttendance', 'Scan Attendance QR')}</span>
          </button>
        </Card>
      </div>
    </div>
  );
};
