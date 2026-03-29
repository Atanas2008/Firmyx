import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { useLanguage } from '@/hooks/useLanguage';
import { formatCurrency, formatPercent } from '@/lib/utils';
import type { RiskAnalysis } from '@/types';

interface MetricsTableProps {
  analysis: RiskAnalysis;
}

interface MetricRow {
  label: string;
  value: string;
  status: 'good' | 'warn' | 'bad' | 'neutral';
  description: string;
}

function statusColor(status: 'good' | 'warn' | 'bad' | 'neutral'): string {
  switch (status) {
    case 'good': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30';
    case 'warn': return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30';
    case 'bad': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30';
    case 'neutral': return 'text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700';
  }
}

/** Returns ↑, ↓, or → based on direction of a ratio-scale trend value. */
function trendArrow(value: number): string {
  if (value > 0.005) return '↑ ';
  if (value < -0.005) return '↓ ';
  return '→ ';
}

export function MetricsTable({ analysis }: MetricsTableProps) {
  const { t } = useLanguage();
  const isRunwayNotApplicable =
    analysis.cash_runway_months === null;

  const rows: MetricRow[] = [
    {
      label: t.metrics.profitMargin,
      value: formatPercent(analysis.profit_margin),
      status: analysis.profit_margin >= 10 ? 'good' : analysis.profit_margin >= 0 ? 'warn' : 'bad',
      description: t.metrics.profitMarginDesc,
    },
    {
      label: t.metrics.burnRate,
      value: formatCurrency(analysis.burn_rate),
      status: analysis.burn_rate === 0 ? 'good' : analysis.burn_rate < 50000 ? 'warn' : 'bad',
      description: t.metrics.burnRateDesc,
    },
    {
      label: t.metrics.cashRunway,
      value: analysis.burn_rate === 0
        ? t.metrics.notAtRisk
        : isRunwayNotApplicable
        ? t.common.notApplicable
        : `${analysis.cash_runway_months!.toFixed(1)} ${t.common.months}`,
      status: analysis.burn_rate === 0
        ? 'good'
        : isRunwayNotApplicable
        ? 'neutral'
        : analysis.cash_runway_months! >= 12
        ? 'good'
        : analysis.cash_runway_months! >= 6
        ? 'warn'
        : 'bad',
      description: t.metrics.cashRunwayDesc,
    },
    {
      label: t.metrics.debtRatio,
      value: formatPercent(analysis.debt_ratio * 100),
      status: analysis.debt_ratio < 0.4 ? 'good' : analysis.debt_ratio < 0.7 ? 'warn' : 'bad',
      description: t.metrics.debtRatioDesc,
    },
    {
      label: t.metrics.liquidityRatio,
      value: analysis.liquidity_ratio.toFixed(2),
      status: analysis.liquidity_ratio >= 2 ? 'good' : analysis.liquidity_ratio >= 1 ? 'warn' : 'bad',
      description: t.metrics.liquidityRatioDesc,
    },
    {
      label: t.metrics.revenueTrend,
      value: analysis.revenue_trend === null
        ? t.common.notApplicable
        : analysis.revenue_trend === 0
        ? t.metrics.stable
        : `${trendArrow(analysis.revenue_trend)}${formatPercent(analysis.revenue_trend * 100)}`,
      status: analysis.revenue_trend === null
        ? 'neutral'
        : analysis.revenue_trend * 100 >= 5
        ? 'good'
        : analysis.revenue_trend >= 0
        ? 'warn'
        : 'bad',
      description: t.metrics.revenueTrendDesc,
    },
    {
      label: t.metrics.expenseTrend,
      value: analysis.expense_trend !== null
        ? `${trendArrow(analysis.expense_trend)}${formatPercent(analysis.expense_trend * 100)}`
        : t.common.notApplicable,
      status: analysis.expense_trend === null
        ? 'neutral'
        : analysis.expense_trend * 100 <= 5
        ? 'good'
        : analysis.expense_trend * 100 <= 15
        ? 'warn'
        : 'bad',
      description: t.metrics.expenseTrendDesc,
    },
    {
      label: t.metrics.altmanZScore,
      value: analysis.altman_z_score.toFixed(2),
      status: analysis.altman_z_score >= 2.99 ? 'good' : analysis.altman_z_score >= 1.81 ? 'warn' : 'bad',
      description: t.metrics.altmanZScoreDesc,
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t.metrics.metric}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {t.metrics.value}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {rows.map((row) => (
            <tr key={row.label} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-50">
                <span className="flex items-center gap-1">
                  {row.label}
                  <InfoTooltip text={row.description} />
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusColor(row.status)}`}>
                  {row.value}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
