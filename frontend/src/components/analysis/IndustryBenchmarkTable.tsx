'use client';

import React from 'react';
import type { RiskAnalysis } from '@/types';
import type { IndustryBenchmark } from '@/lib/benchmarks';

interface IndustryBenchmarkTableProps {
  analysis: RiskAnalysis;
  benchmark: IndustryBenchmark;
  industryName: string;
}

interface MetricRow {
  label: string;
  companyRaw: number;
  benchmarkRaw: number;
  /** Format function: turns raw value into display string */
  format: (v: number) => string;
  /** Returns true when the company value is BETTER than benchmark */
  isBetter: (company: number, avg: number) => boolean;
}

/**
 * Side-by-side comparison table: Company metric  vs  Industry Average.
 *
 * Each row is colour-coded:
 *   Green  — company metric is better than the industry average
 *   Red    — company metric is worse
 *   Gray   — neutral / no data
 */
export function IndustryBenchmarkTable({
  analysis,
  benchmark,
  industryName,
}: IndustryBenchmarkTableProps) {
  const rows: MetricRow[] = [
    {
      label: 'Profit Margin',
      companyRaw: analysis.profit_margin,
      benchmarkRaw: benchmark.profit_margin,
      format: (v) => `${v.toFixed(1)}%`,
      isBetter: (c, a) => c >= a,
    },
    {
      label: 'Liquidity Ratio',
      companyRaw: analysis.liquidity_ratio,
      benchmarkRaw: benchmark.liquidity_ratio,
      format: (v) => v.toFixed(2),
      isBetter: (c, a) => c >= a,
    },
    {
      label: 'Debt Ratio',
      companyRaw: analysis.debt_ratio * 100,       // display as %
      benchmarkRaw: benchmark.debt_ratio * 100,
      format: (v) => `${v.toFixed(1)}%`,
      isBetter: (c, a) => c <= a,                  // lower debt = better
    },
    {
      label: 'Altman Z-Score',
      companyRaw: analysis.altman_z_score,
      benchmarkRaw: benchmark.altman_z_score,
      format: (v) => v.toFixed(2),
      isBetter: (c, a) => c >= a,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Comparing against <span className="font-medium text-gray-700">{benchmark.label}</span> industry averages.
        </p>
        <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-medium text-blue-700">
          {industryName}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3 text-left font-medium">Metric</th>
              <th className="px-4 py-3 text-right font-medium">Company</th>
              <th className="px-4 py-3 text-right font-medium">Industry Avg</th>
              <th className="px-4 py-3 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => {
              const better = row.isBetter(row.companyRaw, row.benchmarkRaw);
              const diff = row.companyRaw - row.benchmarkRaw;
              const diffStr = diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
              return (
                <tr key={row.label} className="bg-white hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{row.label}</td>
                  <td
                    className={`px-4 py-3 text-right font-semibold ${
                      better ? 'text-emerald-700' : 'text-red-600'
                    }`}
                  >
                    {row.format(row.companyRaw)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {row.format(row.benchmarkRaw)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        better
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {better ? '▲' : '▼'} {diffStr}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400">
        * Industry averages are approximate figures based on sector-level financial research.
      </p>
    </div>
  );
}
