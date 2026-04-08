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
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { useLanguage } from '@/hooks/useLanguage';
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
  const { language, t } = useLanguage();
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
      label: t.metrics.profitMargin,
      value: formatPercent(analysis.profit_margin),
      icon: <TrendingUp className="h-5 w-5" />,
      description: t.metrics.profitMarginDesc,
      color:
        analysis.profit_margin >= 10
          ? 'text-emerald-600'
          : analysis.profit_margin >= 0
          ? 'text-amber-600'
          : 'text-red-600',
    },
    {
      label: t.metrics.burnRate,
      value: formatCurrency(analysis.burn_rate, 'USD', language),
      icon: <Flame className="h-5 w-5" />,
      description: t.metrics.burnRateDesc,
      color:
        analysis.burn_rate === 0
          ? 'text-emerald-600'
          : analysis.burn_rate < 50000
          ? 'text-amber-600'
          : 'text-red-600',
    },
    {
      label: t.metrics.cashRunway,
      value: analysis.burn_rate === 0
        ? 'CF+'
        : isRunwayNotApplicable
        ? t.common.notApplicable
        : `${analysis.cash_runway_months!.toFixed(1)} ${t.common.mo}`,
      icon: <Clock className="h-5 w-5" />,
      description: t.metrics.cashRunwayDesc,
      color: analysis.burn_rate === 0
        ? 'text-emerald-600'
        : isRunwayNotApplicable
        ? 'text-gray-500'
        : analysis.cash_runway_months! >= 12
        ? 'text-emerald-600'
        : analysis.cash_runway_months! >= 6
        ? 'text-amber-600'
        : 'text-red-600',
    },
    {
      label: t.metrics.debtRatio,
      value: formatPercent(analysis.debt_ratio * 100),
      icon: <DollarSign className="h-5 w-5" />,
      description: t.metrics.debtRatioDesc,
      color:
        analysis.debt_ratio < 0.4
          ? 'text-emerald-600'
          : analysis.debt_ratio < 0.7
          ? 'text-amber-600'
          : 'text-red-600',
    },
    {
      label: t.metrics.liquidityRatio,
      value: analysis.liquidity_ratio.toFixed(2),
      icon: <Scale className="h-5 w-5" />,
      description: t.metrics.liquidityRatioDesc,
      color:
        analysis.liquidity_ratio >= 2
          ? 'text-emerald-600'
          : analysis.liquidity_ratio >= 1
          ? 'text-amber-600'
          : 'text-red-600',
    },
    {
      label: t.metrics.revenueTrend,
      value: analysis.revenue_trend !== null
        ? formatPercent(analysis.revenue_trend * 100)
        : t.common.notApplicable,
      icon: revTrendIcon,
      description: t.metrics.revenueTrendDesc,
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
          className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 p-4"
        >
          <div className={`mb-2 ${m.color}`}>{m.icon}</div>
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            {m.label}
            <InfoTooltip text={m.description} />
          </p>
          <p className={`mt-0.5 text-xl font-bold ${m.color}`}>{m.value}</p>
        </div>
      ))}
    </div>
  );
}
