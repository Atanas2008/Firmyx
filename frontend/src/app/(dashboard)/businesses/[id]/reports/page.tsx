'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  FileText,
  Download,
  Plus,
  Building2,
  DollarSign,
  BarChart3,
} from 'lucide-react';
import { analysisApi, businessApi, reportApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatDate, monthName } from '@/lib/utils';
import type { Business, Report, RiskAnalysis } from '@/types';

export default function ReportsPage() {
  const { id } = useParams<{ id: string }>();
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
      const analysisData = [...aRes.data] as RiskAnalysis[];
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
        [...rRes.data].sort(
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
      setSuccessMsg('Report generated successfully!');
      await loadData();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Failed to generate report. Ensure an analysis exists.';
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
      link.download = `firmshield-report-${reportId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? 'Failed to download report.';
      setErrorMsg(msg);
    } finally {
      setDownloadingReportId(null);
    }
  }

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div>
      <PageHeader
        title="Reports"
        description={business?.name ?? ''}
        breadcrumbs={[
          { label: 'Businesses', href: '/businesses' },
          { label: business?.name ?? 'Business', href: `/businesses/${id}` },
          { label: 'Reports' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <select
              value={selectedAnalysisId}
              onChange={(e) => setSelectedAnalysisId(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={analyses.length === 0 || generating}
            >
              {analyses.length === 0 ? (
                <option value="">No analyses available</option>
              ) : (
                analyses.map((analysis) => {
                  const label =
                    analysis.analysis_scope === 'combined'
                      ? `Combined • ${formatDate(analysis.created_at)}`
                      : `${monthName(analysis.period_month ?? 1)} ${analysis.period_year ?? ''} • ${formatDate(analysis.created_at)}`;
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
              Generate Report
            </Button>
          </div>
        }
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
              href === `/businesses/${id}/reports`
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-blue-300 hover:text-gray-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </div>

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

      {reports.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center py-14 text-center">
            <FileText className="mb-4 h-14 w-14 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-700">
              No reports yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Select any available month analysis (or combined analysis) and generate a report.
            </p>
            <Button className="mt-4" onClick={handleGenerate} loading={generating} disabled={analyses.length === 0 || !selectedAnalysisId}>
              <Plus className="h-4 w-4" />
              Generate First Report
            </Button>
          </div>
        </Card>
      ) : (
        <Card title={`Reports (${reports.length})`}>
          <ul className="divide-y divide-gray-100 -mx-6 -mb-5">
            {reports.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {r.report_type.replace(/_/g, ' ')} Report
                    </p>
                    <p className="text-xs text-gray-400">
                      Generated {formatDate(r.created_at)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownload(r.id)}
                  disabled={downloadingReportId === r.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download className="h-3.5 w-3.5" />
                  {downloadingReportId === r.id ? 'Downloading...' : 'Download'}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
