'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Lightbulb, ArrowRight, TrendingDown } from 'lucide-react';
import { buildValidatedMetrics } from '@/lib/aiInsights';
import { analysisApi } from '@/lib/api';
import { useLanguage } from '@/hooks/useLanguage';
import type { RiskAnalysis, ScenarioAdjustments, ScenarioResult } from '@/types';

interface SmartScenarioSuggestionProps {
  analysis: RiskAnalysis;
  businessId: string;
  scenarioHref: string;
}

/**
 * Determines the single highest-impact scenario adjustment based on current
 * metrics, auto-runs it, and shows the projected result inline. Makes the
 * "what would help most?" question unnecessary.
 */
function computeBestAdjustment(m: ReturnType<typeof buildValidatedMetrics>): {
  label: string;
  description: string;
  adjustments: ScenarioAdjustments;
} {
  const base: ScenarioAdjustments = {
    revenue_change_pct: 0,
    revenue_change_abs: 0,
    expense_change_pct: 0,
    expense_change_abs: 0,
    debt_change_abs: 0,
    cash_change_abs: 0,
    cost_reduction_pct: 0,
  };

  // Priority: fix the most severe metric gap first
  if (m.debt_ratio >= 0.6) {
    return {
      label: 'Reduce debt by 30%',
      description: `Debt ratio at ${(m.debt_ratio * 100).toFixed(0)}% — reducing debt exposure is the highest-impact lever`,
      adjustments: { ...base, debt_change_abs: -Math.round(m.debt_ratio * 100000 * 0.3) },
    };
  }

  if (m.liquidity_ratio < 1.0) {
    return {
      label: 'Cash injection + cost cut',
      description: `Liquidity at ${m.liquidity_ratio.toFixed(2)} — injecting cash and cutting costs restores working capital`,
      adjustments: { ...base, cash_change_abs: 50000, cost_reduction_pct: 10 },
    };
  }

  if (m.profit_margin < 0) {
    return {
      label: 'Cut costs by 15%',
      description: `Operating at a loss (${m.profit_margin.toFixed(1)}% margin) — cost reduction is the fastest path to positive`,
      adjustments: { ...base, cost_reduction_pct: 15 },
    };
  }

  if (m.profit_margin < 5) {
    return {
      label: 'Boost revenue by 10%',
      description: `Thin margins at ${m.profit_margin.toFixed(1)}% — revenue growth improves both profitability and Z-score`,
      adjustments: { ...base, revenue_change_pct: 10 },
    };
  }

  if (m.revenue_trend_label === 'Declining') {
    return {
      label: 'Reverse revenue decline (+15%)',
      description: 'Revenue is declining — stabilising and growing reverses compounding risk',
      adjustments: { ...base, revenue_change_pct: 15 },
    };
  }

  // Default: balanced improvement
  return {
    label: 'Revenue +10%, costs −5%',
    description: 'Overall optimisation — modest revenue growth with cost discipline',
    adjustments: { ...base, revenue_change_pct: 10, cost_reduction_pct: 5 },
  };
}

export function SmartScenarioSuggestion({ analysis, businessId, scenarioHref }: SmartScenarioSuggestionProps) {
  const { t } = useLanguage();
  const m = buildValidatedMetrics(analysis);
  const suggestion = computeBestAdjustment(m);

  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState(false);

  async function runSuggestion() {
    setLoading(true);
    try {
      const res = await analysisApi.scenario(businessId, suggestion.adjustments);
      setResult(res.data);
      setRan(true);
    } catch {
      // Silent fail — user can still navigate to full scenario page
    } finally {
      setLoading(false);
    }
  }

  const projectedScore = result?.comparison?.risk_score?.adjusted;
  const delta = result?.comparison?.risk_score?.delta;

  return (
    <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/50">
          <Lightbulb className="h-4.5 w-4.5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
            {t.enterprise.suggestedAction}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            {t.enterprise.suggestedActionSub}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-50 mb-1">
            {suggestion.label}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {suggestion.description}
          </p>
        </div>

        {/* Results or Run button */}
        {ran && result && projectedScore !== null && projectedScore !== undefined && delta !== null && delta !== undefined ? (
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">{t.enterprise.currentScore}</p>
              <p className="text-lg font-bold text-gray-500 dark:text-gray-400">
                {Math.round(m.risk_score)}
              </p>
            </div>
            <TrendingDown className="h-5 w-5 text-emerald-500 flex-shrink-0" />
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">{t.enterprise.projectedScore}</p>
              <p className={`text-lg font-bold ${
                typeof projectedScore === 'number' && projectedScore <= 30
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : typeof projectedScore === 'number' && projectedScore <= 50
                  ? 'text-amber-600 dark:text-amber-400'
                  : typeof projectedScore === 'number' && projectedScore <= 70
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {typeof projectedScore === 'number' ? Math.round(projectedScore) : projectedScore}
              </p>
            </div>
            <Link
              href={scenarioHref}
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700 transition-colors shadow-sm whitespace-nowrap"
            >
              {t.enterprise.tryThisScenario}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <button
            type="button"
            onClick={runSuggestion}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold text-white hover:bg-purple-700 transition-colors shadow-sm whitespace-nowrap disabled:opacity-50 flex-shrink-0"
          >
            {loading ? 'Simulating…' : t.enterprise.tryThisScenario}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
