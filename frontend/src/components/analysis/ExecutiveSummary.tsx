'use client';

import { generateAllInsights } from '@/lib/aiInsights';
import { useLanguage } from '@/hooks/useLanguage';
import type { RiskAnalysis } from '@/types';

interface ExecutiveSummaryProps {
  analysis: RiskAnalysis;
  businessName?: string;
}

const VERDICT_STYLES = {
  strong: 'border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10',
  moderate: 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/10',
  weak: 'border-l-red-500 bg-red-50/50 dark:bg-red-900/10',
} as const;

const VERDICT_BADGE = {
  strong: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  moderate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  weak: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
} as const;

export function ExecutiveSummary({ analysis, businessName }: ExecutiveSummaryProps) {
  const { t } = useLanguage();
  const insights = generateAllInsights(analysis);
  const verdict = insights.overallVerdict;

  const verdictLabels: Record<typeof verdict, string> = {
    strong: t.executive.positionStrong,
    moderate: t.executive.positionModerate,
    weak: t.executive.positionWeak,
  };

  return (
    <div className="space-y-3">
      {/* Header line */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">{t.decision.executiveSummary}</h3>
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${VERDICT_BADGE[verdict]}`}>
            {verdictLabels[verdict]}
          </span>
        </div>
        {businessName && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {businessName} · {new Date(analysis.created_at).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Summary narrative — single block, CFO tone */}
      <div className={`rounded-lg border-l-4 p-4 ${VERDICT_STYLES[verdict]}`}>
        <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          {insights.executiveSummary}
        </p>
      </div>
    </div>
  );
}
