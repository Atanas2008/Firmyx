'use client';

import { buildValidatedMetrics } from '@/lib/aiInsights';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { useLanguage } from '@/hooks/useLanguage';
import type { RiskAnalysis } from '@/types';

interface ScoreDecompositionProps {
  analysis: RiskAnalysis;
}

interface Dimension {
  key: string;
  labelKey: 'liquidityRisk' | 'leverageRisk' | 'profitabilityRisk' | 'stabilityRisk' | 'revenueTrendRisk';
  maxPoints: number;
  compute: (m: ReturnType<typeof buildValidatedMetrics>) => number;
  tooltip: string;
}

/**
 * Weight-based score decomposition matching the backend v5.0 step-function scoring.
 * Shows a transparent, mathematical breakdown: "Your 65 = 24 + 17 + 12 + 8 + 4"
 *
 * v5.0 weights: Leverage 30%, Liquidity 25%, Profitability 20%, Stability 15%, Growth 10%
 * maxPoints = weight × max_step_score (e.g. leverage: 0.30 × 90 = 27)
 */
const DIMENSIONS: Dimension[] = [
  {
    key: 'leverage',
    labelKey: 'leverageRisk',
    maxPoints: 27,
    tooltip: 'Weight 30%. Step scores: debt < 30% → 20, 30-60% → 50, > 60% → 90.',
    compute(m) {
      if (m.debt_ratio < 0.3) return Math.round(0.30 * 20);
      if (m.debt_ratio <= 0.6) return Math.round(0.30 * 50);
      return Math.round(0.30 * 90);
    },
  },
  {
    key: 'liquidity',
    labelKey: 'liquidityRisk',
    maxPoints: 21,
    tooltip: 'Weight 25%. Step scores: ratio > 1.5 → 20, 1.0-1.5 → 50, < 1.0 → 85.',
    compute(m) {
      if (m.liquidity_ratio > 1.5) return Math.round(0.25 * 20);
      if (m.liquidity_ratio >= 1.0) return Math.round(0.25 * 50);
      return Math.round(0.25 * 85);
    },
  },
  {
    key: 'profitability',
    labelKey: 'profitabilityRisk',
    maxPoints: 16,
    tooltip: 'Weight 20%. Step scores: margin > 10% → 20, 0-10% → 50, < 0% → 80.',
    compute(m) {
      if (m.profit_margin > 10) return Math.round(0.20 * 20);
      if (m.profit_margin >= 0) return Math.round(0.20 * 50);
      return Math.round(0.20 * 80);
    },
  },
  {
    key: 'stability',
    labelKey: 'stabilityRisk',
    maxPoints: 13,
    tooltip: 'Weight 15%. Based on revenue coefficient of variation. Low CV → 30, moderate → 60, high → 85.',
    compute(m) {
      // Frontend approximation: use Z-Score as proxy for stability
      if (m.altman_z >= 3.0) return Math.round(0.15 * 30);
      if (m.altman_z >= 1.8) return Math.round(0.15 * 60);
      return Math.round(0.15 * 85);
    },
  },
  {
    key: 'revenue_trend',
    labelKey: 'revenueTrendRisk',
    maxPoints: 8,
    tooltip: 'Weight 10%. Step scores: growth > 5% → 20, 0-5% → 50, < 0% → 80.',
    compute(m) {
      if (m.revenue_trend_label === 'Increasing') return Math.round(0.10 * 20);
      if (m.revenue_trend_label === 'Flat') return Math.round(0.10 * 50);
      if (m.revenue_trend_label === 'Declining') return Math.round(0.10 * 80);
      return Math.round(0.10 * 50); // Insufficient data → middle
    },
  },
];

function barColor(ratio: number): string {
  if (ratio <= 0.25) return 'bg-emerald-500';
  if (ratio <= 0.5) return 'bg-amber-500';
  return 'bg-red-500';
}

// Map backend risk_score_breakdown keys → frontend dimension keys
const BACKEND_KEY_MAP: Record<string, string> = {
  liquidity: 'liquidity_risk',
  leverage: 'leverage_risk',
  profitability: 'profitability_risk',
  stability: 'stability_risk',
  revenue_trend: 'trend_risk',
};

export function ScoreDecomposition({ analysis }: ScoreDecompositionProps) {
  const { t } = useLanguage();
  const m = buildValidatedMetrics(analysis);
  const modelName = analysis.industry_model_applied ?? 'General Industry';
  const backendBreakdown = analysis.risk_score_breakdown as Record<string, number> | null | undefined;

  const computed = DIMENSIONS.map((dim) => {
    // Prefer authoritative backend breakdown when available
    const bKey = BACKEND_KEY_MAP[dim.key];
    const backendPoints = bKey && backendBreakdown ? backendBreakdown[bKey] : undefined;
    const points = typeof backendPoints === 'number' ? Math.round(backendPoints) : dim.compute(m);
    return { ...dim, points, ratio: points / dim.maxPoints };
  });

  const approximateTotal = computed.reduce((sum, d) => sum + d.points, 0);
  const isBackendSourced = !!backendBreakdown;

  return (
    <div className="space-y-4">
      {/* Header with total */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
            {t.enterprise.scoreBreakdown}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t.enterprise.scoreBreakdownSub}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
            {Math.round(m.risk_score)}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            {isBackendSourced ? '' : '≈ '}{approximateTotal} pts decomposed
          </p>
        </div>
      </div>

      {/* Bars */}
      <div className="space-y-3">
        {computed.map((dim) => (
          <div key={dim.key}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {t.enterprise[dim.labelKey]}
                </span>
                <InfoTooltip text={dim.tooltip} />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={`font-bold ${
                  dim.ratio <= 0.25 ? 'text-emerald-600 dark:text-emerald-400'
                    : dim.ratio <= 0.5 ? 'text-amber-600 dark:text-amber-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {t.enterprise.contribution.replace('{points}', String(dim.points))}
                </span>
                <span className="text-gray-400 dark:text-gray-500">
                  {t.enterprise.ofTotal.replace('{total}', String(dim.maxPoints))}
                </span>
              </div>
            </div>
            <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${barColor(dim.ratio)}`}
                style={{ width: `${Math.max(dim.ratio * 100, dim.points > 0 ? 4 : 0)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Formula note */}
      <p className="text-[10px] text-gray-400 dark:text-gray-500 italic">
        {t.enterprise.formulaNote.replace('{model}', modelName)}
      </p>
    </div>
  );
}
