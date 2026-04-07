'use client';

import { buildValidatedMetrics } from '@/lib/aiInsights';
import { useLanguage } from '@/hooks/useLanguage';
import { formatPercent, formatCurrency } from '@/lib/utils';
import type { RiskAnalysis } from '@/types';

interface KeyMetricsGroupedProps {
  analysis: RiskAnalysis;
}

type Status = 'good' | 'warn' | 'bad' | 'neutral';

interface Metric {
  label: string;
  value: string;
  status: Status;
}

const STATUS_DOT: Record<Status, string> = {
  good: 'bg-emerald-500',
  warn: 'bg-amber-500',
  bad: 'bg-red-500',
  neutral: 'bg-gray-400',
};

const STATUS_VALUE: Record<Status, string> = {
  good: 'text-emerald-700 dark:text-emerald-400',
  warn: 'text-amber-700 dark:text-amber-400',
  bad: 'text-red-700 dark:text-red-400',
  neutral: 'text-gray-600 dark:text-gray-400',
};

export function KeyMetricsGrouped({ analysis }: KeyMetricsGroupedProps) {
  const { t } = useLanguage();
  const m = buildValidatedMetrics(analysis);

  const groups: { title: string; metrics: Metric[] }[] = [
    {
      title: t.decision.profitability,
      metrics: [
        {
          label: t.metrics.profitMargin,
          value: formatPercent(m.profit_margin),
          status: m.profit_margin >= 10 ? 'good' : m.profit_margin >= 0 ? 'warn' : 'bad',
        },
        {
          label: t.metrics.revenueTrend,
          value: m.revenue_trend_label === 'Insufficient data'
            ? t.common.notApplicable
            : `${m.revenue_trend_label} (${(m.revenue_trend_value * 100).toFixed(1)}%)`,
          status: m.revenue_trend_label === 'Increasing' ? 'good'
            : m.revenue_trend_label === 'Flat' ? 'warn'
            : m.revenue_trend_label === 'Declining' ? 'bad'
            : 'neutral',
        },
      ],
    },
    {
      title: t.decision.liquidity,
      metrics: [
        {
          label: t.metrics.liquidityRatio,
          value: m.liquidity_ratio.toFixed(2),
          status: m.liquidity_ratio >= 2 ? 'good' : m.liquidity_ratio >= 1 ? 'warn' : 'bad',
        },
        {
          label: t.metrics.cashRunway,
          value: m.runway_label,
          status: m.burn_rate === 0
            ? (m.is_working_capital_constrained ? 'warn' : 'good')
            : m.runway_label.includes('critical') ? 'bad'
            : m.runway_label.includes('tight') ? 'warn'
            : 'good',
        },
      ],
    },
    {
      title: t.decision.riskLeverage,
      metrics: [
        {
          label: t.metrics.debtRatio,
          value: formatPercent(m.debt_ratio * 100),
          status: m.debt_ratio < 0.4 ? 'good' : m.debt_ratio < 0.7 ? 'warn' : 'bad',
        },
        {
          label: t.metrics.altmanZScore,
          value: m.altman_z.toFixed(2),
          status: m.altman_z >= 3 ? 'good' : m.altman_z >= 1.8 ? 'warn' : 'bad',
        },
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 md:grid-cols-3">
      {groups.map((group) => (
        <div key={group.title} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 sm:p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
            {group.title}
          </h4>
          <div className="space-y-3">
            {group.metrics.map((metric) => (
              <div key={metric.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${STATUS_DOT[metric.status]}`} />
                  <span className="text-sm text-gray-600 dark:text-gray-300">{metric.label}</span>
                </div>
                <span className={`text-sm font-semibold ${STATUS_VALUE[metric.status]}`}>
                  {metric.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
