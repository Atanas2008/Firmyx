'use client';

import { Sun, Moon, Monitor, Globe } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
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
    <div>
      <PageHeader
        title={t.settings.title}
        description={t.settings.description}
      />

      <div className="space-y-6">
        <Card title={t.settings.profile}>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t.settings.fullName}</p>
              <p className="text-base font-medium text-gray-900 dark:text-gray-50">
                {user?.full_name ?? '—'}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t.settings.email}</p>
              <p className="text-base font-medium text-gray-900 dark:text-gray-50">
                {user?.email ?? '—'}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t.settings.role}</p>
              <p className="text-base font-medium capitalize text-gray-900 dark:text-gray-50">
                {user?.role ?? '—'}
              </p>
            </div>
          </div>
        </Card>

        <Card title={t.theme.title} subtitle={t.theme.subtitle}>
          <div className="flex gap-3">
            {themeOptions.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={`flex flex-1 flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 text-sm font-medium transition-all ${
                  theme === value
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
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
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
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
  );
}
