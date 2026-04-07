'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Building2, DollarSign, BarChart3, FileText, SlidersHorizontal } from 'lucide-react';
import { businessApi, financialApi } from '@/lib/api';
import { useLanguage } from '@/hooks/useLanguage';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ScenarioSimulator } from '@/components/analysis/ScenarioSimulator';
import type { Business, FinancialRecord } from '@/types';

export default function ScenarioPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const [business, setBusiness] = useState<Business | null>(null);
  const [financials, setFinancials] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [bRes, fRes] = await Promise.all([
        businessApi.get(id),
        financialApi.list(id),
      ]);
      setBusiness(bRes.data);
      setFinancials(fRes.data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div>
      <PageHeader
        title={t.scenario.title}
        description={business?.name ?? ''}
        breadcrumbs={[
          { label: t.nav.businesses, href: '/businesses' },
          { label: business?.name ?? 'Business', href: `/businesses/${id}` },
          { label: t.scenario.title },
        ]}
      />

      {/* Navigation tabs */}
      <div className="mb-6 flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {[
          { label: t.nav.overview, href: `/businesses/${id}`, icon: Building2 },
          { label: t.nav.financials, href: `/businesses/${id}/financials`, icon: DollarSign },
          { label: t.nav.analysis, href: `/businesses/${id}/analysis`, icon: BarChart3 },
          { label: t.nav.scenario, href: `/businesses/${id}/scenario`, icon: SlidersHorizontal },
          { label: t.nav.reports, href: `/businesses/${id}/reports`, icon: FileText },
        ].map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              href === `/businesses/${id}/scenario`
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-blue-300 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </div>

      {financials.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center py-14 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/30 mb-4">
              <SlidersHorizontal className="h-8 w-8 text-blue-500 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              {t.analysis.noAnalysisYet}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
              {t.analysis.addDataFirst}
            </p>
          </div>
        </Card>
      ) : (
        <Card title={t.scenario.simulatorTitle} subtitle={t.analysis.scenarioSubtitle}>
          <ScenarioSimulator businessId={id} />
        </Card>
      )}
    </div>
  );
}
