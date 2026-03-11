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
import { FinancialHealthCard } from '@/components/analysis/FinancialHealthCard';
import { IndustryBenchmarkTable } from '@/components/analysis/IndustryBenchmarkTable';
import { AiFinancialSummary } from '@/components/analysis/AiFinancialSummary';
import { ExecutiveSummaryCard } from '@/components/analysis/ExecutiveSummaryCard';
import { SmartRecommendations } from '@/components/analysis/SmartRecommendations';
import { getBenchmark } from '@/lib/benchmarks';
import type { Business, RiskAnalysis, FinancialRecord } from '@/types';

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [analyses, setAnalyses] = useState<RiskAnalysis[]>([]);
  const [financials, setFinancials] = useState<FinancialRecord[]>([]);
  const [runningMode, setRunningMode] = useState<'latest' | 'all-months' | 'combined' | null>(null);
  const [activeScope, setActiveScope] = useState<'monthly' | 'combined'>('monthly');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  function extractErrorMessage(err: unknown): string {
    const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
    if (typeof detail === 'string') {
      return detail;
    }
    if (detail && typeof detail === 'object') {
      const message = (detail as { message?: string }).message;
      if (message) return message;
    }
    return 'Failed to run analysis. Ensure financial records exist.';
  }

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

  async function runLatestAnalysis() {
    setRunningMode('latest');
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await analysisApi.run(id);
      await loadData();
      setActiveScope('monthly');
      setSuccessMsg('Latest monthly analysis completed successfully.');
    } catch (err: unknown) {
      setErrorMsg(extractErrorMessage(err));
    } finally {
      setRunningMode(null);
    }
  }

  async function runAllMonthsAnalysis() {
    setRunningMode('all-months');
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const response = await analysisApi.runAllMonths(id);
      await loadData();
      setActiveScope('monthly');
      setSuccessMsg(`Generated ${response.data.length} monthly analyses successfully.`);
    } catch (err: unknown) {
      setErrorMsg(extractErrorMessage(err));
    } finally {
      setRunningMode(null);
    }
  }

  async function runCombinedAnalysis() {
    setRunningMode('combined');
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await analysisApi.runCombined(id);
      await loadData();
      setActiveScope('combined');
      setSuccessMsg('Combined multi-month analysis completed successfully.');
    } catch (err: unknown) {
      setErrorMsg(extractErrorMessage(err));
    } finally {
      setRunningMode(null);
    }
  }

  const monthlyAnalyses = analyses.filter((analysis) => analysis.analysis_scope === 'monthly');
  const combinedAnalyses = analyses.filter((analysis) => analysis.analysis_scope === 'combined');
  const latest = activeScope === 'combined' ? (combinedAnalyses[0] ?? null) : (monthlyAnalyses[0] ?? null);
  const sourceLabels: Record<string, string> = {
    total_assets: 'Total Assets',
    current_liabilities: 'Current Liabilities',
    ebit: 'EBIT',
    retained_earnings: 'Retained Earnings',
  };
  const sourceDescriptions: Record<string, string> = {
    provided: 'Provided input',
    fallback_revenue_plus_cash: 'Estimated from Revenue + Cash Reserves',
    fallback_half_revenue_plus_cash: 'Estimated from Cash + 50% Annual Revenue',
    fallback_monthly_expenses: 'Estimated from Monthly Expenses',
    fallback_revenue_minus_expenses: 'Estimated from Revenue - Expenses',
    fallback_revenue_minus_expenses_minus_cogs:
      'Estimated from Revenue - Expenses - COGS',
    unknown: 'Source unavailable',
  };

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
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={runLatestAnalysis}
              loading={runningMode === 'latest'}
              disabled={financials.length === 0 || runningMode !== null}
            >
              <Play className="h-4 w-4" />
              Run Latest
            </Button>
            <Button
              variant="secondary"
              onClick={runAllMonthsAnalysis}
              loading={runningMode === 'all-months'}
              disabled={financials.length === 0 || runningMode !== null}
            >
              <Play className="h-4 w-4" />
              Run All Months
            </Button>
            <Button
              onClick={runCombinedAnalysis}
              loading={runningMode === 'combined'}
              disabled={financials.length === 0 || runningMode !== null}
            >
              <Play className="h-4 w-4" />
              Run Combined
            </Button>
          </div>
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
      {successMsg && (
        <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
          {successMsg}
        </div>
      )}

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setActiveScope('monthly')}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            activeScope === 'monthly'
              ? 'border-blue-600 bg-blue-50 text-blue-700'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Monthly ({monthlyAnalyses.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveScope('combined')}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            activeScope === 'combined'
              ? 'border-blue-600 bg-blue-50 text-blue-700'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Combined ({combinedAnalyses.length})
        </button>
      </div>

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
                : activeScope === 'combined'
                ? 'Click "Run Combined" to generate a multi-month aggregate analysis.'
                : 'Click "Run Latest" or "Run All Months" to generate monthly analyses.'}
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
          {/* Stale-analysis warning — shown when the stored result was computed
              with an older scoring model (model version < "2.0"). All analyses
              generated after the 2026-03-12 scoring update are stamped with
              calculation_sources.scoring_model_version = "2.0". */}
          {latest.calculation_sources?.scoring_model_version !== '2.0' && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">Scoring model updated — results may be outdated</p>
                <p className="mt-0.5 text-xs text-amber-700">
                  This analysis was generated before the latest risk scoring update (v2.0), which adds
                  distress penalties for negative Z-scores, negative profit margins, and short cash runways.
                  Re-run the analysis to get accurate results.
                </p>
              </div>
              <button
                type="button"
                onClick={runLatestAnalysis}
                disabled={runningMode !== null}
                className="flex-shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                {runningMode === 'latest' ? 'Running…' : 'Re-run Now'}
              </button>
            </div>
          )}

          {/* Score */}
          <Card title="Risk Assessment">
            <RiskScoreDisplay analysis={latest} />
          </Card>

          {/* AI Financial Summary */}
          <Card>
            <AiFinancialSummary analysis={latest} />
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
            {monthlyAnalyses.some((a) => a.cash_runway_months !== null && a.cash_runway_months < 999) && (
              <Card title="Cash Runway Trend">
                <RunwayChart analyses={monthlyAnalyses} />
              </Card>
            )}
          </div>

          {/* Detailed metrics table */}
          <Card title="Detailed Metrics">
            <MetricsTable analysis={latest} />
          </Card>

          <Card title="Calculation Sources">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Object.entries(sourceLabels).map(([key, label]) => {
                const source = latest.calculation_sources?.[key] ?? 'unknown';
                const isProvided = source === 'provided';
                const sourceText = sourceDescriptions[source] ?? `Fallback (${source})`;
                return (
                  <div key={key} className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
                    <p className={`mt-1 text-sm font-semibold ${isProvided ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {sourceText}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Smart AI Recommendations */}
          <Card title="AI Recommendations">
            <SmartRecommendations analysis={latest} />
          </Card>

          {/* Static backend recommendations (fallback / supplementary) */}
          {latest.recommendations && latest.recommendations.length > 0 && (
            <Card title="Additional Insights">
              <RecommendationsList recommendations={latest.recommendations} />
            </Card>
          )}

          {/* Executive Summary */}
          <Card>
            <ExecutiveSummaryCard analysis={latest} businessName={business?.name} />
          </Card>

          {/* Financial Health Score + Bankruptcy Probability */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title="Financial Health Score">
              <FinancialHealthCard analysis={latest} />
            </Card>

            {/* Industry Benchmark Comparison */}
            {business && (
              <Card title="Industry Benchmark Comparison">
                <IndustryBenchmarkTable
                  analysis={latest}
                  benchmark={getBenchmark(business.industry)}
                  industryName={business.industry}
                />
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
