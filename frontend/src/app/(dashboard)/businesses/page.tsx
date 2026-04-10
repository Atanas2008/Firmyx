'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Building2, MapPin, Users, Search } from 'lucide-react';
import { businessApi, analysisApi } from '@/lib/api';
import { useLanguage } from '@/hooks/useLanguage';
import { RiskIndicator } from '@/components/dashboard/RiskIndicator';
import { scoreColor } from '@/lib/utils';
import type { Business, RiskAnalysis } from '@/types';

function BusinessCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-gray-800" />
        <div className="h-5 w-16 rounded-full bg-gray-100 dark:bg-gray-800" />
      </div>
      <div className="h-5 w-32 rounded bg-gray-200 dark:bg-gray-800 mb-1" />
      <div className="h-4 w-24 rounded bg-gray-100 dark:bg-gray-800" />
      <div className="mt-4 flex gap-4">
        <div className="h-3 w-16 rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-3 w-16 rounded bg-gray-100 dark:bg-gray-800" />
      </div>
    </div>
  );
}

export default function BusinessesPage() {
  const { t } = useLanguage();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [latestAnalyses, setLatestAnalyses] = useState<Record<string, RiskAnalysis>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const { data } = await businessApi.list();
        const items = data.items ?? data;
        setBusinesses(items);
        const analyses: Record<string, RiskAnalysis> = {};
        await Promise.all(
          items.map(async (b) => {
            try {
              const { data: listData } = await analysisApi.list(b.id);
              const list = listData.items ?? listData;
              if (list.length > 0) {
                const sorted = [...list].sort(
                  (a, b2) => new Date(b2.created_at).getTime() - new Date(a.created_at).getTime()
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

  const filtered = businesses.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.industry.toLowerCase().includes(search.toLowerCase()) ||
    b.country.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">{t.businesses.title}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t.businesses.addNewDescription}</p>
        </div>
        <Link
          href="/businesses/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 dark:bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 dark:hover:bg-blue-600 transition-all shadow-sm hover:shadow-md"
        >
          <Plus className="h-4 w-4" />
          {t.dashboard.addBusiness}
        </Link>
      </div>

      {/* Search */}
      {!loading && businesses.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search businesses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-2.5 pl-10 pr-4 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
          />
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => <BusinessCardSkeleton key={i} />)}
        </div>
      ) : businesses.length === 0 ? (
        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-12">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/50 mb-4">
              <Building2 className="h-8 w-8 text-blue-500 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{t.businesses.noBusinessesYet}</h3>
            <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">{t.businesses.addFirstToStart}</p>
            <Link
              href="/businesses/new"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              {t.dashboard.addFirstBusiness}
            </Link>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">No businesses match &ldquo;{search}&rdquo;</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((b) => {
            const analysis = latestAnalyses[b.id];
            return (
              <Link
                key={b.id}
                href={`/businesses/${b.id}`}
                className="group rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 transition-all hover:shadow-lg hover:border-gray-200 dark:hover:border-gray-700 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                    <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  {analysis ? (
                    <RiskIndicator riskLevel={analysis.risk_level} />
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-gray-50 dark:bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                      {t.analysis.noAnalysisYet}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{b.name}</h3>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{b.industry}</p>
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{b.country}</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{b.num_employees}</span>
                </div>
                {analysis && (
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(analysis.risk_score, 100)}%`,
                          backgroundColor: scoreColor(analysis.risk_score),
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold tabular-nums" style={{ color: scoreColor(analysis.risk_score) }}>
                      {Math.round(analysis.risk_score)}
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
