'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Building2, TrendingUp, AlertTriangle, Rocket, DollarSign, BarChart3, FileText } from 'lucide-react';
import { businessApi, analysisApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RiskIndicator } from '@/components/dashboard/RiskIndicator';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatDate } from '@/lib/utils';
import type { Business, RiskAnalysis } from '@/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [latestAnalyses, setLatestAnalyses] = useState<
    Record<string, RiskAnalysis>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await businessApi.list();
        setBusinesses(data);
        const analyses: Record<string, RiskAnalysis> = {};
        await Promise.all(
          data.map(async (b) => {
            try {
              const { data: list } = await analysisApi.list(b.id);
              if (list.length > 0) {
                const sorted = [...list].sort(
                  (a, b2) =>
                    new Date(b2.created_at).getTime() -
                    new Date(a.created_at).getTime()
                );
                analyses[b.id] = sorted[0];
              }
            } catch {
              // no analysis yet
            }
          })
        );
        setLatestAnalyses(analyses);
      } catch {
        // handle error silently
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const safeCount = Object.values(latestAnalyses).filter(
    (a) => a.risk_level === 'safe'
  ).length;
  const atRiskCount = Object.values(latestAnalyses).filter(
    (a) => a.risk_level !== 'safe'
  ).length;

  return (
    <div>
      <PageHeader
        title={`${t.dashboard.welcomeBack}${user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}! 👋`}
        description={t.dashboard.overview}
        actions={
          <Link
            href="/businesses/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 dark:bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t.dashboard.addBusiness}
          </Link>
        }
      />

      {/* Quick stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30">
              <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                {businesses.length}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t.dashboard.totalBusinesses}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/30">
              <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{safeCount}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t.dashboard.safeBusinesses}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/30">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">{atRiskCount}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t.dashboard.atRisk}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Businesses */}
      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : businesses.length === 0 ? (
        <div className="space-y-6">
          {/* Welcome banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-900 p-8 text-white">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Rocket className="h-6 w-6" />
                <span className="text-sm font-medium uppercase tracking-wide opacity-80">{t.dashboard.gettingStarted}</span>
              </div>
              <h2 className="text-2xl font-bold">{t.dashboard.welcomeTitle}</h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-blue-100">
                {t.dashboard.welcomeText}
              </p>
            </div>
            {/* Decorative circles */}
            <div className="absolute -right-6 -top-6 h-40 w-40 rounded-full bg-white/10" />
            <div className="absolute -bottom-8 -right-2 h-28 w-28 rounded-full bg-white/5" />
          </div>

          {/* Step cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/20 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50 mb-3">
                <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-1">{t.dashboard.step} 1</p>
              <h3 className="font-semibold text-gray-900 dark:text-gray-50">{t.dashboard.step1Title}</h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t.dashboard.step1Text}</p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 text-center opacity-60">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 mb-3">
                <DollarSign className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">{t.dashboard.step} 2</p>
              <h3 className="font-semibold text-gray-900 dark:text-gray-50">{t.dashboard.step2Title}</h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t.dashboard.step2Text}</p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 text-center opacity-60">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 mb-3">
                <BarChart3 className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">{t.dashboard.step} 3</p>
              <h3 className="font-semibold text-gray-900 dark:text-gray-50">{t.dashboard.step3Title}</h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t.dashboard.step3Text}</p>
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/businesses/new"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 dark:bg-blue-500 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 dark:hover:bg-blue-600 shadow-lg shadow-blue-600/25 transition-all"
            >
              <Plus className="h-4 w-4" />
              {t.dashboard.addFirstBusiness}
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {businesses.map((b) => {
            const analysis = latestAnalyses[b.id];
            return (
              <Link
                key={b.id}
                href={`/businesses/${b.id}`}
                className="group block rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm dark:shadow-none transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {b.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {b.industry} · {b.country}
                    </p>
                  </div>
                  {analysis && (
                    <RiskIndicator riskLevel={analysis.risk_level} />
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-gray-400 dark:text-gray-500">
                  <span>{b.num_employees} {t.businesses.employees.toLowerCase()}</span>
                  {analysis && (
                    <span className="font-medium text-gray-600 dark:text-gray-300">
                      {t.businesses.riskScore}: {Math.round(analysis.risk_score)}
                    </span>
                  )}
                </div>
                {analysis && (
                  <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                    {t.dashboard.latestAnalysis}: {formatDate(analysis.created_at, language)}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
