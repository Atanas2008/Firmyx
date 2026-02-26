'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  BarChart3,
  DollarSign,
  FileText,
  Building2,
  Plus,
  Calendar,
} from 'lucide-react';
import { businessApi, financialApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { FinancialForm } from '@/components/financials/FinancialForm';
import { FileUpload } from '@/components/financials/FileUpload';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency, monthName } from '@/lib/utils';
import type { Business, CreateRecordData, FinancialRecord } from '@/types';

type Tab = 'manual' | 'upload';

export default function FinancialsPage() {
  const { id } = useParams<{ id: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [tab, setTab] = useState<Tab>('manual');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [bRes, rRes] = await Promise.all([
        businessApi.get(id),
        financialApi.list(id),
      ]);
      setBusiness(bRes.data);
      setRecords(
        [...rRes.data].sort((a, b) =>
          a.period_year !== b.period_year
            ? b.period_year - a.period_year
            : b.period_month - a.period_month
        )
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleManualSubmit(data: CreateRecordData) {
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await financialApi.create(id, data);
      setSuccessMsg('Financial record saved successfully!');
      await loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Failed to save record.';
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleFileUpload(file: File) {
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await financialApi.upload(id, file);
      setSuccessMsg('File uploaded and processed successfully!');
      await loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Failed to process file.';
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div>
      <PageHeader
        title="Financial Data"
        description={business?.name ?? ''}
        breadcrumbs={[
          { label: 'Businesses', href: '/businesses' },
          { label: business?.name ?? 'Business', href: `/businesses/${id}` },
          { label: 'Financials' },
        ]}
      />

      {/* Navigation tabs */}
      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {[
          { label: 'Overview', href: `/businesses/${id}`, icon: Building2 },
          { label: 'Financials', href: `/businesses/${id}/financials`, icon: DollarSign },
          { label: 'Analysis', href: `/businesses/${id}/analysis`, icon: BarChart3 },
          { label: 'Reports', href: `/businesses/${id}/reports`, icon: FileText },
        ].map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              href === `/businesses/${id}/financials`
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-blue-300 hover:text-gray-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Input form */}
        <div className="lg:col-span-3">
          <Card
            title="Add Financial Record"
            actions={
              <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                <button
                  onClick={() => setTab('manual')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    tab === 'manual'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Manual Input
                </button>
                <button
                  onClick={() => setTab('upload')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    tab === 'upload'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Upload File
                </button>
              </div>
            }
          >
            {successMsg && (
              <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
                {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {errorMsg}
              </div>
            )}
            {tab === 'manual' ? (
              <FinancialForm onSubmit={handleManualSubmit} loading={saving} />
            ) : (
              <div>
                <p className="mb-4 text-sm text-gray-600">
                  Upload a CSV or Excel file with your financial data. Download
                  a template to get started.
                </p>
                <div className="mb-4">
                  <a
                    href="/template.csv"
                    download
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Download CSV template
                  </a>
                </div>
                <FileUpload onUpload={handleFileUpload} loading={saving} />
              </div>
            )}
          </Card>
        </div>

        {/* Records list */}
        <div className="lg:col-span-2">
          <Card
            title="Financial Records"
            actions={
              <span className="text-xs text-gray-400">
                {records.length} record{records.length !== 1 ? 's' : ''}
              </span>
            }
          >
            {records.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Plus className="mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-500">No records yet</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 -mx-6 -mb-5">
                {records.map((r) => (
                  <li key={r.id} className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {monthName(r.period_month)} {r.period_year}
                        </p>
                        <p className="text-xs text-gray-400">
                          Rev: {formatCurrency(r.monthly_revenue)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700">
                        {formatCurrency(r.monthly_revenue - r.monthly_expenses)}
                      </p>
                      <p className="text-xs text-gray-400">profit</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
