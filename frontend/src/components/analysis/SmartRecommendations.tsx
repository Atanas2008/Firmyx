'use client';

import {
  AlertTriangle, TrendingUp, DollarSign, Shield, Zap, Activity,
} from 'lucide-react';
import { generateRecommendations } from '@/lib/aiInsights';
import type { RiskAnalysis } from '@/types';
import type { Recommendation, Priority } from '@/lib/aiInsights';

interface SmartRecommendationsProps {
  analysis: RiskAnalysis;
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
  High:   'bg-red-50 text-red-700 ring-1 ring-red-200',
  Medium: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  Low:    'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
};

const ICON_BG: Record<Priority, string> = {
  High:   'bg-red-50 text-red-600',
  Medium: 'bg-amber-50 text-amber-600',
  Low:    'bg-blue-50 text-blue-600',
};

// ─── Component ────────────────────────────────────────────────────────────────
export function SmartRecommendations({ analysis }: SmartRecommendationsProps) {
  const recommendations = generateRecommendations(analysis);

  if (recommendations.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <TrendingUp className="mx-auto mb-2 h-6 w-6 text-emerald-500" />
        <p className="text-sm font-semibold text-emerald-700">No critical action items</p>
        <p className="mt-1 text-xs text-emerald-600">
          All key financial metrics are within healthy ranges. Continue monitoring on a monthly basis.
        </p>
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {recommendations.map((rec, i) => (
        <li
          key={i}
          className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
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
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[rec.priority]}`}
              >
                {rec.priority} priority
              </span>
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                {rec.category}
              </span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{rec.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
