'use client';

import { useState } from 'react';
import {
  ComposedChart,
  Line,
  Area,
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
import type { MultiScenarioForecast, ForecastMonth } from '@/types';

interface ForecastChartProps {
  businessId: string;
}

type ViewMode = 'revenue' | 'cash' | 'risk';

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function buildOverlayData(data: MultiScenarioForecast, mode: ViewMode) {
  const getVal = (p: ForecastMonth) =>
    mode === 'revenue' ? p.projected_revenue
    : mode === 'cash' ? p.projected_cash_balance
    : p.projected_risk_score;

  return data.baseline.map((b, i) => ({
    name: b.label || `M${b.month}`,
    baseline: getVal(b),
    optimistic: getVal(data.optimistic[i]),
    pessimistic: getVal(data.pessimistic[i]),
    // Band between optimistic and pessimistic
    band: [getVal(data.pessimistic[i]), getVal(data.optimistic[i])],
  }));
}

export function ForecastChart({ businessId }: ForecastChartProps) {
  const { resolvedTheme } = useTheme();
  const { t } = useLanguage();
  const dark = resolvedTheme === 'dark';
  const [data, setData] = useState<MultiScenarioForecast | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('revenue');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generated, setGenerated] = useState(false);

  async function loadForecast() {
    setLoading(true);
    setError('');
    try {
      const res = await analysisApi.forecastAllScenarios(businessId, 12);
      setData(res.data);
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
  if (!data) return null;

  const baseline = data.baseline;
  const lastBaseline = baseline[baseline.length - 1];
  const lastOptimistic = data.optimistic[data.optimistic.length - 1];
  const lastPessimistic = data.pessimistic[data.pessimistic.length - 1];
  const avgBurnRate = baseline.reduce((sum, p) => sum + p.burn_rate, 0) / baseline.length;
  const chartData = buildOverlayData(data, viewMode);

  const cashRunwayMonth = baseline.findIndex(p => p.projected_cash_balance <= 0);

  const viewLabels: Record<ViewMode, string> = {
    revenue: t.common.revenue ?? 'Revenue',
    cash: t.forecast.endCashBalance ?? 'Cash Balance',
    risk: t.decision.riskScore ?? 'Risk Score',
  };

  const formatValue = viewMode === 'risk'
    ? (v: number) => `${v.toFixed(0)}/100`
    : formatCurrency;

  return (
    <div className="space-y-4">
      {/* View mode tabs */}
      <div className="flex gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-1">
        {(['revenue', 'cash', 'risk'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setViewMode(mode)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === mode
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {viewLabels[mode]}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            {t.forecast.cashRunway}
          </div>
          <p className="mt-1 text-lg font-bold text-gray-800 dark:text-gray-100">
            {cashRunwayMonth >= 0
              ? `${t.forecast.month} ${cashRunwayMonth + 1}`
              : t.forecast.monthsPlus}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {cashRunwayMonth >= 0
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
            lastBaseline.projected_risk_score <= 30 ? 'text-emerald-700 dark:text-emerald-400' :
            lastBaseline.projected_risk_score <= 50 ? 'text-amber-600 dark:text-amber-400' :
            lastBaseline.projected_risk_score <= 70 ? 'text-orange-600 dark:text-orange-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {lastBaseline.projected_risk_score.toFixed(0)}/100
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {lastOptimistic.projected_risk_score.toFixed(0)} — {lastPessimistic.projected_risk_score.toFixed(0)} {t.forecast.range ?? 'range'}
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <DollarSign className="h-3.5 w-3.5" />
            {t.forecast.endCashBalance}
          </div>
          <p className={`mt-1 text-lg font-bold ${
            lastBaseline.projected_cash_balance >= 0
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            {formatCurrency(lastBaseline.projected_cash_balance)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatCurrency(lastPessimistic.projected_cash_balance)} — {formatCurrency(lastOptimistic.projected_cash_balance)}
          </p>
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
            {lastBaseline.runway_months != null ? `${lastBaseline.runway_months} ${t.forecast.monthsRunway}` : t.forecast.infiniteRunway}
          </p>
        </div>
      </div>

      {/* Multi-scenario overlay chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#374151' : '#f0f0f0'} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: dark ? '#9ca3af' : undefined }} />
            <YAxis tick={{ fontSize: 12, fill: dark ? '#9ca3af' : undefined }} tickFormatter={viewMode === 'risk' ? (v: number) => `${v}` : formatCurrency} />
            <Tooltip
              formatter={(value: number) => formatValue(value)}
              contentStyle={{ borderRadius: '8px', border: dark ? '1px solid #374151' : '1px solid #e5e7eb', backgroundColor: dark ? '#1f2937' : '#fff', color: dark ? '#f9fafb' : undefined }}
            />
            <Legend />
            {/* Uncertainty band between pessimistic and optimistic */}
            <Area
              type="monotone"
              dataKey="optimistic"
              stroke="none"
              fill="#3b82f6"
              fillOpacity={0.08}
              name={t.forecast.optimistic ?? 'Optimistic'}
            />
            <Area
              type="monotone"
              dataKey="pessimistic"
              stroke="none"
              fill="#ef4444"
              fillOpacity={0.08}
              name={t.forecast.pessimistic ?? 'Pessimistic'}
            />
            {/* Scenario lines */}
            <Line
              type="monotone"
              dataKey="optimistic"
              stroke="#10b981"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
              name={t.forecast.optimistic ?? 'Optimistic'}
            />
            <Line
              type="monotone"
              dataKey="pessimistic"
              stroke="#ef4444"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
              name={t.forecast.pessimistic ?? 'Pessimistic'}
            />
            <Line
              type="monotone"
              dataKey="baseline"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={false}
              name={t.forecast.baseline ?? 'Baseline'}
            />
          </ComposedChart>
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
