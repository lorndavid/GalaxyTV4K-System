import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export const LanguageSwitcher: React.FC<{ className?: string; compact?: boolean }> = ({
  className = '',
  compact = false,
}) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'km';

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
        onClick={() => toggleLanguage(currentLang === 'km' ? 'en' : 'km')}
        title="Switch Language (ខ្មែរ / EN)"
        className={`px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-surface text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-dark-elevated text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${className}`}
      >
        <Globe className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
        <span>{currentLang === 'km' ? 'ខ្មែរ' : 'EN'}</span>
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
