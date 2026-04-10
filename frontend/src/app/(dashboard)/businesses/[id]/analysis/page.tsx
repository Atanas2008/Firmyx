'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Play, DollarSign, BarChart3 } from 'lucide-react';
import { businessApi, analysisApi, financialApi } from '@/lib/api';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { LimitReachedModal } from '@/components/LimitReachedModal';
import { BusinessTabs } from '@/components/layout/BusinessTabs';
import { DecisionHeader } from '@/components/analysis/DecisionHeader';
import { ExecutiveSummary } from '@/components/analysis/ExecutiveSummary';
import { KeyMetricsGrouped } from '@/components/analysis/KeyMetricsGrouped';
import { RiskBreakdown } from '@/components/analysis/RiskBreakdown';
import { SmartRecommendations } from '@/components/analysis/SmartRecommendations';
import { RevenueExpenseChart } from '@/components/dashboard/charts/RevenueExpenseChart';
import { RunwayChart } from '@/components/dashboard/charts/RunwayChart';
import { ForecastChart } from '@/components/analysis/ForecastChart';
import { IndustryBenchmarkTable } from '@/components/analysis/IndustryBenchmarkTable';
import { AiChatPanel } from '@/components/analysis/AiChatPanel';
import { AskAiButton } from '@/components/analysis/AskAiButton';
import { StatusBar } from '@/components/analysis/StatusBar';
import { PrimaryAction } from '@/components/analysis/PrimaryAction';
import { ScoreDecomposition } from '@/components/analysis/ScoreDecomposition';
import { DataConfidence } from '@/components/analysis/DataConfidence';
import { SmartScenarioSuggestion } from '@/components/analysis/SmartScenarioSuggestion';
import { PeerComparison } from '@/components/analysis/PeerComparison';
import { ActionPlan } from '@/components/analysis/ActionPlan';
import { OutcomeTimeline } from '@/components/analysis/OutcomeTimeline';
import { getBenchmark } from '@/lib/benchmarks';
import type { Business, RiskAnalysis, FinancialRecord } from '@/types';

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [analyses, setAnalyses] = useState<RiskAnalysis[]>([]);
  const [financials, setFinancials] = useState<FinancialRecord[]>([]);
  const [runningMode, setRunningMode] = useState<'latest' | 'all-months' | 'combined' | null>(null);
  const [activeScope, setActiveScope] = useState<'monthly' | 'combined'>('monthly');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const askAiRef = useRef<((question: string) => void) | null>(null);

  const askAi = useCallback((question: string) => {
    askAiRef.current?.(question);
  }, []);

  function extractErrorMessage(err: unknown): string {
    const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
    if (typeof detail === 'string') {
      if (detail === 'FREE_LIMIT_REACHED') {
        setLimitModalOpen(true);
        return '';
      }
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
      const analysisItems = aRes.data.items ?? aRes.data;
      setAnalyses(
        [...analysisItems].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
      const financialItems = fRes.data.items ?? fRes.data;
      setFinancials(financialItems);
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

  const isLimitReached = user ? !user.is_unlocked && user.analyses_count >= 1 : false;

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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Button
              variant="secondary"
              onClick={runLatestAnalysis}
              loading={runningMode === 'latest'}
              disabled={financials.length === 0 || runningMode !== null || isLimitReached}
            >
              <Play className="h-4 w-4" />
              {t.analysis.runLatest}
            </Button>
            <Button
              variant="secondary"
              onClick={runAllMonthsAnalysis}
              loading={runningMode === 'all-months'}
              disabled={financials.length === 0 || runningMode !== null || isLimitReached}
            >
              <Play className="h-4 w-4" />
              {t.analysis.runAllMonths}
            </Button>
            <Button
              onClick={runCombinedAnalysis}
              loading={runningMode === 'combined'}
              disabled={financials.length === 0 || runningMode !== null || isLimitReached}
            >
              <Play className="h-4 w-4" />
              {t.analysis.runCombined}
            </Button>
          </div>
        }
      />

      {/* Navigation tabs */}
      <BusinessTabs businessId={id} activeTab="analysis" />

      {/* Early access limit banner */}
      {isLimitReached && (
        <div className="mb-4 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-700 dark:text-amber-300 flex items-center justify-between gap-4">
          <span>{t.limit.earlyAccessBanner}</span>
          <a
            href="mailto:support@firmyx.com"
            className="flex-shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
          >
            {t.limit.contactUs}
          </a>
        </div>
      )}

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

      <div className="mb-4 inline-flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1 gap-1 w-full sm:w-auto">
        <button
          type="button"
          onClick={() => setActiveScope('monthly')}
          className={`flex-1 sm:flex-initial rounded-md px-4 py-2 sm:py-1.5 text-xs font-medium transition-all ${
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
          className={`flex-1 sm:flex-initial rounded-md px-4 py-2 sm:py-1.5 text-xs font-medium transition-all ${
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
          {/* Stale-analysis warning */}
          {latest.calculation_sources?.scoring_model_version !== '5.0' && (
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

          {/* ═══════════════════════════════════════════════════════════
              SECTION 1 — Your Score (always visible)
             ═══════════════════════════════════════════════════════════ */}
          <div className="flex items-center gap-2 mt-8 mb-4">
            <div className="h-6 w-1 rounded-full bg-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              {t.sectionHeaders.yourScore}
            </h2>
          </div>

          <StatusBar
            analysis={latest}
            analyses={activeScope === 'combined' ? combinedAnalyses : monthlyAnalyses}
            scenarioHref={`/businesses/${id}/scenario`}
          />

          <DecisionHeader analysis={latest} scenarioHref={`/businesses/${id}/scenario`} />

          <Card>
            <ExecutiveSummary analysis={latest} businessName={business?.name} />
          </Card>

          <DataConfidence analysis={latest} />

          {/* ═══════════════════════════════════════════════════════════
              SECTION 2 — What to Do (always visible)
             ═══════════════════════════════════════════════════════════ */}
          <div className="flex items-center gap-2 mt-8 mb-4">
            <div className="h-6 w-1 rounded-full bg-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              {t.sectionHeaders.whatToDo}
            </h2>
          </div>

          <PrimaryAction analysis={latest} scenarioHref={`/businesses/${id}/scenario`} />

          <Card
            title={t.decision.recommendations}
            subtitle={t.decision.recommendationsSubtitle}
            actions={<AskAiButton question="What are the most impactful actions I can take right now to reduce my risk score?" onAsk={askAi} label={t.chat.askAi} />}
          >
            <SmartRecommendations analysis={latest} scenarioHref={`/businesses/${id}/scenario`} />
          </Card>

          <div id="action-plan-section">
            <ActionPlan analysis={latest} businessId={id} />
          </div>

          <SmartScenarioSuggestion
            analysis={latest}
            businessId={id}
            scenarioHref={`/businesses/${id}/scenario`}
          />

          {/* ═══════════════════════════════════════════════════════════
              SECTION 3 — Detailed Analysis (collapsible, closed by default)
             ═══════════════════════════════════════════════════════════ */}
          <div className="flex items-center gap-2 mt-8 mb-4">
            <div className="h-6 w-1 rounded-full bg-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              {t.sectionHeaders.details}
            </h2>
          </div>

          <CollapsibleSection title={t.decision.keyMetrics} subtitle={t.analysis.keyMetricsSubtitle}>
            <div className="space-y-4">
              <div className="flex items-center justify-end mb-2">
                <AskAiButton question="Explain my key financial metrics and what they mean for my business" onAsk={askAi} label={t.chat.askAi} />
              </div>
              <KeyMetricsGrouped analysis={latest} />
              {business && <PeerComparison analysis={latest} business={business} />}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title={t.enterprise.scoreBreakdown} subtitle={t.decision.riskBreakdownSubtitle}>
            <div className="space-y-4">
              <ScoreDecomposition analysis={latest} />
              <Card
                title={t.decision.riskBreakdown}
                actions={<AskAiButton question={`Why is my risk score ${Math.round(latest.risk_score)}? Break down each risk component`} onAsk={askAi} label={t.chat.askAi} />}
              >
                <RiskBreakdown analysis={latest} />
              </Card>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title={t.analysis.revenueVsExpenses} subtitle={t.analysis.revenueVsExpensesSubtitle}>
            <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
              <Card title={t.analysis.revenueVsExpenses}>
                <RevenueExpenseChart records={financials} />
              </Card>
              {monthlyAnalyses.some((a) => a.cash_runway_months !== null && a.cash_runway_months < 999) && (
                <Card title={t.analysis.cashRunwayTrend} subtitle={t.analysis.cashRunwayTrendSubtitle}>
                  <RunwayChart analyses={monthlyAnalyses} />
                </Card>
              )}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title={t.analysis.forecast} subtitle={t.analysis.forecastSubtitle}>
            <ForecastChart businessId={id} />
          </CollapsibleSection>

          <CollapsibleSection title={t.enterprise.outcome.timelineTitle} subtitle={t.enterprise.outcome.timelineSub}>
            <OutcomeTimeline analyses={activeScope === 'combined' ? combinedAnalyses : monthlyAnalyses} />
          </CollapsibleSection>

          <CollapsibleSection title={t.analysis.calculationSources} subtitle={t.analysis.calculationSourcesSubtitle}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {Object.entries(sourceLabels).map(([key, label]) => {
                  const source = String(latest.calculation_sources?.[key] ?? 'unknown');
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
              {business && (
                <IndustryBenchmarkTable
                  analysis={latest}
                  benchmark={getBenchmark(business.industry)}
                  industryName={business.industry}
                />
              )}
            </div>
          </CollapsibleSection>
        </div>
      )}
    </div>

    {/* AI Chat Panel */}
    {latest && (
      <AiChatPanel businessId={id} analysis={latest} onAskRef={askAiRef} />
    )}

    {/* Free limit reached modal */}
    <LimitReachedModal open={limitModalOpen} onClose={() => setLimitModalOpen(false)} />
    </>
  );
}
