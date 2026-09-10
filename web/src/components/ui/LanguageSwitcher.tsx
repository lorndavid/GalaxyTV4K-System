import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export const LanguageSwitcher: React.FC<{ className?: string; compact?: boolean }> = ({
  className = '',
  compact = false,
}) => {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.toLowerCase().startsWith('en');
  const currentLang = isEn ? 'en' : 'km';

  const toggleLanguage = (lang: string) => {
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
      <button
        type="button"
        onClick={() => toggleLanguage(isEn ? 'km' : 'en')}
        title={isEn ? 'ប្តូរទៅភាសាខ្មែរ' : 'Switch to English'}
        aria-label="Switch Language"
        className={`px-3 py-2 rounded-2xl border-0 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-dark-elevated text-xs font-bold transition-all flex items-center gap-2 shadow-xs active:scale-95 select-none focus:outline-none ${className}`}
      >
        <Globe className="w-4 h-4 text-brand-600 dark:text-brand-400" />
        <span className="font-semibold tracking-wide">{isEn ? 'EN' : 'ខ្មែរ'}</span>
      </button>
    );
  }

  return (
    <div
      className={`inline-flex items-center p-1 bg-slate-100 dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl ${className}`}
    >
      <button
        onClick={() => toggleLanguage('km')}
        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
          currentLang === 'km'
            ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 shadow-xs'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
        }`}
      >
        ខ្មែរ
      </button>
      <button
        onClick={() => toggleLanguage('en')}
        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
          currentLang === 'en'
            ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 shadow-xs'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
        }`}
      >
        English
      </button>
    </div>
  );
};
