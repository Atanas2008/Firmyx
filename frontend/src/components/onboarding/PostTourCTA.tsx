'use client';

import Link from 'next/link';
import { ArrowRight, Upload, PenLine, Zap } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import type { ValidatedMetrics } from '@/lib/aiInsights';

interface PostTourCTAProps {
  metrics: ValidatedMetrics;
  onDismiss: () => void;
}

function topRiskLabel(m: ValidatedMetrics): string {
  if (m.liquidity_ratio < 1) return 'liquidity imbalance';
  if (m.debt_ratio >= 0.6) return 'high leverage';
  if (m.profit_margin < 0) return 'negative profitability';
  if (m.altman_z < 1.8) return 'insolvency risk';
  if (m.revenue_trend_label === 'Declining') return 'declining revenue';
  return 'financial risk exposure';
}

export function PostTourCTA({ metrics, onDismiss }: PostTourCTAProps) {
  const { t } = useLanguage();
  const risk = topRiskLabel(metrics);

  return (
    <div className="rounded-2xl border border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 p-6 mb-6 animate-fade-in-up">
      {/* Instant insight banner */}
      <div className="flex items-start gap-3 mb-4">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50">
          <Zap className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
            {t.onboarding.insightBanner.replace('{risk}', risk)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {t.onboarding.insightBannerSub}
          </p>
        </div>
      </div>

      {/* Transition prompt */}
      <div className="border-t border-blue-200/50 dark:border-blue-800/50 pt-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {t.onboarding.transitionPrompt}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-all shadow-sm"
          >
            <Upload className="h-4 w-4" />
            {t.onboarding.uploadCsvExcel}
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            <PenLine className="h-4 w-4" />
            {t.onboarding.enterManually}
          </Link>
        </div>
      </div>

      {/* Scenario link */}
      <button
        onClick={onDismiss}
        className="mt-3 inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
      >
        {t.onboarding.continueExploring}
        <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}
