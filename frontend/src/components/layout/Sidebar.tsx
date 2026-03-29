'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = [
    { href: '/dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    { href: '/businesses', label: t.nav.businesses, icon: Building2 },
    { href: '/settings', label: t.nav.settings, icon: Settings },
  ];

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 dark:border-gray-700 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 dark:bg-blue-500">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold text-gray-900 dark:text-gray-50">Firmyx</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || pathname.startsWith(href + '/');
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-50'
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
          © {new Date().getFullYear()} Firmyx
        </p>
      </div>
    </aside>
  );
}
