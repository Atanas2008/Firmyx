'use client';

import { FileText, Briefcase } from 'lucide-react';
import { generateAllInsights } from '@/lib/aiInsights';
import { useLanguage } from '@/hooks/useLanguage';
import { useTranslation } from '@/hooks/useTranslation';
import type { RiskAnalysis } from '@/types';

interface ExecutiveSummaryCardProps {
  analysis: RiskAnalysis;
  businessName?: string;
}

export function ExecutiveSummaryCard({ analysis, businessName }: ExecutiveSummaryCardProps) {
  const { language, t } = useLanguage();
  const insights = generateAllInsights(analysis);
  const { translated: translatedSummary } = useTranslation([insights.executiveSummary]);

  const verdictStyles = {
    strong:   { accent: 'border-l-emerald-500', tagBg: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',  label: t.executive.positionStrong       },
    moderate: { accent: 'border-l-amber-500',   tagBg: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',        label: t.executive.positionModerate     },
    weak:     { accent: 'border-l-red-500',     tagBg: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',              label: t.executive.positionWeak },
  };

  const style = verdictStyles[insights.overallVerdict];

  // Formatted date for the report header
  const reportDate = new Date(analysis.created_at).toLocaleDateString(language === 'bg' ? 'bg-BG' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Briefcase className="h-4 w-4 text-gray-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t.executive.title}
            </span>
          </div>
          {businessName && (
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{businessName}</p>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t.executive.asOf} {reportDate}</p>
        </div>
        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap ${style.tagBg}`}>
          {style.label}
        </span>
      </div>

      {/* Executive text body */}
      <div className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 border-l-4 ${style.accent}`}>
        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{translatedSummary[0] || insights.executiveSummary}</p>
      </div>

      {/* Scorecard strip */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-hidden">
        <div className="px-4 py-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t.executive.riskScore}</p>
          <p className="mt-1 text-xl font-bold text-gray-800 dark:text-gray-100">{analysis.risk_score.toFixed(0)}<span className="text-xs font-normal text-gray-400 dark:text-gray-500">/100</span></p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t.executive.zScore}</p>
          <p className="mt-1 text-xl font-bold text-gray-800 dark:text-gray-100">{analysis.altman_z_score.toFixed(2)}</p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t.executive.profitMargin}</p>
          <p className="mt-1 text-xl font-bold text-gray-800 dark:text-gray-100">{analysis.profit_margin.toFixed(1)}<span className="text-xs font-normal text-gray-400 dark:text-gray-500">%</span></p>
        </div>
      </div>

      {/* Print / export hint */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
        <FileText className="h-3.5 w-3.5" />
        <span>{t.executive.printHint}</span>
      </div>
    </div>
  );
}
