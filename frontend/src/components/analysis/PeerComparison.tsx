'use client';

import { Users, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { buildValidatedMetrics } from '@/lib/aiInsights';
import { useLanguage } from '@/hooks/useLanguage';
import type { RiskAnalysis, Business } from '@/types';

interface PeerComparisonProps {
  analysis: RiskAnalysis;
  business: Business;
}

/**
 * Industry peer comparison — social proof + competitive pressure.
 * Uses a deterministic pseudo-benchmark based on industry to show relative
 * position. "67% of {industry} businesses have lower risk" creates urgency.
 *
 * In production, replace with real aggregated anonymized data.
 */
export function PeerComparison({ analysis, business }: PeerComparisonProps) {
  const { t } = useLanguage();
  const m = buildValidatedMetrics(analysis);

  // Deterministic industry benchmarks (medians derived from common data)
  const industryMedians: Record<string, number> = {
    'Technology': 35,
    'Retail': 42,
    'Manufacturing': 38,
    'Healthcare': 30,
    'Food & Beverage': 45,
    'Construction': 48,
    'Finance': 28,
    'Real Estate': 40,
    'Education': 32,
    'Transport': 44,
  };

  const medianRisk = industryMedians[business.industry] ?? 40;
  const topPerformerThreshold = Math.round(medianRisk * 0.55);

  // Calculate percentile position (higher risk = worse percentile)
  // Simple model: assume normal distribution around median with std dev = 15
  const zScore = (m.risk_score - medianRisk) / 15;
  const percentile = Math.min(99, Math.max(1, Math.round(50 + zScore * 34)));
  const betterThanPct = 100 - percentile;
  const isBetter = m.risk_score < medianRisk;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50">
          <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-50">
            {t.enterprise.peerComparison}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t.enterprise.peerComparisonSub}
          </p>
        </div>
      </div>

      {/* Visual position bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
          <span>Lower risk</span>
          <span>{t.enterprise.yourPosition}</span>
          <span>Higher risk</span>
        </div>
        <div className="relative h-3 rounded-full bg-gradient-to-r from-emerald-200 via-yellow-200 to-red-200 dark:from-emerald-900/40 dark:via-yellow-900/40 dark:to-red-900/40">
          {/* Industry median marker */}
          <div
            className="absolute top-0 h-full w-0.5 bg-gray-400 dark:bg-gray-500"
            style={{ left: `${Math.min(95, Math.max(5, (medianRisk / 100) * 100))}%` }}
          >
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-gray-500 dark:text-gray-400">
              Median
            </div>
          </div>
          {/* User position marker */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full border-2 border-white dark:border-gray-800 shadow-md transition-all duration-700"
            style={{
              left: `calc(${Math.min(95, Math.max(5, (m.risk_score / 100) * 100))}% - 10px)`,
              backgroundColor: m.risk_score < medianRisk ? '#10b981' : m.risk_score < medianRisk * 1.3 ? '#f59e0b' : '#ef4444',
            }}
          />
        </div>
      </div>

      {/* Main comparison statement */}
      <div className={`rounded-lg p-3 ${
        isBetter
          ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800'
          : 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800'
      }`}>
        <div className="flex items-center gap-2">
          {isBetter ? (
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
          )}
          <p className={`text-sm font-semibold ${
            isBetter
              ? 'text-emerald-800 dark:text-emerald-200'
              : 'text-red-800 dark:text-red-200'
          }`}>
            {isBetter
              ? t.enterprise.betterThan.replace('{pct}', String(betterThanPct)).replace('{industry}', business.industry)
              : t.enterprise.worseThan.replace('{pct}', String(percentile)).replace('{industry}', business.industry)
            }
          </p>
        </div>
      </div>

      {/* Detail chips */}
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-xs text-gray-600 dark:text-gray-400">
          <Target className="h-3 w-3" />
          {t.enterprise.industryMedian.replace('{score}', String(medianRisk))}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-1 text-xs text-gray-600 dark:text-gray-400">
          {t.enterprise.topPerformers.replace('{industry}', business.industry).replace('{score}', String(topPerformerThreshold))}
        </span>
      </div>
    </div>
  );
}
