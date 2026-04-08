'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Copy } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/hooks/useLanguage';
import type { CreateRecordData, FinancialRecord } from '@/types';

interface FinancialFormProps {
  onSubmit: (data: CreateRecordData) => Promise<void>;
  loading?: boolean;
  lastRecord?: FinancialRecord | null;
}

type NumericFieldKey = Exclude<keyof CreateRecordData, 'period_month' | 'period_year'>;

const OPTIONAL_ADVANCED_FIELDS: NumericFieldKey[] = [
  'total_assets',
  'current_liabilities',
  'ebit',
  'retained_earnings',
];

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

export function FinancialForm({ onSubmit, loading = false, lastRecord }: FinancialFormProps) {
  const { t } = useLanguage();
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
    total_assets: null,
    current_liabilities: null,
    ebit: null,
    retained_earnings: null,
  });
  const [touched, setTouched] = useState(false);
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

  function getNumericValue(key: NumericFieldKey): number {
    const value = form[key];
    return value == null ? 0 : value;
  }

  function getMoneyDisplay(key: NumericFieldKey): string {
    const typingValue = displayValues[key];
    if (typingValue !== undefined) return typingValue;
    if (OPTIONAL_ADVANCED_FIELDS.includes(key) && form[key] == null) {
      return '';
    }
    const val = getNumericValue(key);
    if (!touched && val === 0) return '';
    return formatMoney(val);
  }

  function validateField(
    key: keyof CreateRecordData,
    value: number | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _draft: CreateRecordData
  ): string | undefined {
    if (value !== null && Number.isNaN(value)) return 'Please enter a valid number.';

    if (value === null) {
      if (OPTIONAL_ADVANCED_FIELDS.includes(key as NumericFieldKey)) {
        return undefined;
      }
      return 'This field is required.';
    }

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
      case 'total_assets':
      case 'current_liabilities':
        return value < 0 ? 'Must be ≥ 0.' : undefined;
      case 'ebit':
      case 'retained_earnings':
        return undefined;
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

  function setMoneyField(key: NumericFieldKey, value: string) {
    if (!touched) setTouched(true);
    const isOptionalAdvanced = OPTIONAL_ADVANCED_FIELDS.includes(key);
    const parsed = value.trim() === '' && isOptionalAdvanced ? null : parseMoneyInput(value);
    setDisplayValues((prev) => ({ ...prev, [key]: value }));

    setForm((prev) => {
      const next = { ...prev, [key]: parsed };
      const fieldError = validateField(key, parsed, next);
      setErrors((prevErrors) => ({ ...prevErrors, [key]: fieldError }));
      return next;
    });
  }

  function handleMoneyBlur(key: NumericFieldKey) {
    if (OPTIONAL_ADVANCED_FIELDS.includes(key) && form[key] == null) {
      setDisplayValues((prev) => ({ ...prev, [key]: '' }));
      return;
    }
    setDisplayValues((prev) => ({ ...prev, [key]: formatMoney(getNumericValue(key)) }));
  }

  function handleMoneyFocus(key: NumericFieldKey) {
    if (!touched) setTouched(true);
    if (OPTIONAL_ADVANCED_FIELDS.includes(key) && form[key] == null) {
      setDisplayValues((prev) => ({ ...prev, [key]: '' }));
      return;
    }
    setDisplayValues((prev) => ({ ...prev, [key]: String(getNumericValue(key)) }));
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
      'total_assets',
      'current_liabilities',
      'ebit',
      'retained_earnings',
    ];

    for (const field of fields) {
      const fieldError = validateField(field, form[field] ?? null, form);
      if (fieldError) errs[field] = fieldError;
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  const warnings = useMemo(() => {
    const items: string[] = [];
    const resolvedAssets = form.total_assets ?? (form.monthly_revenue + form.cash_reserves);

    if (form.monthly_revenue === 0 && form.monthly_expenses > 0) {
      items.push(t.warnings.zeroRevenue);
    }

    if (form.monthly_expenses > form.monthly_revenue && form.cash_reserves < form.monthly_expenses * 3) {
      items.push(t.warnings.lowCash);
    }

    if (resolvedAssets > 0 && form.debt / resolvedAssets > 2) {
      items.push(t.warnings.highDebt);
    }

    if (form.cost_of_goods_sold > form.monthly_revenue && form.monthly_revenue > 0) {
      items.push(t.warnings.highCogs);
    }

    return items;
  }, [form]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const payload: CreateRecordData = {
      ...form,
      total_assets: form.total_assets ?? undefined,
      current_liabilities: form.current_liabilities ?? undefined,
      ebit: form.ebit ?? undefined,
      retained_earnings: form.retained_earnings ?? undefined,
    };
    await onSubmit(payload);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Period */}
      <div>
        <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">{t.financials.reportingPeriod}</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">{t.financials.month}</label>
            <select
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.period_month}
              onChange={(e) => setField('period_month', e.target.value)}
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">{t.financials.year}</label>
            <select
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* Copy from last month */}
      {lastRecord && (
        <button
          type="button"
          onClick={() => {
            setForm((prev) => ({
              ...prev,
              monthly_revenue: lastRecord.monthly_revenue,
              monthly_expenses: lastRecord.monthly_expenses,
              payroll: lastRecord.payroll,
              rent: lastRecord.rent,
              debt: lastRecord.debt,
              cash_reserves: lastRecord.cash_reserves,
              taxes: lastRecord.taxes,
              cost_of_goods_sold: lastRecord.cost_of_goods_sold,
              total_assets: lastRecord.total_assets ?? null,
              current_liabilities: lastRecord.current_liabilities ?? null,
              ebit: lastRecord.ebit ?? null,
              retained_earnings: lastRecord.retained_earnings ?? null,
            }));
            setDisplayValues({});
            setTouched(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <Copy className="h-3.5 w-3.5" />
          {t.financialsExtra.copyFromLastMonth}
        </button>
      )}

      {/* Income & Expenses */}
      <div>
        <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">{t.financials.incomeExpenses}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label={t.financials.monthlyRevenue}
            required
            type="text"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={getMoneyDisplay('monthly_revenue')}
            onChange={(e) => setMoneyField('monthly_revenue', e.target.value)}
            onFocus={() => handleMoneyFocus('monthly_revenue')}
            onBlur={() => handleMoneyBlur('monthly_revenue')}
            error={errors.monthly_revenue}
            hint={t.financials.totalIncomeHint}
          />
          <Input
            label={t.financials.monthlyExpenses}
            required
            type="text"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={getMoneyDisplay('monthly_expenses')}
            onChange={(e) => setMoneyField('monthly_expenses', e.target.value)}
            onFocus={() => handleMoneyFocus('monthly_expenses')}
            onBlur={() => handleMoneyBlur('monthly_expenses')}
            error={errors.monthly_expenses}
            hint={t.financials.totalExpensesHint}
          />
          <Input
            label={t.financials.cogs}
            type="text"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={getMoneyDisplay('cost_of_goods_sold')}
            onChange={(e) => setMoneyField('cost_of_goods_sold', e.target.value)}
            onFocus={() => handleMoneyFocus('cost_of_goods_sold')}
            onBlur={() => handleMoneyBlur('cost_of_goods_sold')}
            hint={t.financials.cogsHint}
          />
          <Input
            label={t.financials.taxes}
            type="text"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={getMoneyDisplay('taxes')}
            onChange={(e) => setMoneyField('taxes', e.target.value)}
            onFocus={() => handleMoneyFocus('taxes')}
            onBlur={() => handleMoneyBlur('taxes')}
            hint={t.financials.taxesHint}
          />
        </div>
      </div>

      {/* Fixed Costs */}
      <div>
        <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">{t.financials.fixedCosts}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label={t.financials.payroll}
            type="text"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={getMoneyDisplay('payroll')}
            onChange={(e) => setMoneyField('payroll', e.target.value)}
            onFocus={() => handleMoneyFocus('payroll')}
            onBlur={() => handleMoneyBlur('payroll')}
            hint={t.financials.employeeSalariesHint}
          />
          <Input
            label={t.financials.rent}
            type="text"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={getMoneyDisplay('rent')}
            onChange={(e) => setMoneyField('rent', e.target.value)}
            onFocus={() => handleMoneyFocus('rent')}
            onBlur={() => handleMoneyBlur('rent')}
            hint={t.financials.officeRentHint}
          />
        </div>
      </div>

      {/* Balance Sheet */}
      <div>
        <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">{t.financials.balanceSheet}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label={t.financials.totalDebt}
            type="text"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={getMoneyDisplay('debt')}
            onChange={(e) => setMoneyField('debt', e.target.value)}
            onFocus={() => handleMoneyFocus('debt')}
            onBlur={() => handleMoneyBlur('debt')}
            hint={t.financials.outstandingDebtHint}
          />
          <Input
            label={t.financials.cashReserves}
            type="text"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={getMoneyDisplay('cash_reserves')}
            onChange={(e) => setMoneyField('cash_reserves', e.target.value)}
            onFocus={() => handleMoneyFocus('cash_reserves')}
            onBlur={() => handleMoneyBlur('cash_reserves')}
            error={errors.cash_reserves}
            hint={t.financials.cashReservesHint}
          />
          <Input
            label={t.financials.totalAssets}
            type="text"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={getMoneyDisplay('total_assets')}
            onChange={(e) => setMoneyField('total_assets', e.target.value)}
            onFocus={() => handleMoneyFocus('total_assets')}
            onBlur={() => handleMoneyBlur('total_assets')}
            error={errors.total_assets}
            hint={t.financials.totalAssetsTooltip}
          />
          <Input
            label={t.financials.currentLiabilities}
            type="text"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={getMoneyDisplay('current_liabilities')}
            onChange={(e) => setMoneyField('current_liabilities', e.target.value)}
            onFocus={() => handleMoneyFocus('current_liabilities')}
            onBlur={() => handleMoneyBlur('current_liabilities')}
            error={errors.current_liabilities}
            hint={t.financials.currentLiabilitiesTooltip}
          />
          <Input
            label={t.financials.ebit}
            type="text"
            inputMode="decimal"
            step="0.01"
            value={getMoneyDisplay('ebit')}
            onChange={(e) => setMoneyField('ebit', e.target.value)}
            onFocus={() => handleMoneyFocus('ebit')}
            onBlur={() => handleMoneyBlur('ebit')}
            error={errors.ebit}
            hint={t.financials.ebitTooltip}
          />
          <Input
            label={t.financials.retainedEarnings}
            type="text"
            inputMode="decimal"
            step="0.01"
            value={getMoneyDisplay('retained_earnings')}
            onChange={(e) => setMoneyField('retained_earnings', e.target.value)}
            onFocus={() => handleMoneyFocus('retained_earnings')}
            onBlur={() => handleMoneyBlur('retained_earnings')}
            error={errors.retained_earnings}
            hint={t.financials.retainedEarningsTooltip}
          />
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <p className="mb-1 font-medium">{t.warnings.dataSanityChecks}</p>
          <ul className="list-disc pl-5 space-y-1">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <Button type="submit" loading={loading} size="lg" className="w-full sm:w-auto">
        {t.financials.saveRecord}
      </Button>
    </form>
  );
}
