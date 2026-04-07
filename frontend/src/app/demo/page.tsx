'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useOnboarding } from '@/hooks/useOnboarding';
import { buildValidatedMetrics } from '@/lib/aiInsights';
import { DEMO_BUSINESS, DEMO_ANALYSIS, DEMO_FINANCIALS, DEMO_MONTHLY_ANALYSES } from '@/lib/demoData';
import { getBenchmark } from '@/lib/benchmarks';

import { Card } from '@/components/ui/Card';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { DecisionHeader } from '@/components/analysis/DecisionHeader';
import { ExecutiveSummary } from '@/components/analysis/ExecutiveSummary';
import { KeyMetricsGrouped } from '@/components/analysis/KeyMetricsGrouped';
import { RiskBreakdown } from '@/components/analysis/RiskBreakdown';
import { SmartRecommendations } from '@/components/analysis/SmartRecommendations';
import { RevenueExpenseChart } from '@/components/dashboard/charts/RevenueExpenseChart';
import { RunwayChart } from '@/components/dashboard/charts/RunwayChart';
import { IndustryBenchmarkTable } from '@/components/analysis/IndustryBenchmarkTable';
import { InsightBanner } from '@/components/analysis/InsightBanner';
import { UrgencyAlerts } from '@/components/analysis/UrgencyAlerts';
import { GuidedTour } from '@/components/onboarding/GuidedTour';
import { PostTourCTA } from '@/components/onboarding/PostTourCTA';

export default function DemoPage() {
  const { t } = useLanguage();
  const { hasSeenTour, completeTour, skipTour } = useOnboarding();
  const [showTour, setShowTour] = useState(false);
  const [showCTA, setShowCTA] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Auto-start tour after a brief delay if user hasn't seen it
    const timer = setTimeout(() => {
      if (!hasSeenTour) {
        setShowTour(true);
      } else {
        setShowCTA(true);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [hasSeenTour]);

  function handleTourComplete() {
    setShowTour(false);
    setShowCTA(true);
    completeTour();
  }

  function handleTourSkip() {
    setShowTour(false);
    setShowCTA(true);
    skipTour();
  }

  const metrics = buildValidatedMetrics(DEMO_ANALYSIS);
  const latest = DEMO_ANALYSIS;
  const business = DEMO_BUSINESS;
  const financials = DEMO_FINANCIALS;
  const monthlyAnalyses = DEMO_MONTHLY_ANALYSES;

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Minimal top bar for demo (no sidebar) */}
      <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <img src="/logo.png" alt="Firmyx" className="h-12 dark:hidden" />
              <img src="/logo-dark.png" alt="Firmyx" className="h-12 hidden dark:block" />
            </Link>
            <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
              {t.onboarding.demoMode}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t.common.back}
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              {t.auth.createAccount}
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-6xl px-6 py-6">
        {/* Demo business header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">{t.onboarding.demoTitle}</h1>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {business.name} · {business.industry} · {t.onboarding.demoSubtitle}
          </p>
        </div>

        {/* Post-tour CTA */}
        {showCTA && (
          <PostTourCTA
            metrics={metrics}
            onDismiss={() => setShowCTA(false)}
          />
        )}

        {/* Analysis dashboard — same layout as real analysis page */}
        <div className="space-y-6">
          {/* 0. INSIGHT — Instant insight banner + Urgency */}
          <InsightBanner analysis={latest} scenarioHref="/register" ctaLabel={t.conversion.signUpToSimulate} />
          <UrgencyAlerts analyses={monthlyAnalyses} />

          {/* 1. TELL — Decision Header */}
          <div id="tour-decision-header">
            <DecisionHeader analysis={latest} />
          </div>

          {/* 2. EXPLAIN — Executive Summary */}
          <Card>
            <ExecutiveSummary analysis={latest} businessName={business.name} />
          </Card>

          {/* 3. PROVE — Key Metrics */}
          <KeyMetricsGrouped analysis={latest} />

          {/* 4. PROVE — Risk Score Breakdown */}
          <Card title={t.decision.riskBreakdown} subtitle={t.decision.riskBreakdownSubtitle}>
            <div id="tour-risk-drivers">
              <RiskBreakdown analysis={latest} />
            </div>
          </Card>

          {/* 5. ACT — Recommendations */}
          <div id="tour-recommendations">
            <Card title={t.decision.recommendations} subtitle={t.decision.recommendationsSubtitle}>
              <SmartRecommendations analysis={latest} scenarioHref="/register" />
            </Card>
          </div>

          {/* 6. Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title={t.analysis.revenueVsExpenses} subtitle={t.analysis.revenueVsExpensesSubtitle}>
              <RevenueExpenseChart records={financials} />
            </Card>
            <Card title={t.analysis.cashRunwayTrend} subtitle={t.analysis.cashRunwayTrendSubtitle}>
              <RunwayChart analyses={monthlyAnalyses} />
            </Card>
          </div>

          {/* 7. Benchmark — collapsed */}
          <CollapsibleSection title={t.analysis.industryBenchmark} subtitle={t.analysis.industryBenchmarkSubtitle}>
            <IndustryBenchmarkTable
              analysis={latest}
              benchmark={getBenchmark(business.industry)}
              industryName={business.industry}
            />
          </CollapsibleSection>
        </div>

        {/* Bottom CTA */}
        <div className="mt-10 mb-8 text-center">
          <div className="mx-auto max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-8 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50">{t.onboarding.transitionPrompt}</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t.onboarding.bottomCTADesc}</p>
            <div className="mt-5 flex justify-center gap-3">
              <Link
                href="/register"
                className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
              >
                {t.onboarding.getStartedFree}
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Guided tour overlay */}
      {showTour && (
        <GuidedTour
          onComplete={handleTourComplete}
          onSkip={handleTourSkip}
        />
      )}
    </div>
  );
}
