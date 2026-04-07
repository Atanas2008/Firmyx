'use client';

import Link from 'next/link';
import { ArrowUp, ArrowDown, AlertTriangle, Bell, TrendingUp, ArrowRight } from 'lucide-react';
import { identifyBiggestRisk, computeScoreChange, detectUrgencyAlerts } from '@/lib/aiInsights';
import { useLanguage } from '@/hooks/useLanguage';
import type { RiskAnalysis } from '@/types';

interface StatusBarProps {
  analysis: RiskAnalysis;
  analyses: RiskAnalysis[];
  scenarioHref: string;
}

/**
 * Consolidated status bar replacing the 3 stacked banners (InsightBanner +
 * RetentionBanner + UrgencyAlerts). Shows all critical context in a single
 * horizontal strip, reducing cognitive load and scroll depth.
 */
export function StatusBar({ analysis, analyses, scenarioHref }: StatusBarProps) {
  const { t } = useLanguage();
  const risk = identifyBiggestRisk(analysis);
  const scoreChange = computeScoreChange(analyses);
  const alerts = detectUrgencyAlerts(analyses);
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const totalAlerts = alerts.length;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800 sm:flex-row sm:divide-x sm:divide-y-0">
        {/* Segment 1: Score trend */}
        {scoreChange && Math.abs(scoreChange.delta) >= 1 && (
          <div className="flex items-center gap-3 px-4 py-3 flex-1 min-w-0">
            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
              scoreChange.improved
                ? 'bg-emerald-100 dark:bg-emerald-900/40'
                : 'bg-red-100 dark:bg-red-900/40'
            }`}>
              {scoreChange.improved
                ? <ArrowDown className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                : <ArrowUp className="h-4 w-4 text-red-600 dark:text-red-400" />
              }
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-bold ${
                scoreChange.improved
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-red-700 dark:text-red-300'
              }`}>
                {scoreChange.improved ? '−' : '+'}{Math.abs(scoreChange.delta).toFixed(0)} pts
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                {t.enterprise.sinceLastAnalysis}
              </p>
            </div>
          </div>
        )}

        {/* Segment 2: Top risk */}
        <div className="flex items-center gap-3 px-4 py-3 flex-1 min-w-0">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400">{t.enterprise.topRisk}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-50 truncate capitalize">
              {risk.label}
            </p>
          </div>
        </div>

        {/* Segment 3: Alerts count */}
        <div className="flex items-center gap-3 px-4 py-3 flex-1 min-w-0">
          <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
            criticalCount > 0
              ? 'bg-red-100 dark:bg-red-900/40'
              : totalAlerts > 0
              ? 'bg-amber-100 dark:bg-amber-900/40'
              : 'bg-emerald-100 dark:bg-emerald-900/40'
          }`}>
            {totalAlerts > 0
              ? <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              : <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            }
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
              {totalAlerts > 0
                ? t.enterprise.alertsDetected.replace('{count}', String(totalAlerts))
                : t.enterprise.noAlerts
              }
            </p>
            {criticalCount > 0 && (
              <p className="text-[10px] text-red-600 dark:text-red-400 font-medium">
                {criticalCount} critical
              </p>
            )}
          </div>
        </div>

        {/* Segment 4: CTA */}
        <div className="flex items-center px-4 py-3 flex-shrink-0 w-full sm:w-auto">
          <Link
            href={scenarioHref}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gray-900 dark:bg-white px-4 py-2.5 sm:px-3.5 sm:py-2 text-sm sm:text-xs font-bold text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors whitespace-nowrap w-full sm:w-auto"
          >
            {t.conversion.reduceYourRisk}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
