'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Play, Building2, DollarSign, BarChart3, FileText } from 'lucide-react';
import { businessApi, analysisApi, financialApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { RiskScoreDisplay } from '@/components/analysis/RiskScoreDisplay';
import { MetricsGrid } from '@/components/dashboard/MetricsGrid';
import { MetricsTable } from '@/components/analysis/MetricsTable';
import { RecommendationsList } from '@/components/analysis/RecommendationsList';
import { RevenueExpenseChart } from '@/components/dashboard/charts/RevenueExpenseChart';
import { RunwayChart } from '@/components/dashboard/charts/RunwayChart';
import type { Business, RiskAnalysis, FinancialRecord } from '@/types';

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [analyses, setAnalyses] = useState<RiskAnalysis[]>([]);
  const [financials, setFinancials] = useState<FinancialRecord[]>([]);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [bRes, aRes, fRes] = await Promise.all([
        businessApi.get(id),
        analysisApi.list(id),
        financialApi.list(id),
      ]);
      setBusiness(bRes.data);
      setAnalyses(
        [...aRes.data].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
      setFinancials(fRes.data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleRunAnalysis() {
    setRunning(true);
    setErrorMsg('');
    try {
      await analysisApi.run(id);
      await loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Failed to run analysis. Ensure financial records exist.';
      setErrorMsg(msg);
    } finally {
      setRunning(false);
    }
  }

  const latest = analyses[0] ?? null;

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div>
      <PageHeader
        title="Risk Analysis"
        description={business?.name ?? ''}
        breadcrumbs={[
          { label: 'Businesses', href: '/businesses' },
          { label: business?.name ?? 'Business', href: `/businesses/${id}` },
          { label: 'Analysis' },
        ]}
        actions={
          <Button onClick={handleRunAnalysis} loading={running}>
            <Play className="h-4 w-4" />
            Run Analysis
          </Button>
        }
      />

      {/* Navigation tabs */}
      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {[
          { label: 'Overview', href: `/businesses/${id}`, icon: Building2 },
          { label: 'Financials', href: `/businesses/${id}/financials`, icon: DollarSign },
          { label: 'Analysis', href: `/businesses/${id}/analysis`, icon: BarChart3 },
          { label: 'Reports', href: `/businesses/${id}/reports`, icon: FileText },
        ].map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              href === `/businesses/${id}/analysis`
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-blue-300 hover:text-gray-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </div>

      {errorMsg && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {!latest ? (
        <Card>
          <div className="flex flex-col items-center py-14 text-center">
            <BarChart3 className="mb-4 h-14 w-14 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-700">
              No analysis yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {financials.length === 0
                ? 'Add financial data first, then run an analysis.'
                : 'Click "Run Analysis" to generate your risk assessment.'}
            </p>
            {financials.length === 0 && (
              <Link
                href={`/businesses/${id}/financials`}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <DollarSign className="h-4 w-4" />
                Add Financial Data
              </Link>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Score */}
          <Card title="Risk Assessment">
            <RiskScoreDisplay analysis={latest} />
          </Card>

          {/* Metrics grid */}
          <Card title="Key Metrics">
            <MetricsGrid analysis={latest} />
          </Card>

          {/* Charts row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title="Revenue vs Expenses">
              <RevenueExpenseChart records={financials} />
            </Card>
            <Card title="Cash Runway Trend">
              <RunwayChart analyses={analyses} />
            </Card>
          </div>

          {/* Detailed metrics table */}
          <Card title="Detailed Metrics">
            <MetricsTable analysis={latest} />
          </Card>

          {/* Recommendations */}
          <Card title="Recommendations">
            <RecommendationsList recommendations={latest.recommendations} />
          </Card>
        </div>
      )}
    </div>
  );
}
