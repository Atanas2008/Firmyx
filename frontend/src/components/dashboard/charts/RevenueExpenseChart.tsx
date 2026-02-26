'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { monthName, formatCurrency } from '@/lib/utils';
import type { FinancialRecord } from '@/types';

interface RevenueExpenseChartProps {
  records: FinancialRecord[];
}

export function RevenueExpenseChart({ records }: RevenueExpenseChartProps) {
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
      Revenue: r.monthly_revenue,
      Expenses: r.monthly_expenses,
    }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
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
          formatter={(value: number) => formatCurrency(value)}
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            fontSize: 12,
          }}
        />
        <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
