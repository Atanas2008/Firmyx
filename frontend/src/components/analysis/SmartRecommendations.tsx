'use client';

import Link from 'next/link';
import {
  AlertTriangle, TrendingUp, DollarSign, Shield, Zap, Activity, ArrowRight, Clock,
} from 'lucide-react';
import { generateRecommendations } from '@/lib/aiInsights';
import { useLanguage } from '@/hooks/useLanguage';
import { useTranslation } from '@/hooks/useTranslation';
import type { RiskAnalysis } from '@/types';
import type { Recommendation, Priority } from '@/lib/aiInsights';

interface SmartRecommendationsProps {
  analysis: RiskAnalysis;
  scenarioHref?: string;
}

// ─── Icons by category ────────────────────────────────────────────────────────
function CategoryIcon({ category }: { category: Recommendation['category'] }) {
  const cls = 'h-4 w-4 flex-shrink-0';
  switch (category) {
    case 'Liquidity':     return <Shield className={cls} />;
    case 'Leverage':      return <DollarSign className={cls} />;
    case 'Profitability': return <Zap className={cls} />;
    case 'Revenue':       return <TrendingUp className={cls} />;
    case 'Stability':     return <Activity className={cls} />;
    default:              return <AlertTriangle className={cls} />;
  }
}

// ─── Priority badge ───────────────────────────────────────────────────────────
const PRIORITY_STYLES: Record<Priority, string> = {
  High:   'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 ring-1 ring-red-200 dark:ring-red-800',
  Medium: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800',
  Low:    'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800',
};

const ICON_BG: Record<Priority, string> = {
  High:   'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  Medium: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  Low:    'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
};

// ─── Component ────────────────────────────────────────────────────────────────
export function SmartRecommendations({ analysis, scenarioHref }: SmartRecommendationsProps) {
  const { t } = useLanguage();
  const recommendations = generateRecommendations(analysis);
  const recTexts = recommendations.map((r) => r.text);
  const { translated: translatedTexts } = useTranslation(recTexts);

  if (recommendations.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 p-5 text-center">
        <TrendingUp className="mx-auto mb-2 h-6 w-6 text-emerald-500" />
        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{t.recommendations.noCriticalSmart}</p>
        <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
          {t.recommendations.financiallyHealthy}
        </p>
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {recommendations.map((rec, i) => (
        <li
          key={i}
          className="flex flex-col sm:flex-row items-start gap-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm dark:shadow-none"
        >
          {/* Icon circle */}
          <span
            className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${ICON_BG[rec.priority]}`}
          >
            <CategoryIcon category={rec.category} />
          </span>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-50">{rec.title}</span>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[rec.priority]}`}
              >
                {rec.priority} {t.recommendations.priority}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                <Clock className="h-3 w-3" />
                {rec.timeframe}
              </span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{translatedTexts[i] ?? rec.text}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
              <span>
                <span className="font-medium text-gray-600 dark:text-gray-300">{t.recommendations.current}:</span>{' '}
                {rec.current_value}
              </span>
              <span>
                <span className="font-medium text-gray-600 dark:text-gray-300">{t.recommendations.target}:</span>{' '}
                {rec.target_value}
              </span>
              <span>
                <span className="font-medium text-gray-600 dark:text-gray-300">{t.recommendations.impact}:</span>{' '}
                {rec.estimated_impact}
              </span>
              {scenarioHref && (
                <Link
                  href={scenarioHref}
                  className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors py-1 sm:py-0"
                >
                  {t.conversion.simulateThis}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
