import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ColorThemeId = 'royal-blue' | 'indigo' | 'emerald' | 'violet' | 'rose';
export type KhmerFontId = 'Koh Santepheap' | 'Suwannaphum' | 'Hanuman' | 'Battambang' | 'Noto Sans Khmer';
export type EnglishFontId = 'Plus Jakarta Sans' | 'Inter' | 'Roboto' | 'Poppins' | 'Nunito Sans';

export interface ColorThemeDefinition {
  id: ColorThemeId;
  name: string;
  primary: string;
  hover: string;
  soft: string;
}

export const COLOR_THEMES: ColorThemeDefinition[] = [
  {
    id: 'royal-blue',
    name: 'Royal Blue',
    primary: '#2563EB',
    hover: '#1D4ED8',
    soft: '#EFF6FF',
  },
  {
    id: 'indigo',
    name: 'Indigo',
    primary: '#4F46E5',
    hover: '#4338CA',
    soft: '#EEF2FF',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    primary: '#059669',
    hover: '#047857',
    soft: '#ECFDF5',
  },
  {
    id: 'violet',
    name: 'Violet',
    primary: '#7C3AED',
    hover: '#6D28D9',
    soft: '#F5F3FF',
  },
  {
    id: 'rose',
    name: 'Rose',
    primary: '#E11D48',
    hover: '#BE123C',
    soft: '#FFF1F2',
  },
];

export const KHMER_FONTS: { id: KhmerFontId; name: string; sample: string }[] = [
  { id: 'Koh Santepheap', name: 'Koh Santepheap', sample: 'សួស្តី! សូមស្វាគមន៍មកកាន់ប្រព័ន្ធ' },
  { id: 'Suwannaphum', name: 'Suwannaphum', sample: 'វត្តមានការងារ និងសេវាកម្មបុគ្គលិក' },
  { id: 'Hanuman', name: 'Hanuman', sample: 'ការកត់ត្រាវត្តមានដោយសុក្រឹតភាព' },
  { id: 'Battambang', name: 'Battambang', sample: 'ប្រព័ន្ធគ្រប់គ្រងធនធានមនុស្ស Galaxy TV4K' },
  { id: 'Noto Sans Khmer', name: 'Noto Sans Khmer', sample: 'ស្កេន QR កូដដើម្បីកត់ត្រាវត្តមាន' },
];

export const ENGLISH_FONTS: { id: EnglishFontId; name: string; sample: string }[] = [
  { id: 'Plus Jakarta Sans', name: 'Google Sans / Plus Jakarta', sample: 'The quick brown fox jumps over the lazy dog' },
  { id: 'Inter', name: 'Inter', sample: 'Modern, balanced design for high-density SaaS interfaces' },
  { id: 'Roboto', name: 'Roboto', sample: 'Clean geometric curves with friendly open letterforms' },
  { id: 'Poppins', name: 'Poppins', sample: 'Geometric sans-serif with international aesthetic feel' },
  { id: 'Nunito Sans', name: 'Nunito Sans', sample: 'Well-balanced typography for comfortable reading' },
];

interface PreferencesContextType {
  // Theme
  theme: ThemeMode;
  effectiveTheme: 'light' | 'dark';
  setTheme: (mode: ThemeMode) => void;

  // Color Theme
  colorTheme: ColorThemeId;
  setColorTheme: (color: ColorThemeId) => void;
  currentColor: ColorThemeDefinition;

  // Typography
  khmerFont: KhmerFontId;
  setKhmerFont: (font: KhmerFontId) => void;
  englishFont: EnglishFontId;
  setEnglishFont: (font: EnglishFontId) => void;

