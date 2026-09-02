// Forward to unified PreferencesContext
export {
  PreferencesProvider as ThemeProvider,
  useTheme,
  usePreferences,
  COLOR_THEMES,
  KHMER_FONTS,
  ENGLISH_FONTS,
} from './PreferencesContext';
export type {
  ThemeMode,
  ColorThemeId,
  KhmerFontId,
  EnglishFontId,
  ColorThemeDefinition,
} from './PreferencesContext';
