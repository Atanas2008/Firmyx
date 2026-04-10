'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { SlidersHorizontal } from 'lucide-react';
import { businessApi, financialApi } from '@/lib/api';
import { useLanguage } from '@/hooks/useLanguage';
import { PageHeader } from '@/components/layout/PageHeader';
import { BusinessTabs } from '@/components/layout/BusinessTabs';
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
      setFinancials(fRes.data.items ?? fRes.data);
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
      <BusinessTabs businessId={id} activeTab="scenario" />

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
