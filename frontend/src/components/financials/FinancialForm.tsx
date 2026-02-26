'use client';

import { useMemo, useState, type FormEvent } from 'react';
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
  const [displayValues, setDisplayValues] = useState<
    Partial<Record<keyof CreateRecordData, string>>
  >({});

  function formatMoney(value: number): string {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  function parseMoneyInput(raw: string): number {
    const normalized = raw.replace(/,/g, '').trim();
    if (!normalized) return 0;
    const parsed = Number(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  function getMoneyDisplay(key: keyof CreateRecordData): string {
    const typingValue = displayValues[key];
    if (typingValue !== undefined) return typingValue;
    return formatMoney(form[key]);
  }

  function validateField(
    key: keyof CreateRecordData,
    value: number,
    draft: CreateRecordData
  ): string | undefined {
    if (Number.isNaN(value)) return 'Please enter a valid number.';

    switch (key) {
      case 'period_month':
        return value < 1 || value > 12 ? 'Month must be between 1 and 12.' : undefined;
      case 'period_year': {
        const minYear = currentYear - 20;
        const maxYear = currentYear + 1;
        return value < minYear || value > maxYear
          ? `Year must be between ${minYear} and ${maxYear}.`
          : undefined;
      }
      case 'monthly_revenue':
      case 'monthly_expenses':
      case 'payroll':
      case 'rent':
      case 'debt':
      case 'cash_reserves':
      case 'taxes':
      case 'cost_of_goods_sold':
        return value < 0 ? 'Must be ≥ 0.' : undefined;
      default:
        return undefined;
    }
  }

  function setField(key: keyof CreateRecordData, value: string) {
    const parsed = value.trim() === '' ? 0 : Number(value);

    setForm((prev) => {
      const next = { ...prev, [key]: Number.isNaN(parsed) ? 0 : parsed };
      const fieldError = validateField(key, Number.isNaN(parsed) ? 0 : parsed, next);
      setErrors((prevErrors) => ({ ...prevErrors, [key]: fieldError }));
      return next;
    });
  }

  function setMoneyField(key: keyof CreateRecordData, value: string) {
    const parsed = parseMoneyInput(value);
    setDisplayValues((prev) => ({ ...prev, [key]: value }));

    setForm((prev) => {
      const next = { ...prev, [key]: parsed };
      const fieldError = validateField(key, parsed, next);
      setErrors((prevErrors) => ({ ...prevErrors, [key]: fieldError }));
      return next;
    });
  }

  function handleMoneyBlur(key: keyof CreateRecordData) {
    setDisplayValues((prev) => ({ ...prev, [key]: formatMoney(form[key]) }));
  }

  function handleMoneyFocus(key: keyof CreateRecordData) {
    setDisplayValues((prev) => ({ ...prev, [key]: String(form[key]) }));
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof CreateRecordData, string>> = {};

    const fields: Array<keyof CreateRecordData> = [
      'period_month',
      'period_year',
      'monthly_revenue',
      'monthly_expenses',
      'payroll',
      'rent',
      'debt',
      'cash_reserves',
      'taxes',
      'cost_of_goods_sold',
    ];

    for (const field of fields) {
      const fieldError = validateField(field, form[field], form);
      if (fieldError) errs[field] = fieldError;
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  const warnings = useMemo(() => {
    const items: string[] = [];
    const impliedAssets = form.monthly_revenue + form.cash_reserves;

    if (form.monthly_revenue === 0 && form.monthly_expenses > 0) {
      items.push('Revenue is 0 while expenses are positive. Risk outputs may indicate severe stress.');
    }

    if (form.monthly_expenses > form.monthly_revenue && form.cash_reserves < form.monthly_expenses * 3) {
      items.push('Expenses exceed revenue and cash reserves cover less than ~3 months of expenses.');
    }

    if (impliedAssets > 0 && form.debt / impliedAssets > 2) {
      items.push('Debt is more than 200% of implied assets (revenue + cash), which may drive a high-risk result.');
    }

    if (form.cost_of_goods_sold > form.monthly_revenue && form.monthly_revenue > 0) {
      items.push('COGS is greater than revenue. Please verify revenue or COGS values.');
    }

    return items;
  }, [form]);

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
            type="text"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={getMoneyDisplay('monthly_revenue')}
            onChange={(e) => setMoneyField('monthly_revenue', e.target.value)}
            onFocus={() => handleMoneyFocus('monthly_revenue')}
            onBlur={() => handleMoneyBlur('monthly_revenue')}
            error={errors.monthly_revenue}
            hint="Total income this month"
          />
          <Input
            label="Monthly Expenses ($)"
            type="text"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={getMoneyDisplay('monthly_expenses')}
            onChange={(e) => setMoneyField('monthly_expenses', e.target.value)}
            onFocus={() => handleMoneyFocus('monthly_expenses')}
            onBlur={() => handleMoneyBlur('monthly_expenses')}
            error={errors.monthly_expenses}
            hint="Total spending this month"
          />
          <Input
            label="Cost of Goods Sold ($)"
            type="text"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={getMoneyDisplay('cost_of_goods_sold')}
            onChange={(e) => setMoneyField('cost_of_goods_sold', e.target.value)}
            onFocus={() => handleMoneyFocus('cost_of_goods_sold')}
            onBlur={() => handleMoneyBlur('cost_of_goods_sold')}
            hint="Direct costs of products/services"
          />
          <Input
            label="Taxes ($)"
            type="text"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={getMoneyDisplay('taxes')}
            onChange={(e) => setMoneyField('taxes', e.target.value)}
            onFocus={() => handleMoneyFocus('taxes')}
            onBlur={() => handleMoneyBlur('taxes')}
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
            type="text"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={getMoneyDisplay('payroll')}
            onChange={(e) => setMoneyField('payroll', e.target.value)}
            onFocus={() => handleMoneyFocus('payroll')}
            onBlur={() => handleMoneyBlur('payroll')}
            hint="Employee salaries and wages"
          />
          <Input
            label="Rent ($)"
            type="text"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={getMoneyDisplay('rent')}
            onChange={(e) => setMoneyField('rent', e.target.value)}
            onFocus={() => handleMoneyFocus('rent')}
            onBlur={() => handleMoneyBlur('rent')}
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
            type="text"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={getMoneyDisplay('debt')}
            onChange={(e) => setMoneyField('debt', e.target.value)}
            onFocus={() => handleMoneyFocus('debt')}
            onBlur={() => handleMoneyBlur('debt')}
            hint="Outstanding loans and liabilities"
          />
          <Input
            label="Cash Reserves ($)"
            type="text"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={getMoneyDisplay('cash_reserves')}
            onChange={(e) => setMoneyField('cash_reserves', e.target.value)}
            onFocus={() => handleMoneyFocus('cash_reserves')}
            onBlur={() => handleMoneyBlur('cash_reserves')}
            error={errors.cash_reserves}
            hint="Cash on hand and in bank"
          />
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="mb-1 font-medium">Data sanity checks</p>
          <ul className="list-disc pl-5 space-y-1">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <Button type="submit" loading={loading} size="lg" className="w-full sm:w-auto">
        Save Financial Record
      </Button>
    </form>
  );
}
