'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Building2,
  MapPin,
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  BarChart3,
  FileText,
} from 'lucide-react';
import { BusinessTabs } from '@/components/layout/BusinessTabs';
import { scoreColor } from '@/lib/utils';
import { businessApi, analysisApi } from '@/lib/api';
import { useLanguage } from '@/hooks/useLanguage';
import { useTranslation } from '@/hooks/useTranslation';
import { Card } from '@/components/ui/Card';
import { RiskIndicator } from '@/components/dashboard/RiskIndicator';
import { SmartRecommendations } from '@/components/analysis/SmartRecommendations';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Business, RiskAnalysis } from '@/types';

export default function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { language, t } = useLanguage();
  const [business, setBusiness] = useState<Business | null>(null);
  const [latestAnalysis, setLatestAnalysis] = useState<RiskAnalysis | null>(null);

  const explanationTexts = latestAnalysis?.risk_explanation ? [latestAnalysis.risk_explanation] : [];
  const { translated: translatedExplanation } = useTranslation(explanationTexts);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [bRes, aRes] = await Promise.all([
          businessApi.get(id),
          analysisApi.list(id),
        ]);
        setBusiness(bRes.data);
        if (aRes.data.length > 0) {
          const sorted = [...aRes.data].sort(
            (a, b) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setLatestAnalysis(sorted[0]);
        }
      } catch {
        setError(t.businesses.failedToLoad);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 rounded-lg bg-gray-200 dark:bg-gray-800" />
      <div className="h-4 w-64 rounded bg-gray-100 dark:bg-gray-800" />
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 pb-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-8 w-24 rounded-lg bg-gray-100 dark:bg-gray-800" />)}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 h-80" />
        <div className="lg:col-span-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 h-80" />
      </div>
    </div>
  );
  if (error || !business) {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
        {error || t.businesses.businessNotFound}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
          <Link href="/businesses" className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors">{t.nav.businesses}</Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-gray-100">{business.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">{business.name}</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{business.industry} · {business.country}</p>
          </div>
          {latestAnalysis && <RiskIndicator riskLevel={latestAnalysis.risk_level} />}
        </div>
      </div>

      {/* Navigation tabs */}
      <BusinessTabs businessId={id} activeTab="overview" />

      {/* Onboarding progress */}
      {!latestAnalysis && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 p-4">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">{t.onboardingExtra.setupProgress}</p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center">
                <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-200">{t.dashboard.step1Title}</span>
            </div>
            <div className="h-px flex-1 bg-blue-200 dark:bg-blue-800" />
            <Link href={`/businesses/${id}/financials`} className="flex items-center gap-2 group">
              <div className="h-6 w-6 rounded-full border-2 border-blue-400 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">2</div>
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:underline">{t.dashboard.step2Title}</span>
            </Link>
            <div className="h-px flex-1 bg-blue-200 dark:bg-blue-800" />
            <div className="flex items-center gap-2 opacity-50">
              <div className="h-6 w-6 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center text-xs font-bold text-gray-400">3</div>
              <span className="text-sm text-gray-400">{t.dashboard.step3Title}</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Business Details */}
        <div className="lg:col-span-1 space-y-4">
          <Card title={t.businesses.businessInfo}>
            <dl className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">{t.businesses.industry}</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-50">{business.industry}</dd>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">{t.businesses.country}</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-50">{business.country}</dd>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Users className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">{t.businesses.employees}</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-50">{business.num_employees}</dd>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">{t.businesses.yearsOperating}</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-50">{business.years_operating}</dd>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <DollarSign className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">{t.businesses.monthlyFixedCosts}</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-50">
                    {formatCurrency(business.monthly_fixed_costs, 'USD', language)}
                  </dd>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                <div>
                  <dt className="text-gray-500 dark:text-gray-400">{t.businesses.added}</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-50">
                    {formatDate(business.created_at, language)}
                  </dd>
                </div>
              </div>
            </dl>
          </Card>

          {/* Quick actions */}
          <Card title={t.businesses.quickActions}>
            <div className="space-y-2">
              <Link
                href={`/businesses/${id}/financials`}
                className="flex w-full items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <DollarSign className="h-4 w-4 text-blue-500" />
                {t.businesses.addFinancialData}
              </Link>
              <Link
                href={`/businesses/${id}/analysis`}
                className="flex w-full items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <TrendingUp className="h-4 w-4 text-blue-500" />
                {t.businesses.runRiskAnalysis}
              </Link>
              <Link
                href={`/businesses/${id}/reports`}
                className="flex w-full items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <FileText className="h-4 w-4 text-blue-500" />
                {t.businesses.generateReport}
              </Link>
            </div>
          </Card>
        </div>

        {/* Risk Summary */}
        <div className="lg:col-span-2 space-y-4">
          {latestAnalysis ? (
            <>
              <Card title={t.businesses.latestRiskSummary}>
                <div className="flex flex-col sm:flex-row items-start gap-6">
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative">
                      <svg width="120" height="120" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="48" fill="none" stroke="#e5e7eb" className="dark:[stroke:#1f2937]" strokeWidth="10" />
                        <circle
                          cx="60" cy="60" r="48" fill="none"
                          stroke={scoreColor(latestAnalysis.risk_score)}
                          strokeWidth="10" strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 48}
                          strokeDashoffset={2 * Math.PI * 48 - (latestAnalysis.risk_score / 100) * 2 * Math.PI * 48}
                          transform="rotate(-90 60 60)"
                          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold" style={{ color: scoreColor(latestAnalysis.risk_score) }}>
                          {Math.round(latestAnalysis.risk_score)}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">/100</span>
                      </div>
                    </div>
                    <RiskIndicator riskLevel={latestAnalysis.risk_level} />
                  </div>
                  <div className="flex-1 space-y-4">
                    {latestAnalysis.risk_explanation && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                        {translatedExplanation[0] || latestAnalysis.risk_explanation}
                      </p>
                    )}
                    {/* Key metrics pills */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Z-Score</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-50">{latestAnalysis.altman_z_score.toFixed(2)}</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Margin</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-50">{latestAnalysis.profit_margin.toFixed(1)}%</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Runway</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-50">
                          {latestAnalysis.burn_rate === 0 ? 'CF+' : latestAnalysis.cash_runway_months !== null ? `${latestAnalysis.cash_runway_months.toFixed(1)}mo` : t.common.notApplicable}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {t.businesses.analyzedOn} {formatDate(latestAnalysis.created_at, language)}
                    </p>
                  </div>
                </div>
              </Card>

              <Card title={t.businesses.topRecommendations}>
                <SmartRecommendations analysis={latestAnalysis} />
              </Card>
            </>
          ) : (
            <Card>
              <div className="flex flex-col items-center py-12 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/30 mb-4">
                  <BarChart3 className="h-7 w-7 text-blue-500 dark:text-blue-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">
                  {t.businesses.noRiskAnalysis}
                </h3>
                <p className="mt-1 max-w-xs text-sm text-gray-500 dark:text-gray-400">
                  {t.businesses.noRiskAnalysisText}
                </p>
                <Link
                  href={`/businesses/${id}/financials`}
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <DollarSign className="h-4 w-4" />
                  {t.businesses.addFinancialData}
                </Link>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
