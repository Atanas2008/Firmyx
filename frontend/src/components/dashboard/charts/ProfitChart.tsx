'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { monthName, formatCurrency } from '@/lib/utils';
import type { FinancialRecord } from '@/types';

interface ProfitChartProps {
  records: FinancialRecord[];
}

export function ProfitChart({ records }: ProfitChartProps) {
  if (!records || records.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-400">
        No financial data available
      </div>
    );
  }

  const data = [...records]
    .sort((a, b) =>
      a.period_year !== b.period_year
        ? a.period_year - b.period_year
        : a.period_month - b.period_month
    )
    .map((r) => ({
      name: `${monthName(r.period_month)} ${r.period_year}`,
      Profit: r.monthly_revenue - r.monthly_expenses,
    }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
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
          tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          formatter={(value: number) => [formatCurrency(value), 'Profit']}
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            fontSize: 12,
          }}
        />
        <ReferenceLine y={0} stroke="#e5e7eb" />
        <Line
          type="monotone"
          dataKey="Profit"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ r: 3, fill: '#10b981' }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
