'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Building2, TrendingUp, AlertTriangle, Rocket, DollarSign, BarChart3, Shield, ArrowUpRight } from 'lucide-react';
import { businessApi, analysisApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Card } from '@/components/ui/Card';
import { RiskIndicator } from '@/components/dashboard/RiskIndicator';
import { formatCurrency, formatDate, scoreColor } from '@/lib/utils';
import type { Business, RiskAnalysis } from '@/types';

function StatCard({ icon: Icon, label, value, color, subtitle }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 transition-all hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">{value}</p>
      <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{label}</p>
      {subtitle && <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-64 rounded-lg bg-gray-200 dark:bg-gray-800" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5">
            <div className="h-9 w-9 rounded-lg bg-gray-100 dark:bg-gray-800 mb-3" />
            <div className="h-7 w-16 rounded bg-gray-200 dark:bg-gray-800 mb-1" />
            <div className="h-4 w-24 rounded bg-gray-100 dark:bg-gray-800" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 h-48" />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [latestAnalyses, setLatestAnalyses] = useState<Record<string, RiskAnalysis>>({});
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
      } catch {
        // handle error
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <DashboardSkeleton />;

  const analysisValues = Object.values(latestAnalyses);
  const safeCount = analysisValues.filter((a) => a.risk_level === 'safe' || a.risk_level === 'low').length;
  const atRiskCount = analysisValues.filter((a) => a.risk_level !== 'safe' && a.risk_level !== 'low').length;
  const avgScore = analysisValues.length > 0
    ? Math.round(analysisValues.reduce((sum, a) => sum + a.risk_score, 0) / analysisValues.length)
    : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
            {t.dashboard.welcomeBack}{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t.dashboard.overview}</p>
        </div>
        <Link
          href="/businesses/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 dark:bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 dark:hover:bg-blue-600 transition-all shadow-sm hover:shadow-md"
        >
          <Plus className="h-4 w-4" />
          {t.dashboard.addBusiness}
        </Link>
      </div>

      {businesses.length === 0 ? (
        /* First-time user experience */
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-700 dark:to-indigo-900 p-8 text-white">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Rocket className="h-5 w-5" />
                <span className="text-sm font-medium uppercase tracking-wide opacity-80">{t.dashboard.gettingStarted}</span>
              </div>
              <h2 className="text-2xl font-bold">{t.dashboard.welcomeTitle}</h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-blue-100">{t.dashboard.welcomeText}</p>
            </div>
            <div className="absolute -right-6 -top-6 h-40 w-40 rounded-full bg-white/10" />
            <div className="absolute -bottom-8 -right-2 h-28 w-28 rounded-full bg-white/5" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50 mb-3">
                <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-1">{t.dashboard.step} 1</p>
              <h3 className="font-semibold text-gray-900 dark:text-gray-50">{t.dashboard.step1Title}</h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t.dashboard.step1Text}</p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-center opacity-60">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 mb-3">
                <DollarSign className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">{t.dashboard.step} 2</p>
              <h3 className="font-semibold text-gray-900 dark:text-gray-50">{t.dashboard.step2Title}</h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t.dashboard.step2Text}</p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-center opacity-60">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 mb-3">
                <BarChart3 className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">{t.dashboard.step} 3</p>
              <h3 className="font-semibold text-gray-900 dark:text-gray-50">{t.dashboard.step3Title}</h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t.dashboard.step3Text}</p>
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/businesses/new"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 shadow-lg shadow-blue-600/25 transition-all"
            >
              <Plus className="h-4 w-4" />
              {t.dashboard.addFirstBusiness}
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Building2}
              label={t.dashboard.totalBusinesses}
              value={businesses.length}
              color="bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"
            />
            <StatCard
              icon={Shield}
              label={t.dashboard.safeBusinesses}
              value={safeCount}
              color="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              icon={AlertTriangle}
              label={t.dashboard.atRisk}
              value={atRiskCount}
              color="bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400"
            />
            <StatCard
              icon={BarChart3}
              label="Avg. Risk Score"
              value={avgScore !== null ? `${avgScore}/100` : '—'}
              color="bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400"
              subtitle={avgScore !== null ? (avgScore <= 30 ? 'Healthy portfolio' : avgScore <= 50 ? 'Needs attention' : 'High risk portfolio') : 'Run analyses to see'}
            />
          </div>

          {/* Business cards */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">{t.businesses.title}</h2>
              <Link href="/businesses" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center gap-1">
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {businesses.slice(0, 6).map((b) => {
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
                    {analysis && (
                      <div className="mt-4 flex items-center gap-3">
                        <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
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
          </div>
        </>
      )}
    </div>
  );
}
