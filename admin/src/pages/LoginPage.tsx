import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import { Lock, Mail, AlertCircle, ShieldCheck, Check, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('admin@company.com');
  const [password, setPassword] = useState('Admin@123456');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [justFilled, setJustFilled] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(
        err?.response?.data?.error?.message ||
          'Failed to sign in. Please verify your credentials.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutofillDemo = () => {
    setEmail('admin@company.com');
    setPassword('Admin@123456');
    setJustFilled(true);
    setTimeout(() => setJustFilled(false), 2000);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 via-blue-50/30 to-slate-100 dark:from-dark-bg dark:via-[#0c1322] dark:to-[#080d1a] text-slate-900 dark:text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden transition-colors duration-200">
      {/* Background Depth: Subtle Geometric Dot Grid & Ambient Radial Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[540px] h-[420px] bg-gradient-to-tr from-brand-500/10 via-blue-400/10 to-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] opacity-30 dark:opacity-20" />
      </div>

      {/* Top Floating Controls with 44px tap targets */}
      <header className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2 z-20">
        <LanguageSwitcher compact className="min-h-[44px] min-w-[44px] px-3.5 rounded-xl backdrop-blur-md bg-white/80 dark:bg-dark-surface/80 shadow-xs border border-slate-200/70 dark:border-dark-border" />
        <ThemeToggle compact className="min-h-[44px] min-w-[44px] rounded-xl backdrop-blur-md bg-white/80 dark:bg-dark-surface/80 shadow-xs border border-slate-200/70 dark:border-dark-border" />
      </header>

      {/* Center Auth Container */}
      <div className="max-w-[420px] w-full mx-auto space-y-6 relative z-10 animate-fade-in">
        {/* Brand Anchor with Confident Glowing Icon */}
        <div className="text-center space-y-2">
          <div className="relative inline-block mb-1">
            <div className="absolute -inset-2 bg-gradient-to-tr from-brand-500/25 to-blue-400/25 rounded-3xl blur-md opacity-80" />
            <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-2xl p-3 bg-white dark:bg-dark-surface border border-slate-200/80 dark:border-dark-border flex items-center justify-center shadow-lg shadow-brand-500/10">
              <img
                src="/logo.png"
                alt="Galaxy TV4K Logo"
                className="w-full h-full object-contain filter drop-shadow-xs"
              />
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-sans">
            Galaxy TV4K — Administration
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 max-w-xs mx-auto leading-relaxed">
            {t('auth.welcomeBack', 'Sign in to access HR administration, employee attendance, and system settings.')}
          </p>
        </div>

        {/* Floating SaaS Login Card */}
        <div className="bg-white/95 dark:bg-dark-surface/95 backdrop-blur-xl border border-slate-200/70 dark:border-dark-border rounded-[20px] shadow-[0_16px_40px_-12px_rgba(0,0,0,0.08),0_4px_16px_-2px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] p-6 sm:p-8 transition-colors duration-150">
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
                {t('auth.emailLabel', 'Work Email')}
              </label>
              <div className="relative group">
                <Mail className="w-4 h-4 text-slate-400 group-focus-within:text-brand-600 dark:group-focus-within:text-brand-400 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none stroke-[1.8]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 text-sm bg-slate-50/70 dark:bg-dark-elevated/60 border border-slate-200 dark:border-dark-border text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-dark-surface focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 dark:focus:ring-brand-500/20 focus:outline-none transition-all duration-150 font-normal placeholder:text-slate-400"
                  placeholder="admin@company.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('auth.passwordLabel', 'Password')}
              </label>
              <div className="relative group">
                <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-brand-600 dark:group-focus-within:text-brand-400 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none stroke-[1.8]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 text-sm bg-slate-50/70 dark:bg-dark-elevated/60 border border-slate-200 dark:border-dark-border text-slate-900 dark:text-slate-100 rounded-xl focus:bg-white dark:focus:bg-dark-surface focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 dark:focus:ring-brand-500/20 focus:outline-none transition-all duration-150 font-normal placeholder:text-slate-400"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Submit Action Button */}
            <div className="pt-1">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full h-12 text-sm font-semibold rounded-xl bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-700 hover:to-blue-700 active:from-brand-800 active:to-blue-800 shadow-md shadow-brand-500/25 hover:shadow-lg hover:shadow-brand-500/35 active:scale-[0.99] transition-all"
                isLoading={isLoading}
              >
                {t('auth.signInBtn', 'Sign In to Dashboard')}
              </Button>
            </div>
          </form>

          {/* Secondary Demo Credentials Box with One-Tap Autofill */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-dark-border/80">
            <div className="bg-slate-50/70 dark:bg-dark-elevated/40 border border-slate-200/60 dark:border-dark-border/60 rounded-xl p-3 text-xs space-y-1.5 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 text-[11px] font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Admin Credentials</span>
                </div>

                <button
                  type="button"
                  onClick={handleAutofillDemo}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors active:scale-95"
                >
                  {justFilled ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Filled!</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3" />
                      <span>Fill demo credentials</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tracking-tight select-all">
                admin@company.com • Admin@123456
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 font-normal">
          Galaxy TV4K HR Administration System • v1.0
        </p>
      </div>
    </div>
  );
};
