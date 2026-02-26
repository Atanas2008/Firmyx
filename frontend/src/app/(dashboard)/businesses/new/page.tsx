'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { businessApi } from '@/lib/api';
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

  function setField(key: keyof CreateBusinessData, value: string | number) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof CreateBusinessData, string>> = {};
    if (!form.name.trim()) errs.name = 'Business name is required.';
    if (!form.industry) errs.industry = 'Select an industry.';
    if (!form.country.trim()) errs.country = 'Country is required.';
    if (form.num_employees < 1) errs.num_employees = 'Must be at least 1.';
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
      router.push(`/businesses/${data.id}`);
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
        title="Add New Business"
        description="Enter your business details to start monitoring financial health."
        breadcrumbs={[
          { label: 'Businesses', href: '/businesses' },
          { label: 'New Business' },
        ]}
      />

      <div className="max-w-2xl">
        <Card>
          {apiError && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {apiError}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Business Name"
              type="text"
              placeholder="Acme Corporation"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              error={errors.name}
              required
            />

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Industry
              </label>
              <select
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.industry}
                onChange={(e) => setField('industry', e.target.value)}
              >
                <option value="">Select an industry…</option>
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
              label="Country"
              type="text"
              placeholder="United States"
              value={form.country}
              onChange={(e) => setField('country', e.target.value)}
              error={errors.country}
              required
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Number of Employees"
                type="number"
                min="1"
                value={form.num_employees}
                onChange={(e) =>
                  setField('num_employees', parseInt(e.target.value) || 1)
                }
                error={errors.num_employees}
              />
              <Input
                label="Years Operating"
                type="number"
                min="0"
                step="0.5"
                value={form.years_operating}
                onChange={(e) =>
                  setField('years_operating', parseFloat(e.target.value) || 0)
                }
                hint="Enter 0 if less than a year"
              />
            </div>

            <Input
              label="Monthly Fixed Costs ($)"
              type="number"
              min="0"
              step="0.01"
              value={form.monthly_fixed_costs}
              onChange={(e) =>
                setField('monthly_fixed_costs', parseFloat(e.target.value) || 0)
              }
              hint="Recurring monthly costs (rent, salaries, etc.)"
            />

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" loading={loading} size="lg">
                Create Business
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
