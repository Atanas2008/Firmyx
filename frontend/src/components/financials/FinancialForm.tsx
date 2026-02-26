'use client';

import { useState, type FormEvent } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { CreateRecordData } from '@/types';

interface FinancialFormProps {
  onSubmit: (data: CreateRecordData) => Promise<void>;
  loading?: boolean;
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

export function FinancialForm({ onSubmit, loading = false }: FinancialFormProps) {
  const now = new Date();
  const [form, setForm] = useState<CreateRecordData>({
    period_month: now.getMonth() + 1,
    period_year: now.getFullYear(),
    monthly_revenue: 0,
    monthly_expenses: 0,
    payroll: 0,
    rent: 0,
    debt: 0,
    cash_reserves: 0,
    taxes: 0,
    cost_of_goods_sold: 0,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CreateRecordData, string>>>({});

  function setField(key: keyof CreateRecordData, value: string) {
    setForm((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof CreateRecordData, string>> = {};
    if (form.monthly_revenue < 0) errs.monthly_revenue = 'Must be ≥ 0';
    if (form.monthly_expenses < 0) errs.monthly_expenses = 'Must be ≥ 0';
    if (form.cash_reserves < 0) errs.cash_reserves = 'Must be ≥ 0';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Period */}
      <div>
        <p className="mb-3 text-sm font-semibold text-gray-700">Reporting Period</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Month</label>
            <select
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.period_month}
              onChange={(e) => setField('period_month', e.target.value)}
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Year</label>
            <select
              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.period_year}
              onChange={(e) => setField('period_year', e.target.value)}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Income & Expenses */}
      <div>
        <p className="mb-3 text-sm font-semibold text-gray-700">Income &amp; Expenses</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Monthly Revenue ($)"
            type="number"
            min="0"
            step="0.01"
            value={form.monthly_revenue || ''}
            onChange={(e) => setField('monthly_revenue', e.target.value)}
            error={errors.monthly_revenue}
            hint="Total income this month"
          />
          <Input
            label="Monthly Expenses ($)"
            type="number"
            min="0"
            step="0.01"
            value={form.monthly_expenses || ''}
            onChange={(e) => setField('monthly_expenses', e.target.value)}
            error={errors.monthly_expenses}
            hint="Total spending this month"
          />
          <Input
            label="Cost of Goods Sold ($)"
            type="number"
            min="0"
            step="0.01"
            value={form.cost_of_goods_sold || ''}
            onChange={(e) => setField('cost_of_goods_sold', e.target.value)}
            hint="Direct costs of products/services"
          />
          <Input
            label="Taxes ($)"
            type="number"
            min="0"
            step="0.01"
            value={form.taxes || ''}
            onChange={(e) => setField('taxes', e.target.value)}
            hint="Taxes paid this month"
          />
        </div>
      </div>

      {/* Fixed Costs */}
      <div>
        <p className="mb-3 text-sm font-semibold text-gray-700">Fixed Costs</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Payroll ($)"
            type="number"
            min="0"
            step="0.01"
            value={form.payroll || ''}
            onChange={(e) => setField('payroll', e.target.value)}
            hint="Employee salaries and wages"
          />
          <Input
            label="Rent ($)"
            type="number"
            min="0"
            step="0.01"
            value={form.rent || ''}
            onChange={(e) => setField('rent', e.target.value)}
            hint="Office / facility rent"
          />
        </div>
      </div>

      {/* Balance Sheet */}
      <div>
        <p className="mb-3 text-sm font-semibold text-gray-700">Balance Sheet</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Total Debt ($)"
            type="number"
            min="0"
            step="0.01"
            value={form.debt || ''}
            onChange={(e) => setField('debt', e.target.value)}
            hint="Outstanding loans and liabilities"
          />
          <Input
            label="Cash Reserves ($)"
            type="number"
            min="0"
            step="0.01"
            value={form.cash_reserves || ''}
            onChange={(e) => setField('cash_reserves', e.target.value)}
            error={errors.cash_reserves}
            hint="Cash on hand and in bank"
          />
        </div>
      </div>

      <Button type="submit" loading={loading} size="lg" className="w-full sm:w-auto">
        Save Financial Record
      </Button>
    </form>
  );
}
