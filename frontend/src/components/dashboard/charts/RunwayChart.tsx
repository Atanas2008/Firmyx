'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { RiskAnalysis } from '@/types';
import { formatDate } from '@/lib/utils';

interface RunwayChartProps {
  analyses: RiskAnalysis[];
}

export function RunwayChart({ analyses }: RunwayChartProps) {
  if (!analyses || analyses.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-400">
        No analysis data available
      </div>
    );
  }

  const data = [...analyses]
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    .map((a) => ({
      name: formatDate(a.created_at),
      Runway: parseFloat(a.cash_runway_months.toFixed(1)),
      Score: a.risk_score,
    }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="runwayGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${v}mo`}
        />
        <Tooltip
          formatter={(value: number) => [`${value} months`, 'Cash Runway']}
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            fontSize: 12,
          }}
        />
        <ReferenceLine y={6} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: '6mo', fontSize: 10, fill: '#f59e0b' }} />
        <Area
          type="monotone"
          dataKey="Runway"
          stroke="#2563eb"
          strokeWidth={2}
          fill="url(#runwayGrad)"
          dot={{ r: 3, fill: '#2563eb' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
