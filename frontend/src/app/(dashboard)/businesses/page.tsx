'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Building2, MapPin, Users } from 'lucide-react';
import { businessApi, analysisApi } from '@/lib/api';
import { useLanguage } from '@/hooks/useLanguage';
import { PageHeader } from '@/components/layout/PageHeader';
import { RiskIndicator } from '@/components/dashboard/RiskIndicator';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Card } from '@/components/ui/Card';
import type { Business, RiskAnalysis } from '@/types';

export default function BusinessesPage() {
  const { t } = useLanguage();
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
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div>
      <PageHeader
        title={t.businesses.title}
        description={t.businesses.addNewDescription}
        actions={
          <Link
            href="/businesses/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t.dashboard.addBusiness}
          </Link>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : businesses.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center py-14 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/30 mb-4">
              <Building2 className="h-8 w-8 text-blue-500 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
              {t.businesses.noBusinessesYet}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
              {t.businesses.addFirstToStart}
            </p>
            <Link
              href="/businesses/new"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              {t.dashboard.addFirstBusiness}
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {businesses.map((b) => {
            const analysis = latestAnalyses[b.id];
            return (
              <Link
                key={b.id}
                href={`/businesses/${b.id}`}
                className="group block rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm dark:shadow-none transition-all hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                    <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  {analysis ? (
                    <RiskIndicator riskLevel={analysis.risk_level} />
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                      {t.analysis.noAnalysisYet}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {b.name}
                </h3>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{b.industry}</p>
                <div className="mt-4 flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {b.country}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {b.num_employees} {t.businesses.employees.toLowerCase()}
                  </span>
                </div>
                {analysis && (
                  <div className="mt-3 border-t border-gray-100 dark:border-gray-800 pt-3 text-xs text-gray-500 dark:text-gray-400 flex justify-between">
                    <span>{t.businesses.riskScore}</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-200">
                      {Math.round(analysis.risk_score)} / 100
                    </span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
