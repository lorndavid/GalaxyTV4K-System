import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';
import { Lock, Mail, AlertCircle, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState('sokha.chan@company.com');
  const [password, setPassword] = useState('Employee@123456');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
          'Failed to sign in. Please verify your employee credentials.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-slate-100 flex flex-col justify-center px-4 py-8 relative transition-colors duration-150">
      {/* Top Floating Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <LanguageSwitcher compact />
        <ThemeToggle compact />
      </div>

      <div className="max-w-sm w-full mx-auto space-y-6 animate-slide-up">
        {/* Brand Header with Official Logo */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl p-2 bg-white dark:bg-dark-surface border border-slate-200/80 dark:border-dark-border flex items-center justify-center mx-auto shadow-subtle">
            <img
              src="/logo.png"
              alt="System HR Logo"
              className="w-full h-full object-contain filter drop-shadow-xs"
            />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-sans">
            {t('auth.welcome', 'Employee Attendance Portal')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 px-2">
            {t('auth.subtitle', 'Sign in with your work email to record attendance and access self-service features.')}
          </p>
        </div>

        {/* Login Form Card */}
        <Card className="p-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-danger-50 dark:bg-danger-950/40 border border-danger-200 dark:border-danger-800/60 rounded-xl flex items-start gap-2 text-xs text-danger-700 dark:text-danger-400">
                <AlertCircle className="w-4 h-4 text-danger-600 dark:text-danger-400 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('auth.emailLabel', 'Work Email')}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  placeholder="sokha.chan@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('auth.passwordLabel', 'Password')}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-white dark:bg-dark-elevated border border-slate-200 dark:border-dark-border text-slate-900 dark:text-slate-100 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none font-mono"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full h-12 text-sm font-bold shadow-xs mt-1"
              isLoading={isLoading}
            >
              {t('auth.signInBtn', 'Sign In to Account')}
            </Button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-dark-border">
            <div className="bg-slate-50 dark:bg-dark-elevated border border-slate-200 dark:border-dark-border rounded-xl p-3 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                <span>Demo Employee Credentials</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                sokha.chan@company.com / Employee@123456
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
