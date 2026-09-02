import React from 'react';
import {
  usePreferences,
  KHMER_FONTS,
  ENGLISH_FONTS,
  KhmerFontId,
  EnglishFontId,
} from '../../contexts/PreferencesContext';
import { Check } from 'lucide-react';

interface FontSelectorProps {
  type: 'khmer' | 'english';
  className?: string;
}

export const FontSelector: React.FC<FontSelectorProps> = ({ type, className = '' }) => {
  const { khmerFont, setKhmerFont, englishFont, setEnglishFont } = usePreferences();

  if (type === 'khmer') {
    return (
      <div role="radiogroup" aria-label="Khmer Font Selection" className={`space-y-2.5 ${className}`}>
        {KHMER_FONTS.map((font) => {
          const isSelected = khmerFont === font.id;

          return (
            <button
              key={font.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setKhmerFont(font.id)}
              className={`w-full min-h-[64px] p-3.5 rounded-2xl border text-left transition-all active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                isSelected
                  ? 'bg-white dark:bg-dark-surface border-brand-500 shadow-sm ring-1 ring-brand-500/20'
                  : 'bg-slate-50/70 dark:bg-dark-elevated/40 border-slate-200/70 dark:border-dark-border hover:bg-white dark:hover:bg-dark-surface'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {font.name}
                </span>

                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-brand-600 text-white'
                      : 'border border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                </div>
              </div>

              {/* Sample preview rendered directly in this font */}
              <p
                style={{ fontFamily: `"${font.id}", sans-serif` }}
                className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed truncate"
              >
                {font.sample}
              </p>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div role="radiogroup" aria-label="English Font Selection" className={`space-y-2.5 ${className}`}>
      {ENGLISH_FONTS.map((font) => {
        const isSelected = englishFont === font.id;

        return (
          <button
            key={font.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => setEnglishFont(font.id)}
            className={`w-full min-h-[64px] p-3.5 rounded-2xl border text-left transition-all active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              isSelected
                ? 'bg-white dark:bg-dark-surface border-brand-500 shadow-sm ring-1 ring-brand-500/20'
                : 'bg-slate-50/70 dark:bg-dark-elevated/40 border-slate-200/70 dark:border-dark-border hover:bg-white dark:hover:bg-dark-surface'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                {font.name}
              </span>

              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                  isSelected
                    ? 'bg-brand-600 text-white'
                    : 'border border-slate-300 dark:border-slate-600'
                }`}
              >
                {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
              </div>
            </div>

            {/* Sample preview rendered directly in this font */}
            <p
              style={{ fontFamily: `"${font.id}", sans-serif` }}
              className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed truncate"
            >
              {font.sample}
            </p>
          </button>
        );
      })}
    </div>
  );
};
