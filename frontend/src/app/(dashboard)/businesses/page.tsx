'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Building2, MapPin, Users } from 'lucide-react';
import { businessApi, analysisApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { RiskIndicator } from '@/components/dashboard/RiskIndicator';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Card } from '@/components/ui/Card';
import type { Business, RiskAnalysis } from '@/types';

export default function BusinessesPage() {
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
        title="Businesses"
        description="Manage and monitor all your businesses."
        actions={
          <Link
            href="/businesses/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Business
          </Link>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : businesses.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center py-12 text-center">
            <Building2 className="mb-4 h-12 w-12 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-700">
              No businesses yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Add your first business to get started with risk monitoring.
            </p>
            <Link
              href="/businesses/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Business
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
                className="group block rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-blue-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 group-hover:bg-blue-100 transition-colors">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  {analysis ? (
                    <RiskIndicator riskLevel={analysis.risk_level} />
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                      No analysis
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {b.name}
                </h3>
                <p className="mt-0.5 text-sm text-gray-500">{b.industry}</p>
                <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {b.country}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {b.num_employees} employees
                  </span>
                </div>
                {analysis && (
                  <div className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-500 flex justify-between">
                    <span>Risk score</span>
                    <span className="font-semibold text-gray-700">
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
