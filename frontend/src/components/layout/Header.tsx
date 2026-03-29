'use client';

import { LogOut, User, Sun, Moon, Monitor } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/Button';

export function Header({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const { user, logout } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  function cycleTheme() {
    const order: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
  }

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const themeLabel = theme === 'dark' ? t.theme.dark : theme === 'light' ? t.theme.light : t.theme.auto;

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6">
      <div>
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            className="md:hidden rounded-lg p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Toggle menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        )}
      </div>
      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="font-medium">{user.full_name || user.email}</span>
          </div>
        )}
        {/* Language toggle */}
        <button
          type="button"
          onClick={() => setLanguage(language === 'en' ? 'bg' : 'en')}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={t.language.title}
        >
          <span className={language === 'en' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}>EN</span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span className={language === 'bg' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}>BG</span>
        </button>
        <Button variant="ghost" size="sm" onClick={cycleTheme} title={themeLabel}>
          <ThemeIcon className="h-4 w-4" />
          <span className="hidden sm:inline text-xs">{themeLabel}</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4" />
          {t.auth.signOut}
        </Button>
      </div>
    </header>
  );
}
