'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { businessApi } from '@/lib/api';
import { useLanguage } from '@/hooks/useLanguage';
import { useToast } from '@/components/ui/Toast';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { CreateBusinessData } from '@/types';

const INDUSTRIES = [
  'Technology',
  'Retail',
  'Food & Beverage',
  'Healthcare',
  'Manufacturing',
  'Construction',
  'Professional Services',
  'Transportation',
  'Real Estate',
  'Education',
  'Finance',
  'Other',
];

export default function NewBusinessPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { success: showSuccess } = useToast();
  const [form, setForm] = useState<CreateBusinessData>({
    name: '',
    industry: '',
    country: '',
    num_employees: 1,
    years_operating: 0,
    monthly_fixed_costs: 0,
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof CreateBusinessData, string>>
  >({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [fixedCostsDisplay, setFixedCostsDisplay] = useState('0.00');

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

  function validateField(
    key: keyof CreateBusinessData,
    value: string | number
  ): string | undefined {
    switch (key) {
      case 'name': {
        const text = String(value).trim();
        if (!text) return 'Business name is required.';
        if (text.length < 2) return 'Business name must be at least 2 characters.';
        if (text.length > 100) return 'Business name must be at most 100 characters.';
        return undefined;
      }
      case 'industry':
        return String(value).trim() ? undefined : 'Select an industry.';
      case 'country': {
        const text = String(value).trim();
        if (!text) return 'Country is required.';
        if (text.length < 2) return 'Country must be at least 2 characters.';
        return undefined;
      }
      case 'num_employees': {
        const num = Number(value);
        if (!Number.isFinite(num)) return 'Enter a valid number.';
        if (num < 1) return 'Must be at least 1.';
        if (num > 1000000) return 'Value is unrealistically high.';
        return undefined;
      }
      case 'years_operating': {
        const num = Number(value);
        if (!Number.isFinite(num)) return 'Enter a valid number.';
        if (num < 0) return 'Must be ≥ 0.';
        if (num > 200) return 'Value is unrealistically high.';
        return undefined;
      }
      case 'monthly_fixed_costs': {
        const num = Number(value);
        if (!Number.isFinite(num)) return 'Enter a valid number.';
        if (num < 0) return 'Must be ≥ 0.';
        return undefined;
      }
      default:
        return undefined;
    }
  }

  function setField(key: keyof CreateBusinessData, value: string | number) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: validateField(key, value) }));
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof CreateBusinessData, string>> = {};

    const fields: Array<keyof CreateBusinessData> = [
      'name',
      'industry',
      'country',
      'num_employees',
      'years_operating',
      'monthly_fixed_costs',
    ];

    for (const field of fields) {
      const fieldError = validateField(field, form[field]);
      if (fieldError) errs[field] = fieldError;
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;
    setLoading(true);
    try {
      const { data } = await businessApi.create(form);
      showSuccess(t.onboardingExtra.businessCreated);
      router.push(`/businesses/${data.id}/financials`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Failed to create business.';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={t.businesses.addNew}
        description={t.businesses.addNewDescription}
        breadcrumbs={[
          { label: t.nav.businesses, href: '/businesses' },
          { label: t.businesses.addNew },
        ]}
      />

      <div className="max-w-2xl">
        <Card>
          {apiError && (
            <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {apiError}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label={t.businesses.name}
              type="text"
              placeholder="Acme Corporation"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              error={errors.name}
              required
            />

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                {t.businesses.industry}
              </label>
              <select
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.industry}
                onChange={(e) => setField('industry', e.target.value)}
              >
                <option value="">{t.businesses.selectIndustry}…</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
              </select>
              {errors.industry && (
                <p className="text-xs text-red-600">{errors.industry}</p>
              )}
            </div>

            <Input
              label={t.businesses.country}
              type="text"
              placeholder="United States"
              value={form.country}
              onChange={(e) => setField('country', e.target.value)}
              error={errors.country}
              required
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label={t.businesses.employees}
                type="number"
                min="1"
                value={form.num_employees}
                onChange={(e) =>
                  setField('num_employees', parseInt(e.target.value) || 1)
                }
                error={errors.num_employees}
              />
              <Input
                label={t.businesses.yearsOperating}
                type="number"
                min="0"
                step="1"
                value={form.years_operating}
                onChange={(e) =>
                  setField('years_operating', parseInt(e.target.value) || 0)
                }
                error={errors.years_operating}
                hint="Enter 0 if less than a year"
              />
            </div>

            <Input
              label={t.businesses.monthlyFixedCosts}
              type="text"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={fixedCostsDisplay}
              onChange={(e) => {
                setFixedCostsDisplay(e.target.value);
                setField('monthly_fixed_costs', parseMoneyInput(e.target.value));
              }}
              onFocus={() => setFixedCostsDisplay(String(form.monthly_fixed_costs))}
              onBlur={() => setFixedCostsDisplay(formatMoney(form.monthly_fixed_costs))}
              error={errors.monthly_fixed_costs}
              hint="Recurring monthly costs (rent, salaries, etc.)"
            />

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" loading={loading} size="lg">
                {t.businesses.createBusiness}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => router.back()}
              >
                {t.common.cancel}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
