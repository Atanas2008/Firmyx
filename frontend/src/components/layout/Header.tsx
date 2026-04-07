'use client';

import { LogOut, Sun, Moon, Monitor } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';

export function Header({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  function cycleTheme() {
    const order: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
  }

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-950 px-6">
      <div className="flex items-center gap-2">
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            className="md:hidden rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        )}
      </div>
      <div className="flex items-center gap-1">
        {/* Language toggle */}
        <button
          type="button"
          onClick={() => setLanguage(language === 'en' ? 'bg' : 'en')}
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={t.language.title}
        >
          <span className={language === 'en' ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''}>EN</span>
          <span className="text-gray-300 dark:text-gray-700">/</span>
          <span className={language === 'bg' ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''}>BG</span>
        </button>
        <button
          type="button"
          onClick={cycleTheme}
          className="rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={t.theme.title}
        >
          <ThemeIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={logout}
          className="rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          title={t.auth.signOut}
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
