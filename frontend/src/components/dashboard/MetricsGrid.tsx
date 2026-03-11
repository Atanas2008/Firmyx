import {
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  Clock,
  DollarSign,
  Scale,
} from 'lucide-react';
import { formatPercent, formatCurrency } from '@/lib/utils';
import type { RiskAnalysis } from '@/types';

interface MetricsGridProps {
  analysis: RiskAnalysis;
}

interface MetricItem {
  label: string;
  value: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

export function MetricsGrid({ analysis }: MetricsGridProps) {
  const isRunwayNotApplicable =
    analysis.cash_runway_months === null ||
    analysis.cash_runway_months >= 999;

  const revTrendIcon =
    analysis.revenue_trend === null
      ? <Minus className="h-5 w-5" />
      : analysis.revenue_trend > 0.005
      ? <TrendingUp className="h-5 w-5" />
      : analysis.revenue_trend < -0.005
      ? <TrendingDown className="h-5 w-5" />
      : <Minus className="h-5 w-5" />;

  const metrics: MetricItem[] = [
    {
      label: 'Profit Margin',
      value: formatPercent(analysis.profit_margin),
      icon: <TrendingUp className="h-5 w-5" />,
      description: 'Net income as % of revenue',
      color:
        analysis.profit_margin >= 10
          ? 'text-emerald-600'
          : analysis.profit_margin >= 0
          ? 'text-amber-600'
          : 'text-red-600',
    },
    {
      label: 'Burn Rate',
      value: formatCurrency(analysis.burn_rate),
      icon: <Flame className="h-5 w-5" />,
      description: 'Monthly cash deficit above revenue',
      color:
        analysis.burn_rate < 10000
          ? 'text-emerald-600'
          : analysis.burn_rate < 50000
          ? 'text-amber-600'
          : 'text-red-600',
    },
    {
      label: 'Cash Runway',
      value: isRunwayNotApplicable
        ? 'N/A'
        : `${analysis.cash_runway_months!.toFixed(1)} mo`,
      icon: <Clock className="h-5 w-5" />,
      description: 'Months reserves last at current expenses',
      color: isRunwayNotApplicable
        ? 'text-gray-500'
        : analysis.cash_runway_months! >= 12
        ? 'text-emerald-600'
        : analysis.cash_runway_months! >= 6
        ? 'text-amber-600'
        : 'text-red-600',
    },
    {
      label: 'Debt Ratio',
      value: formatPercent(analysis.debt_ratio * 100),
      icon: <DollarSign className="h-5 w-5" />,
      description: 'Total debt relative to estimated assets',
      color:
        analysis.debt_ratio < 0.4
          ? 'text-emerald-600'
          : analysis.debt_ratio < 0.7
          ? 'text-amber-600'
          : 'text-red-600',
    },
    {
      label: 'Liquidity Ratio',
      value: analysis.liquidity_ratio.toFixed(2),
      icon: <Scale className="h-5 w-5" />,
      description: 'Ability to cover short-term debts',
      color:
        analysis.liquidity_ratio >= 2
          ? 'text-emerald-600'
          : analysis.liquidity_ratio >= 1
          ? 'text-amber-600'
          : 'text-red-600',
    },
    {
      label: 'Revenue Trend',
      value: analysis.revenue_trend !== null
        ? formatPercent(analysis.revenue_trend * 100)
        : 'N/A',
      icon: revTrendIcon,
      description: 'Month-over-month revenue change',
      color:
        analysis.revenue_trend === null
          ? 'text-gray-500'
          : analysis.revenue_trend >= 0
          ? 'text-emerald-600'
          : 'text-red-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {metrics.map((m) => (
        <div
          key={m.label}
          className="rounded-xl border border-gray-100 bg-gray-50 p-4"
        >
          <div className={`mb-2 ${m.color}`}>{m.icon}</div>
          <p className="text-xs text-gray-500">{m.label}</p>
          <p className={`mt-0.5 text-xl font-bold ${m.color}`}>{m.value}</p>
          <p className="mt-1 text-xs text-gray-400">{m.description}</p>
        </div>
      ))}
    </div>
  );
}
