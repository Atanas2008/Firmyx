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
    case 'good': return 'text-emerald-600 bg-emerald-50';
    case 'warn': return 'text-amber-600 bg-amber-50';
    case 'bad': return 'text-red-600 bg-red-50';
    case 'neutral': return 'text-gray-600 bg-gray-100';
  }
}

export function MetricsTable({ analysis }: MetricsTableProps) {
  const isRunwayNotApplicable =
    analysis.cash_runway_months === null ||
    analysis.burn_rate <= 0 ||
    analysis.cash_runway_months >= 999;

  const rows: MetricRow[] = [
    {
      label: 'Profit Margin',
      value: formatPercent(analysis.profit_margin),
      status: analysis.profit_margin >= 10 ? 'good' : analysis.profit_margin >= 0 ? 'warn' : 'bad',
      description: 'Percentage of revenue left after expenses',
    },
    {
      label: 'Burn Rate',
      value: formatCurrency(analysis.burn_rate),
      status: analysis.burn_rate < 10000 ? 'good' : analysis.burn_rate < 50000 ? 'warn' : 'bad',
      description: 'Monthly cash being consumed',
    },
    {
      label: 'Cash Runway',
      value: isRunwayNotApplicable
        ? 'N/A'
        : `${analysis.cash_runway_months!.toFixed(1)} months`,
      status: isRunwayNotApplicable
        ? 'neutral'
        : analysis.cash_runway_months! >= 12
        ? 'good'
        : analysis.cash_runway_months! >= 6
        ? 'warn'
        : 'bad',
      description: 'How long current cash lasts at burn rate',
    },
    {
      label: 'Debt Ratio',
      value: formatPercent(analysis.debt_ratio * 100),
      status: analysis.debt_ratio < 0.4 ? 'good' : analysis.debt_ratio < 0.7 ? 'warn' : 'bad',
      description: 'Total debt relative to total assets',
    },
    {
      label: 'Liquidity Ratio',
      value: analysis.liquidity_ratio.toFixed(2),
      status: analysis.liquidity_ratio >= 2 ? 'good' : analysis.liquidity_ratio >= 1 ? 'warn' : 'bad',
      description: 'Ability to cover short-term obligations',
    },
    {
      label: 'Revenue Trend',
      value: formatPercent(analysis.revenue_trend),
      status: analysis.revenue_trend >= 5 ? 'good' : analysis.revenue_trend >= 0 ? 'warn' : 'bad',
      description: 'Month-over-month revenue growth',
    },
    {
      label: 'Expense Trend',
      value: formatPercent(analysis.expense_trend),
      status: analysis.expense_trend <= 5 ? 'good' : analysis.expense_trend <= 15 ? 'warn' : 'bad',
      description: 'Month-over-month expense growth',
    },
    {
      label: 'Altman Z-Score',
      value: analysis.altman_z_score.toFixed(2),
      status: analysis.altman_z_score >= 2.99 ? 'good' : analysis.altman_z_score >= 1.81 ? 'warn' : 'bad',
      description: 'Bankruptcy prediction score (>2.99 safe)',
    },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
              Metric
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
              Value
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden sm:table-cell">
              Description
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => (
            <tr key={row.label} className="bg-white hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900">{row.label}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusColor(row.status)}`}>
                  {row.value}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