  // Notifications
  attendanceNotifications: boolean;
  setAttendanceNotifications: (enabled: boolean) => void;
  leaveNotifications: boolean;
  setLeaveNotifications: (enabled: boolean) => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Theme State
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('system_hr_theme') as ThemeMode;
      return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
    } catch {
      return 'system';
    }
  });

  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light');

  // 2. Color Theme State (5 colors)
  const [colorTheme, setColorThemeState] = useState<ColorThemeId>(() => {
    try {
      const saved = localStorage.getItem('system_hr_color_theme') as ColorThemeId;
      return COLOR_THEMES.some((t) => t.id === saved) ? saved : 'royal-blue';
    } catch {
      return 'royal-blue';
    }
  });

  // 3. Khmer Font (5 fonts)
  const [khmerFont, setKhmerFontState] = useState<KhmerFontId>(() => {
    try {
      const saved = localStorage.getItem('system_hr_khmer_font') as KhmerFontId;
      return KHMER_FONTS.some((f) => f.id === saved) ? saved : 'Koh Santepheap';
    } catch {
      return 'Koh Santepheap';
    }
  });

  // 4. English Font (5 fonts)
  const [englishFont, setEnglishFontState] = useState<EnglishFontId>(() => {
    try {
      const saved = localStorage.getItem('system_hr_english_font') as EnglishFontId;
      return ENGLISH_FONTS.some((f) => f.id === saved) ? saved : 'Plus Jakarta Sans';
    } catch {
      return 'Plus Jakarta Sans';
    }
  });

  // 5. Notifications
  const [attendanceNotifications, setAttendanceNotificationsState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('system_hr_notify_attendance');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [leaveNotifications, setLeaveNotificationsState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('system_hr_notify_leave');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // Synchronize Theme mode with document class
  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = () => {
      let isDark = false;
      if (theme === 'dark') {
        isDark = true;
      } else if (theme === 'system') {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }

      if (isDark) {
        root.classList.add('dark');
        setEffectiveTheme('dark');
      } else {
        root.classList.remove('dark');
        setEffectiveTheme('light');
      }
    };

    applyTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Synchronize Color Theme with CSS dataset & design tokens
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-color-theme', colorTheme);

    const definition = COLOR_THEMES.find((c) => c.id === colorTheme) || COLOR_THEMES[0];
    root.style.setProperty('--color-primary', definition.primary);
    root.style.setProperty('--color-primary-hover', definition.hover);
    root.style.setProperty('--color-primary-soft', definition.soft);
    root.style.setProperty('--color-primary-foreground', '#FFFFFF');

    // Update meta theme-color for browser tab / mobile status bar
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', definition.primary);
    }
  }, [colorTheme]);

  // Synchronize Typography with CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--font-khmer', `"${khmerFont}", "Koh Santepheap", "Suwannaphum", sans-serif`);
    root.style.setProperty('--font-english', `"${englishFont}", "Inter", system-ui, -apple-system, sans-serif`);
  }, [khmerFont, englishFont]);

  // Setters with Persistence
  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    try {
      localStorage.setItem('system_hr_theme', mode);
    } catch {}
  };

  const setColorTheme = (color: ColorThemeId) => {
    setColorThemeState(color);
    try {
      localStorage.setItem('system_hr_color_theme', color);
    } catch {}
  };

  const setKhmerFont = (font: KhmerFontId) => {
    setKhmerFontState(font);
    try {
      localStorage.setItem('system_hr_khmer_font', font);
    } catch {}
  };

  const setEnglishFont = (font: EnglishFontId) => {
    setEnglishFontState(font);
    try {
      localStorage.setItem('system_hr_english_font', font);
    } catch {}
  };

  const setAttendanceNotifications = (enabled: boolean) => {
    setAttendanceNotificationsState(enabled);
    try {
      localStorage.setItem('system_hr_notify_attendance', String(enabled));
    } catch {}
  };

  const setLeaveNotifications = (enabled: boolean) => {
    setLeaveNotificationsState(enabled);
    try {
      localStorage.setItem('system_hr_notify_leave', String(enabled));
    } catch {}
  };

  const currentColor = COLOR_THEMES.find((c) => c.id === colorTheme) || COLOR_THEMES[0];

  return (
    <PreferencesContext.Provider
      value={{
        theme,
        effectiveTheme,
        setTheme,
        colorTheme,
        setColorTheme,
        currentColor,
        khmerFont,
        setKhmerFont,
        englishFont,
        setEnglishFont,
        attendanceNotifications,
        setAttendanceNotifications,
        leaveNotifications,
        setLeaveNotifications,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used within a PreferencesProvider');
  return context;
};

// Re-export useTheme for backward compatibility with existing components
export const useTheme = () => {
  const { theme, effectiveTheme, setTheme } = usePreferences();
  return { theme, effectiveTheme, setTheme };
};
