import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import { Lock, Mail, AlertCircle, Eye, EyeOff } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState(() => {
    return localStorage.getItem('saved_login_email') || '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('system_hr_remember_me') !== 'false';
  });
  const [error, setError] = useState<string | null>(() => {
    if (sessionStorage.getItem('system_hr_device_logged_out') === 'true') {
      sessionStorage.removeItem('system_hr_device_logged_out');
      return 'គណនីរបស់អ្នកត្រូវបានចូលប្រើនៅលើឧបករណ៍ផ្សេងទៀត។ សូមចូលម្តងទៀតប្រសិនបើនេះជាអ្នក។ (Your account was signed in on another device.)';
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password, rememberMe);
      navigate('/');
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message ||
          'Failed to sign in. Please verify your employee credentials.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 via-blue-50/20 to-slate-100 dark:from-dark-bg dark:via-[#0c1322] dark:to-[#080d1a] text-slate-900 dark:text-slate-100 flex flex-col justify-center items-center px-4 py-10 sm:py-12 relative overflow-hidden transition-colors duration-200">
      {/* Background Depth: Geometric Dot Grid & Subtle Ambient Radial Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[450px] bg-gradient-to-tr from-brand-500/15 via-blue-500/10 to-indigo-500/15 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] opacity-30 dark:opacity-20" />
      </div>

      {/* Top Floating Controls */}
      <header className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2.5 z-20">
        <LanguageSwitcher compact className="min-h-[42px] px-3.5 rounded-2xl backdrop-blur-xl bg-white/70 dark:bg-dark-surface/70 hover:bg-white/95 dark:hover:bg-dark-surface/95 shadow-sm border-0 text-slate-700 dark:text-slate-200 transition-all duration-200" />
        <ThemeToggle compact className="min-h-[42px] min-w-[42px] rounded-2xl backdrop-blur-xl bg-white/70 dark:bg-dark-surface/70 hover:bg-white/95 dark:hover:bg-dark-surface/95 shadow-sm border-0 text-slate-700 dark:text-slate-200 transition-all duration-200 flex items-center justify-center" />
      </header>

      {/* Center Auth Container */}
      <div className="max-w-[400px] w-full mx-auto space-y-6 relative z-10 animate-fade-in">
        {/* Brand Anchor with Clean Borderless Logo (+30% Larger) */}
        <div className="text-center space-y-3">
          <div className="relative inline-flex items-center justify-center">
            {/* Subtle Ambient Radial Backlight Glow */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-brand-500/25 via-blue-400/20 to-indigo-500/25 rounded-full blur-2xl opacity-80 pointer-events-none" />
            
            {/* Borderless Logo: +30% Larger (h-24 sm:h-28) */}
            <img
              src="/logo.png"
              alt="Galaxy TV4K Logo"
              className="relative h-24 sm:h-28 w-auto object-contain filter drop-shadow-md transition-transform duration-300 hover:scale-105 select-none"
            />
          </div>

          <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 dark:text-slate-100 font-sans">
            {t('auth.welcome', 'Galaxy TV4K Attendance')}
          </h1>
        </div>

        {/* Clean, Modern SaaS Login Card */}
        <div className="bg-white/95 dark:bg-dark-surface/95 backdrop-blur-2xl border border-slate-200/80 dark:border-dark-border/80 rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.07)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.45)] p-6 sm:p-8 transition-colors duration-150">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300 animate-slide-up">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('auth.emailLabel', 'Work Email / Username')}
              </label>
              <div className="relative group">
                <Mail className="w-4 h-4 text-slate-400 group-focus-within:text-brand-600 dark:group-focus-within:text-brand-400 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none stroke-[1.8]" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 text-sm bg-slate-50/70 dark:bg-dark-elevated/60 border border-slate-200 dark:border-dark-border text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-dark-surface focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 dark:focus:ring-brand-500/20 focus:outline-none transition-all duration-150 font-normal placeholder:text-slate-400"
                  placeholder="name@galaxytv4k.com"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Field with Show/Hide Toggle */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('auth.passwordLabel', 'Password')}
              </label>
              <div className="relative group">
                <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-brand-600 dark:group-focus-within:text-brand-400 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none stroke-[1.8]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3 text-sm bg-slate-50/70 dark:bg-dark-elevated/60 border border-slate-200 dark:border-dark-border text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-dark-surface focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 dark:focus:ring-brand-500/20 focus:outline-none transition-all duration-150 font-normal placeholder:text-slate-400"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-md border-slate-300 dark:border-dark-border text-brand-600 focus:ring-brand-500/20 dark:bg-dark-elevated cursor-pointer"
                />
                <span>{t('auth.rememberMe', 'Remember me on this device')}</span>
              </label>
            </div>

            {/* Submit Action Button */}
            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full h-12 text-sm font-semibold rounded-xl bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-700 hover:to-blue-700 active:from-brand-800 active:to-blue-800 shadow-md shadow-brand-500/25 hover:shadow-lg hover:shadow-brand-500/35 active:scale-[0.99] transition-all"
                isLoading={isLoading}
              >
                {t('auth.signInBtn', 'Sign In')}
              </Button>
            </div>
          </form>
        </div>

        {/* Clean Professional Footer */}
        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 font-normal tracking-wide">
          Galaxy TV4K HR System • Attendance Portal
        </p>
      </div>
    </div>
  );
};
