/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'var(--color-primary-soft, #EFF6FF)',
          100: 'var(--color-primary-soft, #DBEAFE)',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: 'var(--color-primary, #3B82F6)',
          600: 'var(--color-primary, #2563EB)',
          700: 'var(--color-primary-hover, #1D4ED8)',
          800: 'var(--color-primary-hover, #1E40AF)',
          900: '#1E3A8A',
        },
        dark: {
          bg: '#0B1120',
          surface: '#111827',
          elevated: '#172033',
          border: '#263449',
          text: '#F8FAFC',
          muted: '#94A3B8',
        },
        success: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
        },
        warning: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        danger: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
        },
      },
      fontFamily: {
        sans: ['Inter', '"Koh Santepheap"', '"Suwannaphum"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '8px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        card: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        modal: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        floating: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      },
      keyframes: {
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scan-laser': {
          '0%': { top: '5%' },
          '50%': { top: '90%' },
          '100%': { top: '5%' },
        },
      },
      animation: {
        'slide-up': 'slide-up 200ms ease-out forwards',
        'fade-in': 'fade-in 180ms ease-out forwards',
        'scan-laser': 'scan-laser 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
