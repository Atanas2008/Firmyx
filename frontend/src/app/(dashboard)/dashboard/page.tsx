'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Building2, TrendingUp, AlertTriangle } from 'lucide-react';
import { businessApi, analysisApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RiskIndicator } from '@/components/dashboard/RiskIndicator';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatDate } from '@/lib/utils';
import type { Business, RiskAnalysis } from '@/types';

export default function DashboardPage() {
  const { user } = useAuth();
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
        title={`Welcome back${user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}! 👋`}
        description="Here's an overview of your monitored businesses."
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

      {/* Quick stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {businesses.length}
              </p>
              <p className="text-sm text-gray-500">Total Businesses</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-700">{safeCount}</p>
              <p className="text-sm text-gray-500">Safe Businesses</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-700">{atRiskCount}</p>
              <p className="text-sm text-gray-500">At Risk</p>
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
        <Card>
          <div className="flex flex-col items-center py-12 text-center">
            <Building2 className="mb-4 h-12 w-12 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-700">
              No businesses yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Add your first business to start monitoring financial health.
            </p>
            <Button className="mt-4">
              <Link href="/businesses/new" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Business
              </Link>
            </Button>
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
                className="group block rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {b.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {b.industry} · {b.country}
                    </p>
                  </div>
                  {analysis && (
                    <RiskIndicator riskLevel={analysis.risk_level} />
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
                  <span>{b.num_employees} employees</span>
                  {analysis && (
                    <span className="font-medium text-gray-600">
                      Score: {Math.round(analysis.risk_score)}
                    </span>
                  )}
                </div>
                {analysis && (
                  <p className="mt-2 text-xs text-gray-400">
                    Last analysis run: {formatDate(analysis.created_at)}
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
