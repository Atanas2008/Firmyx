'use client';

import { useEffect, useState } from 'react';
import { TrendingDown, AlertTriangle, ArrowRight } from 'lucide-react';
import { buildValidatedMetrics } from '@/lib/aiInsights';
import { useLanguage } from '@/hooks/useLanguage';
import type { RiskAnalysis } from '@/types';

interface CostOfInactionProps {
  analysis: RiskAnalysis;
  scenarioHref: string;
}

/**
 * Real-time "money you're losing" ticker — loss aversion psychological trigger.
 * Shows daily/monthly estimated cost of not acting based on burn rate or
 * negative margin applied to revenue.
 */
export function CostOfInaction({ analysis, scenarioHref }: CostOfInactionProps) {
  const { t } = useLanguage();
  const m = buildValidatedMetrics(analysis);
  const [elapsed, setElapsed] = useState(0);

  // Calculate daily loss from either burn rate (cash bleed) or negative margin (operating loss)
  let dailyLoss = 0;
  let monthlyLoss = 0;
  let basisKey: 'burnRateBasis' | 'marginLossBasis' = 'burnRateBasis';

  if (m.burn_rate > 0) {
    monthlyLoss = m.burn_rate;
    dailyLoss = m.burn_rate / 30;
    basisKey = 'burnRateBasis';
  } else if (m.profit_margin < 0) {
    // Estimate monthly revenue loss from negative margin
    const record = analysis as RiskAnalysis & { monthly_revenue?: number };
    const estimatedRevenue = record.monthly_revenue ?? m.burn_rate > 0 ? 0 : 10000;
    monthlyLoss = Math.abs(m.profit_margin / 100) * estimatedRevenue;
    dailyLoss = monthlyLoss / 30;
    basisKey = 'marginLossBasis';
  }

  // Animate counter
  useEffect(() => {
    if (dailyLoss <= 0) return;
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [dailyLoss]);

  // Don't show if business is profitable and not burning cash
  if (dailyLoss <= 0) return null;

  const fmt = (n: number) =>
    n >= 1000
      ? `$${(n / 1000).toFixed(1)}k`
      : `$${n.toFixed(0)}`;

  const lostSoFar = dailyLoss * (elapsed / 86400); // fractional day loss for animation

  return (
    <div className="rounded-xl border-2 border-red-200 dark:border-red-800 bg-gradient-to-r from-red-50 via-orange-50 to-red-50 dark:from-red-950/30 dark:via-orange-950/20 dark:to-red-950/30 p-5 relative overflow-hidden">
      {/* Subtle animated pulse */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400 via-orange-400 to-red-400 opacity-60" />

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
              <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-800 dark:text-red-200">
                {t.enterprise.costOfInaction}
              </h3>
              <p className="text-xs text-red-600 dark:text-red-400">
                {t.enterprise.costOfInactionSub}
              </p>
            </div>
          </div>

          {/* Big numbers */}
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-black text-red-700 dark:text-red-300 tabular-nums">
                {fmt(dailyLoss)}
                <span className="text-sm font-medium opacity-70">/day</span>
              </p>
              <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-0.5">
                {t.enterprise.losingPerDay.replace('${amount}', fmt(dailyLoss))}
              </p>
            </div>
            <div>
              <p className="text-2xl font-black text-red-700 dark:text-red-300 tabular-nums">
                {fmt(monthlyLoss)}
                <span className="text-sm font-medium opacity-70">/mo</span>
              </p>
              <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-0.5">
                {t.enterprise.losingPerMonth.replace('${amount}', fmt(monthlyLoss))}
              </p>
            </div>
          </div>

          {/* Running loss counter */}
          {elapsed > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-orange-500 animate-pulse" />
              <p className="text-xs font-medium text-orange-700 dark:text-orange-300">
                ${lostSoFar.toFixed(2)} lost since you opened this page
              </p>
            </div>
          )}

          {/* Basis explanation */}
          <p className="mt-2 text-xs text-red-500/60 dark:text-red-400/50">
            {t.enterprise[basisKey].replace('${amount}', fmt(monthlyLoss))}
          </p>
        </div>

        {/* CTA */}
        <a
          href={scenarioHref}
          className="flex-shrink-0 flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 text-sm font-bold transition-colors shadow-lg shadow-red-200 dark:shadow-red-900/30"
        >
          {t.enterprise.actNow}
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>

      {/* Urgency line */}
      <p className="mt-3 text-xs font-medium text-red-700/80 dark:text-red-300/70 border-t border-red-200/50 dark:border-red-800/50 pt-2">
        {t.enterprise.everyDayCounts}
      </p>
    </div>
  );
}
