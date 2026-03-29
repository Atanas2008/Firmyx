'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, AlertTriangle, DollarSign, Flame } from 'lucide-react';
import { analysisApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import type { ForecastResult, ForecastScenario } from '@/types';

interface ForecastChartProps {
  businessId: string;
}

const SCENARIOS: { key: ForecastScenario; label: string; color: string }[] = [
  { key: 'baseline', label: 'Baseline', color: 'blue' },
  { key: 'optimistic', label: 'Optimistic', color: 'emerald' },
  { key: 'pessimistic', label: 'Pessimistic', color: 'red' },
];

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export function ForecastChart({ businessId }: ForecastChartProps) {
  const { resolvedTheme } = useTheme();
  const { t } = useLanguage();
  const dark = resolvedTheme === 'dark';
  const [forecasts, setForecasts] = useState<Record<ForecastScenario, ForecastResult | null>>({
    baseline: null,
    optimistic: null,
    pessimistic: null,
  });
  const [activeScenario, setActiveScenario] = useState<ForecastScenario>('baseline');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generated, setGenerated] = useState(false);

  async function loadForecast() {
    setLoading(true);
    setError('');
    try {
      const [baseline, optimistic, pessimistic] = await Promise.all([
        analysisApi.forecast(businessId, 12, 'baseline'),
        analysisApi.forecast(businessId, 12, 'optimistic'),
        analysisApi.forecast(businessId, 12, 'pessimistic'),
      ]);
      setForecasts({
        baseline: baseline.data,
        optimistic: optimistic.data,
        pessimistic: pessimistic.data,
      });
      setGenerated(true);
    } catch {
      setError(t.forecast.failedToGenerate);
    } finally {
      setLoading(false);
    }
  }

  if (!generated) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <TrendingUp className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {t.forecast.generateDescription}
        </p>
        <button
          type="button"
          onClick={loadForecast}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {loading ? t.forecast.generating : t.forecast.generate}
        </button>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  if (loading) return <LoadingSpinner />;

  const forecast = forecasts[activeScenario];
  if (!forecast) return null;

  const chartData = forecast.projections.map((p) => ({
    name: p.label || `M${p.month}`,
    [t.common.revenue]: p.projected_revenue,
    [t.common.expenses]: p.projected_expenses,
    ['Cash Balance']: p.projected_cash_balance,
  }));

  const lastMonth = forecast.projections[forecast.projections.length - 1];
  const avgBurnRate = forecast.projections.reduce((sum, p) => sum + p.burn_rate, 0) / forecast.projections.length;

  return (
    <div className="space-y-4">
      {/* Scenario tabs */}
      <div className="flex gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-1">
        {SCENARIOS.map((s) => {
          const isActive = activeScenario === s.key;
          const scenarioLabel = s.key === 'baseline' ? t.forecast.baseline : s.key === 'optimistic' ? t.forecast.optimistic : t.forecast.pessimistic;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setActiveScenario(s.key)}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {scenarioLabel}
            </button>
          );
        })}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            {t.forecast.cashRunway}
          </div>
          <p className="mt-1 text-lg font-bold text-gray-800 dark:text-gray-100">
            {forecast.projected_cash_runway
              ? `${t.forecast.month} ${forecast.projected_cash_runway}`
              : t.forecast.monthsPlus}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {forecast.projected_cash_runway
              ? t.forecast.cashReachesZero
              : t.forecast.cashRemainsPositive}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <TrendingUp className="h-3.5 w-3.5" />
            {t.forecast.endRiskScore}
          </div>
          <p className={`mt-1 text-lg font-bold ${
            forecast.end_of_period_risk_score <= 30 ? 'text-emerald-700 dark:text-emerald-400' :
            forecast.end_of_period_risk_score <= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {forecast.end_of_period_risk_score.toFixed(0)}/100
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t.forecast.projectedAtMonth} {forecast.months}</p>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <DollarSign className="h-3.5 w-3.5" />
            {t.forecast.endCashBalance}
          </div>
          <p className={`mt-1 text-lg font-bold ${
            forecast.end_cash_balance >= 0
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            {formatCurrency(forecast.end_cash_balance)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t.forecast.endOfPeriodBalance}</p>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <Flame className="h-3.5 w-3.5" />
            {t.forecast.avgBurnRate}
          </div>
          <p className={`mt-1 text-lg font-bold ${
            avgBurnRate <= 0
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-amber-600 dark:text-amber-400'
          }`}>
            {avgBurnRate > 0 ? formatCurrency(avgBurnRate) + t.forecast.perMonth : t.forecast.profitable}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {lastMonth?.runway_months != null ? `${lastMonth.runway_months} ${t.forecast.monthsRunway}` : t.forecast.infiniteRunway}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#374151' : '#f0f0f0'} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: dark ? '#9ca3af' : undefined }} />
            <YAxis tick={{ fontSize: 12, fill: dark ? '#9ca3af' : undefined }} tickFormatter={formatCurrency} />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ borderRadius: '8px', border: dark ? '1px solid #374151' : '1px solid #e5e7eb', backgroundColor: dark ? '#1f2937' : '#fff', color: dark ? '#f9fafb' : undefined }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey={t.common.revenue}
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey={t.common.expenses}
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="Cash Balance"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Regenerate button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={loadForecast}
          disabled={loading}
          className="rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {loading ? t.forecast.generating : t.forecast.regenerate}
        </button>
      </div>
    </div>
  );
}
