'use client';

import { buildValidatedMetrics } from '@/lib/aiInsights';
import { useLanguage } from '@/hooks/useLanguage';
import type { RiskAnalysis } from '@/types';

interface RiskBreakdownProps {
  analysis: RiskAnalysis;
}

interface RiskComponent {
  label: string;
  score: number;
  max: number;
  color: string;
}

function computeRiskComponents(m: ReturnType<typeof buildValidatedMetrics>): RiskComponent[] {
  // v5.0 step-function scoring: weight × step_score
  // Leverage 30%, Liquidity 25%, Profitability 20%, Stability 15%, Growth 10%
  const leverage = m.debt_ratio > 0.6 ? 27 : m.debt_ratio >= 0.3 ? 15 : 6;
  const liquidity = m.liquidity_ratio < 1 ? 21 : m.liquidity_ratio <= 1.5 ? 13 : 5;
  const profitability = m.profit_margin < 0 ? 16 : m.profit_margin <= 10 ? 10 : 4;
  const stability = m.altman_z < 1.8 ? 13 : m.altman_z < 3 ? 9 : 5;

  return [
    { label: 'Leverage', score: leverage, max: 27, color: leverage > 20 ? 'bg-red-500' : leverage > 10 ? 'bg-amber-500' : 'bg-emerald-500' },
    { label: 'Liquidity', score: liquidity, max: 21, color: liquidity > 15 ? 'bg-red-500' : liquidity > 8 ? 'bg-amber-500' : 'bg-emerald-500' },
    { label: 'Profitability', score: profitability, max: 16, color: profitability > 12 ? 'bg-red-500' : profitability > 6 ? 'bg-amber-500' : 'bg-emerald-500' },
    { label: 'Stability', score: stability, max: 13, color: stability > 10 ? 'bg-red-500' : stability > 6 ? 'bg-amber-500' : 'bg-emerald-500' },
  ];
}

export function RiskBreakdown({ analysis }: RiskBreakdownProps) {
  const { t } = useLanguage();
  const m = buildValidatedMetrics(analysis);
  const components = computeRiskComponents(m);
  const totalContribution = components.reduce((s, c) => s + c.score, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {t.decision.riskComposition}
        </h4>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {t.decision.estimatedContribution}: {totalContribution} pts
        </span>
      </div>

      <div className="space-y-3">
        {components.map((comp) => {
          const pct = Math.round((comp.score / comp.max) * 100);
          return (
            <div key={comp.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">{comp.label}</span>
                <span className="font-medium text-gray-700 dark:text-gray-200">{comp.score}/{comp.max}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className={`h-2 rounded-full ${comp.color} transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
