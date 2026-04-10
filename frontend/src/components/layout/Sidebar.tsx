'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Settings,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user } = useAuth();

  const navItems = [
    { href: '/dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    { href: '/businesses', label: t.nav.businesses, icon: Building2 },
    { href: '/settings', label: t.nav.settings, icon: Settings },
    ...(user?.role === 'admin'
      ? [{ href: '/admin', label: t.nav.admin, icon: Shield }]
      : []),
  ];

  return (
    <aside className="flex h-screen w-[240px] flex-col bg-white dark:bg-gray-950 border-r border-gray-200/80 dark:border-gray-800">
      {/* Logo */}
      <div className="flex h-16 items-center px-5">
        <img src="/logo.png" alt="Firmyx" className="h-14 dark:hidden" />
        <img src="/logo-dark.png" alt="Firmyx" className="h-14 hidden dark:block" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || pathname.startsWith(href + '/');
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150',
                    active
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-gray-200'
                  )}
                >
                  <Icon className={cn('h-[18px] w-[18px] flex-shrink-0', active ? 'text-blue-600 dark:text-blue-400' : '')} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-3">
        {/* Account status badge */}
        {user && (
          <div className="px-3 mb-2">
            <span className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
              user.is_unlocked
                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
            )}>
              {user.is_unlocked ? t.limit.unlockedPlan : t.limit.freePlan}
            </span>
          </div>
        )}
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold flex-shrink-0">
            {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{user?.full_name || 'User'}</p>
            <p className="truncate text-xs text-gray-400 dark:text-gray-500">{user?.email || ''}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
