'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Play, Building2, DollarSign, BarChart3, FileText } from 'lucide-react';
import { businessApi, analysisApi, financialApi } from '@/lib/api';
import { useLanguage } from '@/hooks/useLanguage';
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
import { ForecastChart } from '@/components/analysis/ForecastChart';
import { ScenarioSimulator } from '@/components/analysis/ScenarioSimulator';
import { AiChatPanel } from '@/components/analysis/AiChatPanel';
import { getBenchmark } from '@/lib/benchmarks';
import type { Business, RiskAnalysis, FinancialRecord } from '@/types';

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
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
      setSuccessMsg(t.analysis.latestMonthlySuccess);
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
      setSuccessMsg(t.analysis.allMonthsSuccess.replace('{count}', String(response.data.length)));
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
      setSuccessMsg(t.analysis.combinedSuccess);
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
    total_assets: t.sources.total_assets,
    current_liabilities: t.sources.current_liabilities,
    ebit: t.sources.ebit,
    retained_earnings: t.sources.retained_earnings,
  };
  const sourceDescriptions: Record<string, string> = {
    provided: t.sources.provided,
    fallback_revenue_plus_cash: t.sources.fallback_revenue_plus_cash,
    fallback_half_revenue_plus_cash: t.sources.fallback_half_revenue_plus_cash,
    fallback_monthly_expenses: t.sources.fallback_monthly_expenses,
    fallback_revenue_minus_expenses: t.sources.fallback_revenue_minus_expenses,
    fallback_revenue_minus_expenses_minus_cogs:
      t.sources.fallback_revenue_minus_expenses_minus_cogs,
    unknown: t.sources.unknown,
  };

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <>
    <div>
      <PageHeader
        title={t.analysis.title}
        description={business?.name ?? ''}
        breadcrumbs={[
          { label: t.nav.businesses, href: '/businesses' },
          { label: business?.name ?? 'Business', href: `/businesses/${id}` },
          { label: t.nav.analysis },
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
              {t.analysis.runLatest}
            </Button>
            <Button
              variant="secondary"
              onClick={runAllMonthsAnalysis}
              loading={runningMode === 'all-months'}
              disabled={financials.length === 0 || runningMode !== null}
            >
              <Play className="h-4 w-4" />
              {t.analysis.runAllMonths}
            </Button>
            <Button
              onClick={runCombinedAnalysis}
              loading={runningMode === 'combined'}
              disabled={financials.length === 0 || runningMode !== null}
            >
              <Play className="h-4 w-4" />
              {t.analysis.runCombined}
            </Button>
          </div>
        }
      />

      {/* Navigation tabs */}
      <div className="mb-6 flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {[
          { label: t.nav.overview, href: `/businesses/${id}`, icon: Building2 },
          { label: t.nav.financials, href: `/businesses/${id}/financials`, icon: DollarSign },
          { label: t.nav.analysis, href: `/businesses/${id}/analysis`, icon: BarChart3 },
          { label: t.nav.reports, href: `/businesses/${id}/reports`, icon: FileText },
        ].map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              href === `/businesses/${id}/analysis`
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-blue-300 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </div>

      {errorMsg && (
        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="mb-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          {successMsg}
        </div>
      )}

      <div className="mb-4 inline-flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1 gap-1">
        <button
          type="button"
          onClick={() => setActiveScope('monthly')}
          className={`rounded-md px-4 py-1.5 text-xs font-medium transition-all ${
            activeScope === 'monthly'
              ? 'bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-300 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          {t.analysis.monthly} ({monthlyAnalyses.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveScope('combined')}
          className={`rounded-md px-4 py-1.5 text-xs font-medium transition-all ${
            activeScope === 'combined'
              ? 'bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-300 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          {t.analysis.combined} ({combinedAnalyses.length})
        </button>
      </div>

      {!latest ? (
        <Card>
          <div className="flex flex-col items-center py-14 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/30 mb-4">
              <BarChart3 className="h-8 w-8 text-blue-500 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              {t.analysis.noAnalysisYet}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
              {financials.length === 0
                ? t.analysis.addDataFirst
                : activeScope === 'combined'
                ? t.analysis.runCombinedHint
                : t.analysis.runLatestHint}
            </p>
            {financials.length === 0 && (
              <Link
                href={`/businesses/${id}/financials`}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
              >
                <DollarSign className="h-4 w-4" />
                {t.businesses.addFinancialData}
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
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 px-4 py-3">
              <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">{t.analysis.staleWarningTitle}</p>
                <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300">
                  {t.analysis.staleWarningText}
                </p>
              </div>
              <button
                type="button"
                onClick={runLatestAnalysis}
                disabled={runningMode !== null}
                className="flex-shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                {runningMode === 'latest' ? t.analysis.running : t.analysis.rerunNow}
              </button>
            </div>
          )}

          {/* Score */}
          <Card title={t.analysis.riskAssessment} subtitle={t.analysis.riskAssessmentSubtitle}>
            <RiskScoreDisplay analysis={latest} />
          </Card>

          {/* AI Financial Summary */}
          <Card>
            <AiFinancialSummary analysis={latest} />
          </Card>

          {/* Metrics grid */}
          <Card title={t.analysis.keyMetrics} subtitle={t.analysis.keyMetricsSubtitle}>
            <MetricsGrid analysis={latest} />
          </Card>

          {/* Charts row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title={t.analysis.revenueVsExpenses} subtitle={t.analysis.revenueVsExpensesSubtitle}>
              <RevenueExpenseChart records={financials} />
            </Card>
            {monthlyAnalyses.some((a) => a.cash_runway_months !== null && a.cash_runway_months < 999) && (
              <Card title={t.analysis.cashRunwayTrend} subtitle={t.analysis.cashRunwayTrendSubtitle}>
                <RunwayChart analyses={monthlyAnalyses} />
              </Card>
            )}
          </div>

          {/* 12-Month Forecast */}
          <Card title={t.analysis.forecast} subtitle={t.analysis.forecastSubtitle}>
            <ForecastChart businessId={id} />
          </Card>

          {/* Scenario Simulator */}
          <Card title={t.analysis.scenarioAnalysis} subtitle={t.analysis.scenarioSubtitle}>
            <ScenarioSimulator businessId={id} />
          </Card>

          {/* Detailed metrics table */}
          <Card title={t.analysis.detailedMetrics} subtitle={t.analysis.detailedMetricsSubtitle}>
            <MetricsTable analysis={latest} />
          </Card>

          <Card title={t.analysis.calculationSources} subtitle={t.analysis.calculationSourcesSubtitle}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Object.entries(sourceLabels).map(([key, label]) => {
                const source = latest.calculation_sources?.[key] ?? 'unknown';
                const isProvided = source === 'provided';
                const sourceText = sourceDescriptions[source] ?? `Fallback (${source})`;
                return (
                  <div key={key} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
                    <p className={`mt-1 text-sm font-semibold ${isProvided ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                      {sourceText}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Smart AI Recommendations */}
          <Card title={t.analysis.aiRecommendations} subtitle={t.analysis.aiRecommendationsSubtitle}>
            <SmartRecommendations analysis={latest} />
          </Card>

          {/* Static backend recommendations (fallback / supplementary) */}
          {latest.recommendations && latest.recommendations.length > 0 && (
            <Card title={t.analysis.additionalInsights} subtitle={t.analysis.additionalInsightsSubtitle}>
              <RecommendationsList recommendations={latest.recommendations} />
            </Card>
          )}

          {/* Executive Summary */}
          <Card>
            <ExecutiveSummaryCard analysis={latest} businessName={business?.name} />
          </Card>

          {/* Financial Health Score + Bankruptcy Probability */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title={t.analysis.financialHealthScore} subtitle={t.analysis.financialHealthSubtitle}>
              <FinancialHealthCard analysis={latest} />
            </Card>

            {/* Industry Benchmark Comparison */}
            {business && (
              <Card title={t.analysis.industryBenchmark} subtitle={t.analysis.industryBenchmarkSubtitle}>
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

    {/* AI Chat Panel — fixed at bottom of viewport */}
    {latest && <AiChatPanel businessId={id} analysis={latest} />}
    </>
  );
}
