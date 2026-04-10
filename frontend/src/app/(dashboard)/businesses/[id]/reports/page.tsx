'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  FileText,
  Download,
  Plus,
} from 'lucide-react';
import { analysisApi, businessApi, reportApi } from '@/lib/api';
import { useLanguage } from '@/hooks/useLanguage';
import { PageHeader } from '@/components/layout/PageHeader';
import { BusinessTabs } from '@/components/layout/BusinessTabs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatDate, monthName } from '@/lib/utils';
import type { Business, Report, RiskAnalysis } from '@/types';

export default function ReportsPage() {
  const { id } = useParams<{ id: string }>();
  const { language, t } = useLanguage();
  const [business, setBusiness] = useState<Business | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [analyses, setAnalyses] = useState<RiskAnalysis[]>([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [bRes, rRes, aRes] = await Promise.all([
        businessApi.get(id),
        reportApi.list(id),
        analysisApi.list(id),
      ]);
      setBusiness(bRes.data);
      const analysisData = (aRes.data.items ?? aRes.data) as RiskAnalysis[];
      const sortedAnalyses = [...analysisData].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setAnalyses(sortedAnalyses);
      setSelectedAnalysisId((prev) => {
        if (prev && sortedAnalyses.some((analysis) => analysis.id === prev)) {
          return prev;
        }
        return sortedAnalyses[0]?.id ?? '';
      });
      setReports(
        [...(rRes.data.items ?? rRes.data)].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleGenerate() {
    setGenerating(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await reportApi.generate(id, selectedAnalysisId || undefined);
      setSuccessMsg(t.reports.reportGenerated);
      await loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? t.reports.failedToGenerate;
      setErrorMsg(msg);
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload(reportId: string) {
    setDownloadingReportId(reportId);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const response = await reportApi.download(id, reportId);
      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `firmyx-report-${reportId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? t.reports.failedToDownload;
      setErrorMsg(msg);
    } finally {
      setDownloadingReportId(null);
    }
  }

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div>
      <PageHeader
        title={t.reports.title}
        description={business?.name ?? ''}
        breadcrumbs={[
          { label: t.nav.businesses, href: '/businesses' },
          { label: business?.name ?? 'Business', href: `/businesses/${id}` },
          { label: t.nav.reports },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <select
              value={selectedAnalysisId}
              onChange={(e) => setSelectedAnalysisId(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={analyses.length === 0 || generating}
            >
              {analyses.length === 0 ? (
                <option value="">{t.reports.noAnalysesAvailable}</option>
              ) : (
                analyses.map((analysis) => {
                  const label =
                    analysis.analysis_scope === 'combined'
                      ? `Combined • ${formatDate(analysis.created_at, language)}`
                      : `${monthName(analysis.period_month ?? 1, language)} ${analysis.period_year ?? ''} • ${formatDate(analysis.created_at, language)}`;
                  return (
                    <option key={analysis.id} value={analysis.id}>
                      {label}
                    </option>
                  );
                })
              )}
            </select>
            <Button onClick={handleGenerate} loading={generating} disabled={analyses.length === 0 || !selectedAnalysisId}>
              <Plus className="h-4 w-4" />
              {t.reports.generate}
            </Button>
          </div>
        }
      />

      {/* Navigation tabs */}
      <BusinessTabs businessId={id} activeTab="reports" />

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

      {reports.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center py-14 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/30 mb-4">
              <FileText className="h-8 w-8 text-blue-500 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              {t.reports.noReportsYet}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
              {analyses.length === 0
                ? t.reports.noAnalysisForReport
                : t.reports.selectAnalysisHint}
            </p>
            <Button className="mt-5" onClick={handleGenerate} loading={generating} disabled={analyses.length === 0 || !selectedAnalysisId}>
              <Plus className="h-4 w-4" />
              {t.reports.generateFirst}
            </Button>
          </div>
        </Card>
      ) : (
        <Card title={`Reports (${reports.length})`}>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800 -mx-6 -mb-5">
            {reports.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-50 capitalize">
                      {r.report_type.replace(/_/g, ' ')} {t.reports.report}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {t.reports.generated} {formatDate(r.created_at, language)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownload(r.id)}
                  disabled={downloadingReportId === r.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download className="h-3.5 w-3.5" />
                  {downloadingReportId === r.id ? t.reports.downloading : t.reports.download}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
