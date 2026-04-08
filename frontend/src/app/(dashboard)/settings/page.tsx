'use client';

import { useState, type FormEvent } from 'react';
import { Sun, Moon, Monitor, Globe, User, Mail, Shield, DollarSign, Lock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { authApi } from '@/lib/api';
import type { Language } from '@/i18n';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'BGN'] as const;

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  // Currency preference (stored in localStorage)
  const [currency, setCurrency] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('firmyx-currency') ?? 'USD';
    return 'USD';
  });

  function handleCurrencyChange(value: string) {
    setCurrency(value);
    localStorage.setItem('firmyx-currency', value);
  }

  // Change password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPwSuccess('');
    setPwError('');
    if (newPassword !== confirmPassword) {
      setPwError(t.settingsExtra.passwordUpdateFailed);
      return;
    }
    if (newPassword.length < 8) {
      setPwError(t.settingsExtra.passwordUpdateFailed);
      return;
    }
    setPwLoading(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setPwSuccess(t.settingsExtra.passwordUpdated);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setPwError(detail === 'Current password is incorrect.' ? t.settingsExtra.currentPasswordIncorrect : (detail ?? t.settingsExtra.passwordUpdateFailed));
    } finally {
      setPwLoading(false);
    }
  }

  const themeOptions = [
    { value: 'light' as const, label: t.theme.light, icon: Sun },
    { value: 'dark' as const, label: t.theme.dark, icon: Moon },
    { value: 'system' as const, label: t.theme.system, icon: Monitor },
  ];

  const languageOptions: Array<{ value: Language; label: string }> = [
    { value: 'en', label: t.language.en },
    { value: 'bg', label: t.language.bg },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">{t.settings.title}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t.settings.description}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title={t.settings.profile}>
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-lg font-bold flex-shrink-0">
                {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-50">{user?.full_name ?? '—'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email ?? '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-gray-500 dark:text-gray-400">{t.settings.fullName}</p>
                <p className="font-medium text-gray-900 dark:text-gray-50">{user?.full_name ?? '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-gray-500 dark:text-gray-400">{t.settings.email}</p>
                <p className="font-medium text-gray-900 dark:text-gray-50">{user?.email ?? '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Shield className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-gray-500 dark:text-gray-400">{t.settings.role}</p>
                <p className="font-medium capitalize text-gray-900 dark:text-gray-50">{user?.role ?? '—'}</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card title={t.theme.title} subtitle={t.theme.subtitle}>
            <div className="flex gap-3">
              {themeOptions.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={`flex flex-1 flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 text-sm font-medium transition-all ${
                    theme === value
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 shadow-sm'
                      : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </button>
              ))}
            </div>
          </Card>

          <Card title={t.language.title} subtitle={t.language.subtitle}>
            <div className="flex gap-3">
              {languageOptions.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLanguage(value)}
                  className={`flex flex-1 flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 text-sm font-medium transition-all ${
                    language === value
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 shadow-sm'
                      : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900'
                  }`}
                >
                  <Globe className="h-5 w-5" />
                  {label}
                </button>
              ))}
            </div>
          </Card>

          <Card title={t.settingsExtra.currency} subtitle={t.settingsExtra.currencySubtitle}>
            <div className="flex gap-3">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleCurrencyChange(c)}
                  className={`flex flex-1 flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 text-sm font-medium transition-all ${
                    currency === c
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 shadow-sm'
                      : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900'
                  }`}
                >
                  <DollarSign className="h-5 w-5" />
                  {c}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Change password */}
      <Card title={t.settingsExtra.changePassword}>
        <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
          {pwSuccess && (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
              {pwSuccess}
            </div>
          )}
          {pwError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {pwError}
            </div>
          )}
          <Input
            label={t.settingsExtra.currentPassword}
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <Input
            label={t.settingsExtra.newPassword}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <Input
            label={t.settingsExtra.confirmNewPassword}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <Button type="submit" loading={pwLoading}>
            <Lock className="h-4 w-4" />
            {t.settingsExtra.updatePassword}
          </Button>
        </form>
      </Card>
    </div>
  );
}
