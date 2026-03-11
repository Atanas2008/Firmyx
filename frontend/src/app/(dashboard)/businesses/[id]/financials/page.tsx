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
  Trash2,
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
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  function extractErrorMessage(
    err: unknown,
    fallback: string
  ): string {
    const detail = (err as { response?: { data?: { detail?: unknown } } })
      ?.response?.data?.detail;

    if (typeof detail === 'string') {
      return detail;
    }

    if (detail && typeof detail === 'object') {
      const message = (detail as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim().length > 0) {
        return message;
      }
    }

    return fallback;
  }

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
      if (rRes.data.length > 0) {
        const sorted = [...rRes.data].sort((a, b) =>
          a.period_year !== b.period_year
            ? b.period_year - a.period_year
            : b.period_month - a.period_month
        );
        setSelectedRecordId((prev) => prev ?? sorted[0].id);
      } else {
        setSelectedRecordId(null);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleDelete(recordId: string) {
    if (!window.confirm('Delete this financial record? This cannot be undone.')) return;
    setDeletingId(recordId);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await financialApi.delete(id, recordId);
      setSuccessMsg('Record deleted successfully.');
      if (selectedRecordId === recordId) setSelectedRecordId(null);
      await loadData();
    } catch {
      setErrorMsg('Failed to delete record.');
    } finally {
      setDeletingId(null);
    }
  }

  const selectedRecord = records.find((r) => r.id === selectedRecordId) ?? records[0] ?? null;

  async function handleManualSubmit(data: CreateRecordData) {
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await financialApi.create(id, data);
      setSuccessMsg('Financial record saved successfully! Run a new analysis on the Analysis tab to update risk metrics.');
      await loadData();
    } catch (err: unknown) {
      setErrorMsg(extractErrorMessage(err, 'Failed to save record.'));
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
      setSuccessMsg('File uploaded and processed successfully! Navigate to the Analysis tab and run a new analysis to update all risk metrics.');
      await loadData();
    } catch (err: unknown) {
      setErrorMsg(extractErrorMessage(err, 'Failed to process file.'));
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
                  Upload a CSV or Excel file with your financial data.
                  Choose <span className="font-medium">monthly format</span> (one
                  row per month, requires a <code className="text-xs bg-gray-100 px-1 rounded">month</code> column)
                  or <span className="font-medium">annual format</span> (one row
                  per year — annual totals are automatically split into 12 monthly
                  records).
                </p>
                <div className="mb-4 flex flex-wrap gap-4">
                  <a
                    href="/template.csv"
                    download
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    ↓ Monthly template (CSV)
                  </a>
                  <a
                    href="/template_annual.csv"
                    download
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    ↓ Annual template (CSV)
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
                <ul className="divide-y divide-gray-100 -mx-6 -mb-5 max-h-[420px] overflow-y-auto">
                {records.map((r) => (
                    <li
                      key={r.id}
                      className={`flex items-center justify-between px-6 py-3 cursor-pointer transition-colors ${
                        selectedRecord?.id === r.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedRecordId(r.id)}
                    >
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
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-700">
                          {formatCurrency(r.monthly_revenue - r.monthly_expenses)}
                        </p>
                        <p className="text-xs text-gray-400">profit</p>
                      </div>
                      <button
                        type="button"
                        disabled={deletingId === r.id}
                        onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 transition-colors"
                        title="Delete record"
                      >
                        {deletingId === r.id ? (
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {selectedRecord && (
            <Card title="Selected Record Details" className="mt-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <p className="text-sm text-gray-700">Period: <span className="font-medium text-gray-900">{monthName(selectedRecord.period_month)} {selectedRecord.period_year}</span></p>
                <p className="text-sm text-gray-700">Revenue: <span className="font-medium text-gray-900">{formatCurrency(selectedRecord.monthly_revenue)}</span></p>
                <p className="text-sm text-gray-700">Expenses: <span className="font-medium text-gray-900">{formatCurrency(selectedRecord.monthly_expenses)}</span></p>
                <p className="text-sm text-gray-700">Profit: <span className="font-medium text-gray-900">{formatCurrency(selectedRecord.monthly_revenue - selectedRecord.monthly_expenses)}</span></p>
                <p className="text-sm text-gray-700">Debt: <span className="font-medium text-gray-900">{formatCurrency(selectedRecord.debt)}</span></p>
                <p className="text-sm text-gray-700">Cash Reserves: <span className="font-medium text-gray-900">{formatCurrency(selectedRecord.cash_reserves)}</span></p>
                <p className="text-sm text-gray-700">COGS: <span className="font-medium text-gray-900">{formatCurrency(selectedRecord.cost_of_goods_sold)}</span></p>
                <p className="text-sm text-gray-700">Taxes: <span className="font-medium text-gray-900">{formatCurrency(selectedRecord.taxes)}</span></p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
