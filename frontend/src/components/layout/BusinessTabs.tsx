'use client';

import Link from 'next/link';
import { Building2, DollarSign, BarChart3, SlidersHorizontal, FileText } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

type TabKey = 'overview' | 'financials' | 'analysis' | 'scenario' | 'reports';

interface BusinessTabsProps {
  businessId: string;
  activeTab: TabKey;
}

export function BusinessTabs({ businessId, activeTab }: BusinessTabsProps) {
  const { t } = useLanguage();
  const base = `/businesses/${businessId}`;

  const tabs: Array<{ key: TabKey; label: string; href: string; icon: React.ElementType }> = [
    { key: 'overview', label: t.nav.overview, href: base, icon: Building2 },
    { key: 'financials', label: t.nav.financials, href: `${base}/financials`, icon: DollarSign },
    { key: 'analysis', label: t.nav.analysis, href: `${base}/analysis`, icon: BarChart3 },
    { key: 'scenario', label: t.nav.scenario, href: `${base}/scenario`, icon: SlidersHorizontal },
    { key: 'reports', label: t.nav.reports, href: `${base}/reports`, icon: FileText },
  ];

  return (
    <div className="mb-6 relative">
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 overflow-x-auto scrollbar-hide -mx-1 px-1">
        {tabs.map(({ key, label, href, icon: Icon }) => (
          <Link
            key={key}
            href={href}
            className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-blue-300 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </div>
      {/* Fade indicator for mobile scroll */}
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-50 dark:from-gray-950 to-transparent pointer-events-none sm:hidden" />
    </div>
  );
}
