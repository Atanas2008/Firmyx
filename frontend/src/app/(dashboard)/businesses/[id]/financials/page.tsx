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
import { useLanguage } from '@/hooks/useLanguage';
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
  const { t } = useLanguage();
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
    if (!window.confirm(t.financials.deleteConfirm)) return;
    setDeletingId(recordId);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await financialApi.delete(id, recordId);
      setSuccessMsg(t.financials.deletedSuccess);
      if (selectedRecordId === recordId) setSelectedRecordId(null);
      await loadData();
    } catch {
      setErrorMsg(t.financials.failedToDelete);
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
      setSuccessMsg(t.financials.recordSaved);
      await loadData();
    } catch (err: unknown) {
      setErrorMsg(extractErrorMessage(err, t.financials.failedToSave));
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
      setSuccessMsg(t.financials.uploadSuccess);
      await loadData();
    } catch (err: unknown) {
      setErrorMsg(extractErrorMessage(err, t.financials.failedToUpload));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div>
      <PageHeader
        title={t.financials.title}
        description={business?.name ?? ''}
        breadcrumbs={[
          { label: t.nav.businesses, href: '/businesses' },
          { label: business?.name ?? 'Business', href: `/businesses/${id}` },
          { label: t.nav.financials },
        ]}
      />

      {/* Navigation tabs */}
      <div className="mb-6 flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {[
          { label: t.nav.overview, href: `/businesses/${id}`, icon: Building2 },
          { label: t.nav.financials, href: `/businesses/${id}/financials`, icon: DollarSign },
          { label: t.nav.analysis, href: `/businesses/${id}/analysis`, icon: BarChart3 },
          { label: t.nav.reports, href: `/businesses/${id}/reports`, icon: FileText },
        ].map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              href === `/businesses/${id}/financials`
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-blue-300 hover:text-gray-700 dark:hover:text-gray-200'
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
            title={t.financials.addRecord}
            actions={
              <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-0.5">
                <button
                  onClick={() => setTab('manual')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    tab === 'manual'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {t.financials.manualInput}
                </button>
                <button
                  onClick={() => setTab('upload')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    tab === 'upload'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {t.financials.uploadFile}
                </button>
              </div>
            }
          >
            {successMsg && (
              <div className="mb-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                {errorMsg}
              </div>
            )}
            {tab === 'manual' ? (
              <FinancialForm onSubmit={handleManualSubmit} loading={saving} />
            ) : (
              <div>
                <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
                  {t.financials.uploadDescription}{' '}
                  <span className="font-medium">{t.financials.monthlyFormat}</span>{' '}
                  {t.financials.monthlyFormatDesc.replace('{code}', 'month')}{' '}
                  {t.common.or} <span className="font-medium">{t.financials.annualFormat}</span>{' '}
                  {t.financials.annualFormatDesc}
                </p>
                <div className="mb-4 flex flex-wrap gap-4">
                  <a
                    href="/template.csv"
                    download
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {t.financials.monthlyTemplate}
                  </a>
                  <a
                    href="/template_annual.csv"
                    download
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {t.financials.annualTemplate}
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
            title={t.financials.financialRecords}
            actions={
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {records.length} {records.length !== 1 ? t.common.records : t.common.record}
              </span>
            }
          >
            {records.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800 mb-3">
                  <Plus className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{t.financials.noRecordsYet}</p>
                <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{t.financials.noRecordsHint}</p>
              </div>
            ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800 -mx-6 -mb-5 max-h-[420px] overflow-y-auto">
                {records.map((r) => (
                    <li
                      key={r.id}
                      className={`flex items-center justify-between px-6 py-3 cursor-pointer transition-colors ${
                        selectedRecord?.id === r.id ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                      onClick={() => setSelectedRecordId(r.id)}
                    >
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                          {monthName(r.period_month)} {r.period_year}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          Rev: {formatCurrency(r.monthly_revenue)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                          {formatCurrency(r.monthly_revenue - r.monthly_expenses)}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{t.common.profit}</p>
                      </div>
                      <button
                        type="button"
                        disabled={deletingId === r.id}
                        onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-40 transition-colors"
                        title={t.financials.deleteRecord}
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
            <Card title={t.financials.selectedRecordDetails} className="mt-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <p className="text-sm text-gray-700 dark:text-gray-300">{t.common.period}: <span className="font-medium text-gray-900 dark:text-gray-50">{monthName(selectedRecord.period_month)} {selectedRecord.period_year}</span></p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{t.common.revenue}: <span className="font-medium text-gray-900 dark:text-gray-50">{formatCurrency(selectedRecord.monthly_revenue)}</span></p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{t.common.expenses}: <span className="font-medium text-gray-900 dark:text-gray-50">{formatCurrency(selectedRecord.monthly_expenses)}</span></p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{t.common.profit}: <span className="font-medium text-gray-900 dark:text-gray-50">{formatCurrency(selectedRecord.monthly_revenue - selectedRecord.monthly_expenses)}</span></p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{t.financials.debt}: <span className="font-medium text-gray-900 dark:text-gray-50">{formatCurrency(selectedRecord.debt)}</span></p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{t.financials.cashReserves}: <span className="font-medium text-gray-900 dark:text-gray-50">{formatCurrency(selectedRecord.cash_reserves)}</span></p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{t.financials.cogs}: <span className="font-medium text-gray-900 dark:text-gray-50">{formatCurrency(selectedRecord.cost_of_goods_sold)}</span></p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{t.financials.taxes}: <span className="font-medium text-gray-900 dark:text-gray-50">{formatCurrency(selectedRecord.taxes)}</span></p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
