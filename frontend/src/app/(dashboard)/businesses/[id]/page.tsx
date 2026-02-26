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
  BarChart3,
  FileText,
  TrendingUp,
  Trash2,
} from 'lucide-react';
import { businessApi, analysisApi } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RiskIndicator } from '@/components/dashboard/RiskIndicator';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { RecommendationsList } from '@/components/analysis/RecommendationsList';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Business, RiskAnalysis } from '@/types';

export default function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [latestAnalysis, setLatestAnalysis] = useState<RiskAnalysis | null>(null);
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
        setError('Failed to load business details.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return <LoadingSpinner fullPage />;
  if (error || !business) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
        {error || 'Business not found.'}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={business.name}
        description={`${business.industry} · ${business.country}`}
        breadcrumbs={[
          { label: 'Businesses', href: '/businesses' },
          { label: business.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {latestAnalysis && (
              <RiskIndicator riskLevel={latestAnalysis.risk_level} />
            )}
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
            className="flex items-center gap-1.5 border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-gray-500 hover:border-blue-300 hover:text-gray-700 transition-colors"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Business Details */}
        <div className="lg:col-span-1 space-y-4">
          <Card title="Business Info">
            <dl className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div>
                  <dt className="text-gray-500">Industry</dt>
                  <dd className="font-medium text-gray-900">{business.industry}</dd>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div>
                  <dt className="text-gray-500">Country</dt>
                  <dd className="font-medium text-gray-900">{business.country}</dd>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Users className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div>
                  <dt className="text-gray-500">Employees</dt>
                  <dd className="font-medium text-gray-900">{business.num_employees}</dd>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div>
                  <dt className="text-gray-500">Years Operating</dt>
                  <dd className="font-medium text-gray-900">{business.years_operating}</dd>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <DollarSign className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div>
                  <dt className="text-gray-500">Monthly Fixed Costs</dt>
                  <dd className="font-medium text-gray-900">
                    {formatCurrency(business.monthly_fixed_costs)}
                  </dd>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div>
                  <dt className="text-gray-500">Added</dt>
                  <dd className="font-medium text-gray-900">
                    {formatDate(business.created_at)}
                  </dd>
                </div>
              </div>
            </dl>
          </Card>

          {/* Quick actions */}
          <Card title="Quick Actions">
            <div className="space-y-2">
              <Link
                href={`/businesses/${id}/financials`}
                className="flex w-full items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <DollarSign className="h-4 w-4 text-blue-500" />
                Add Financial Data
              </Link>
              <Link
                href={`/businesses/${id}/analysis`}
                className="flex w-full items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <TrendingUp className="h-4 w-4 text-blue-500" />
                Run Risk Analysis
              </Link>
              <Link
                href={`/businesses/${id}/reports`}
                className="flex w-full items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <FileText className="h-4 w-4 text-blue-500" />
                Generate Report
              </Link>
            </div>
          </Card>
        </div>

        {/* Risk Summary */}
        <div className="lg:col-span-2 space-y-4">
          {latestAnalysis ? (
            <>
              <Card title="Latest Risk Summary">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-5xl font-bold" style={{
                      color: latestAnalysis.risk_score <= 30 ? '#10b981'
                        : latestAnalysis.risk_score <= 60 ? '#f59e0b'
                        : '#ef4444'
                    }}>
                      {Math.round(latestAnalysis.risk_score)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Risk Score</p>
                  </div>
                  <div className="flex-1">
                    <div className="mb-2">
                      <RiskIndicator riskLevel={latestAnalysis.risk_level} />
                    </div>
                    {latestAnalysis.risk_explanation && (
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {latestAnalysis.risk_explanation}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-gray-400">
                      Analyzed on {formatDate(latestAnalysis.created_at)}
                    </p>
                  </div>
                </div>
              </Card>

              <Card title="Top Recommendations">
                <RecommendationsList
                  recommendations={latestAnalysis.recommendations.slice(0, 3)}
                />
                {latestAnalysis.recommendations.length > 3 && (
                  <Link
                    href={`/businesses/${id}/analysis`}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View all {latestAnalysis.recommendations.length} recommendations →
                  </Link>
                )}
              </Card>
            </>
          ) : (
            <Card>
              <div className="flex flex-col items-center py-10 text-center">
                <BarChart3 className="mb-4 h-12 w-12 text-gray-300" />
                <h3 className="text-base font-semibold text-gray-700">
                  No risk analysis yet
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Add financial data and run an analysis to see your risk score.
                </p>
                <Link
                  href={`/businesses/${id}/financials`}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  <DollarSign className="h-4 w-4" />
                  Add Financial Data
                </Link>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
