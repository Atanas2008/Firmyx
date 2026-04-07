'use client';

import { Sun, Moon, Monitor, Globe, User, Mail, Shield } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import type { Language } from '@/i18n';

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

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
        </div>
      </div>
    </div>
  );
}
