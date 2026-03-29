'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { useLanguage } from '@/hooks/useLanguage';
import type { RiskAnalysis } from '@/types';
import type { IndustryBenchmark } from '@/lib/benchmarks';

interface IndustryBenchmarkTableProps {
  analysis: RiskAnalysis;
  benchmark: IndustryBenchmark;
  industryName: string;
}

interface MetricRow {
  label: string;
  description: string;
  companyRaw: number;
  benchmarkRaw: number;
  p25Raw: number;
  p75Raw: number;
  /** Format function: turns raw value into display string */
  format: (v: number) => string;
  /** Returns true when the company value is BETTER than benchmark */
  isBetter: (company: number, avg: number) => boolean;
  /** For "lower is better" metrics (e.g. debt_ratio), set true */
  lowerIsBetter: boolean;
}

// CHANGED: Added quartile classification
type QuartileLabel = 'topQuartile' | 'average' | 'belowAverage';

function getQuartile(value: number, p25: number, p75: number, lowerIsBetter: boolean): QuartileLabel {
  if (lowerIsBetter) {
    if (value <= p75) return 'topQuartile';
    if (value <= p25) return 'average';
    return 'belowAverage';
  }
  if (value >= p75) return 'topQuartile';
  if (value >= p25) return 'average';
  return 'belowAverage';
}

const QUARTILE_STYLES: Record<QuartileLabel, string> = {
  topQuartile: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  average: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  belowAverage: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
};

/**
 * Side-by-side comparison table: Company metric vs Industry Average,
 * with 25th/75th percentile columns and quartile badges.
 */
export function IndustryBenchmarkTable({
  analysis,
  benchmark,
  industryName,
}: IndustryBenchmarkTableProps) {
  const { t } = useLanguage();
  const rows: MetricRow[] = [
    {
      label: 'Profit Margin',
      description: `Percentage of revenue remaining after all expenses`,
      companyRaw: analysis.profit_margin,
      benchmarkRaw: benchmark.profit_margin,
      p25Raw: benchmark.percentile_25.profit_margin,
      p75Raw: benchmark.percentile_75.profit_margin,
      format: (v) => `${v.toFixed(1)}%`,
      isBetter: (c, a) => c >= a,
      lowerIsBetter: false,
    },
    {
      label: 'Liquidity Ratio',
      description: 'Ability to cover short-term obligations with current assets',
      companyRaw: analysis.liquidity_ratio,
      benchmarkRaw: benchmark.liquidity_ratio,
      p25Raw: benchmark.percentile_25.liquidity_ratio,
      p75Raw: benchmark.percentile_75.liquidity_ratio,
      format: (v) => v.toFixed(2),
      isBetter: (c, a) => c >= a,
      lowerIsBetter: false,
    },
    {
      label: 'Debt Ratio',
      description: `Total debt relative to estimated assets — ${t.benchmark.lowerIsBetter}`,
      companyRaw: analysis.debt_ratio * 100,       // display as %
      benchmarkRaw: benchmark.debt_ratio * 100,
      p25Raw: benchmark.percentile_25.debt_ratio * 100,
      p75Raw: benchmark.percentile_75.debt_ratio * 100,
      format: (v) => `${v.toFixed(1)}%`,
      isBetter: (c, a) => c <= a,                  // lower debt = better
      lowerIsBetter: true,
    },
    {
      label: 'Altman Z-Score',
      description: 'Bankruptcy prediction model: >2.99 safe, 1.81–2.99 grey zone, <1.81 distress',
      companyRaw: analysis.altman_z_score,
      benchmarkRaw: benchmark.altman_z_score,
      p25Raw: benchmark.percentile_25.altman_z_score,
      p75Raw: benchmark.percentile_75.altman_z_score,
      format: (v) => v.toFixed(2),
      isBetter: (c, a) => c >= a,
      lowerIsBetter: false,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t.benchmark.comparingAgainst} <span className="font-medium text-gray-700 dark:text-gray-200">{benchmark.label}</span> {t.benchmark.industryAverages}
        </p>
        <span className="rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
          {industryName}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <th className="px-4 py-3 text-left font-medium">{t.metrics.metric}</th>
              <th className="px-4 py-3 text-right font-medium">{t.benchmark.company}</th>
              <th className="px-4 py-3 text-right font-medium">P25</th>
              <th className="px-4 py-3 text-right font-medium">{t.benchmark.avg}</th>
              <th className="px-4 py-3 text-right font-medium">P75</th>
              <th className="px-4 py-3 text-right font-medium">{t.benchmark.status}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((row) => {
              const better = row.isBetter(row.companyRaw, row.benchmarkRaw);
              const quartile = getQuartile(row.companyRaw, row.p25Raw, row.p75Raw, row.lowerIsBetter);
              const isWeak = quartile === 'belowAverage';
              return (
                <tr key={row.label} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">
                    <span className="flex items-center gap-1.5">
                      {isWeak && <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />}
                      {row.label}
                      <InfoTooltip text={row.description} />
                    </span>
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-semibold ${
                      better ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {row.format(row.companyRaw)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400 dark:text-gray-500">
                    {row.format(row.p25Raw)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">
                    {row.format(row.benchmarkRaw)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400 dark:text-gray-500">
                    {row.format(row.p75Raw)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${QUARTILE_STYLES[quartile]}`}
                    >
                      {quartile === 'topQuartile' ? t.benchmark.topQuartile : quartile === 'average' ? t.benchmark.average : t.benchmark.belowAverage}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500">
        {t.benchmark.footnote}
      </p>
    </div>
  );
}
