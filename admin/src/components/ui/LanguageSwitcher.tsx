import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export const LanguageSwitcher: React.FC<{ className?: string; compact?: boolean }> = ({
  className = '',
  compact = false,
}) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'km';

  const setLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    try {
      localStorage.setItem('system_hr_language', lang);
      document.documentElement.lang = lang;
    } catch {
      // ignore
    }
  };

  if (compact) {
    return (
      <div
        className={`inline-flex items-center p-0.5 bg-slate-100 dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl shadow-2xs ${className}`}
      >
        <button
          type="button"
          onClick={() => setLanguage('km')}
          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
            currentLang === 'km'
              ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 shadow-xs ring-1 ring-black/5 dark:ring-white/10'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
          title="ប្តូរទៅភាសាខ្មែរ"
        >
          <span>🇰🇭</span>
          <span>ខ្មែរ</span>
        </button>

        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1 ${
            currentLang === 'en'
              ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 shadow-xs ring-1 ring-black/5 dark:ring-white/10'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
          title="Switch to English"
        >
          <span>🇺🇸</span>
          <span>EN</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center p-1 bg-slate-100 dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl ${className}`}
    >
      <button
        type="button"
        onClick={() => setLanguage('km')}
        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
          currentLang === 'km'
            ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 shadow-xs'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
        }`}
      >
        <span>🇰🇭</span>
        <span>ភាសាខ្មែរ</span>
      </button>

      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
          currentLang === 'en'
            ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 shadow-xs'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
        }`}
      >
        <span>🇺🇸</span>
        <span>English</span>
      </button>
    </div>
  );
};
