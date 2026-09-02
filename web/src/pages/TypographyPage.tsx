import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePreferences } from '../contexts/PreferencesContext';
import { FontSelector } from '../components/settings/FontSelector';
import { Card } from '../components/ui/Card';
import { ArrowLeft, Type, Sparkles } from 'lucide-react';

export const TypographyPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { khmerFont, englishFont } = usePreferences();
  const [activeTab, setActiveTab] = useState<'khmer' | 'english'>('khmer');

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
            {t('settings.typographyTitle', 'Typography & Fonts')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
            {t('settings.typographySubtitle', 'Customize Khmer and English typography styles')}
          </p>
        </div>
      </div>

      {/* Segmented Script Toggle (Khmer Font / English Font) */}
      <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-dark-elevated rounded-2xl border border-slate-200/60 dark:border-dark-border">
        <button
          type="button"
          onClick={() => setActiveTab('khmer')}
          className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] ${
            activeTab === 'khmer'
              ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 shadow-sm border border-slate-200/80 dark:border-dark-border'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
          }`}
        >
          <span>{t('settings.khmerFont', 'Khmer Font')}</span>
          <span className="text-[10px] text-slate-400 font-normal block mt-0.5">
            ({khmerFont})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('english')}
          className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] ${
            activeTab === 'english'
              ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 shadow-sm border border-slate-200/80 dark:border-dark-border'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
          }`}
        >
          <span>{t('settings.englishFont', 'English Font')}</span>
          <span className="text-[10px] text-slate-400 font-normal block mt-0.5">
            ({englishFont})
          </span>
        </button>
      </div>

      {/* Live Typography Preview Card */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 px-0.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          <Sparkles className="w-3.5 h-3.5 text-brand-600" />
          <span>{t('settings.livePreview', 'Live Typography Preview')}</span>
        </div>

        <Card className="p-5 border border-slate-200/80 dark:border-dark-border space-y-3.5 shadow-xs">
          {/* Khmer Sentence in Active Khmer Font */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Khmer Typography • {khmerFont}
            </span>
            <p
              style={{ fontFamily: `"${khmerFont}", sans-serif` }}
              className="text-base text-slate-900 dark:text-slate-100 font-normal leading-relaxed"
            >
              {t('settings.previewKhmer', 'សួស្តី! ការកត់ត្រាវត្តមានរបស់អ្នកត្រូវបានផ្ទៀងផ្ទាត់រួចរាល់។')}
            </p>
          </div>

          {/* English Sentence in Active English Font */}
          <div className="pt-2 border-t border-slate-100 dark:border-dark-border space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              English Typography • {englishFont}
            </span>
            <p
              style={{ fontFamily: `"${englishFont}", sans-serif` }}
              className="text-sm text-slate-800 dark:text-slate-200 font-normal leading-relaxed"
            >
              {t('settings.previewText', 'Good morning! Your attendance record is ready.')}
            </p>
          </div>
        </Card>
      </div>

      {/* Font Selection Cards */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-0.5">
          {activeTab === 'khmer'
            ? t('settings.khmerFontDesc', 'Choose a Google Font for Khmer script')
            : t('settings.englishFontDesc', 'Choose a modern Sans-Serif font for English and numerals')}
        </h2>

        <FontSelector type={activeTab} />
      </div>
    </div>
  );
};
