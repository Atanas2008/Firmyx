'use client';

import { Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';
import { generateAllInsights } from '@/lib/aiInsights';
import { useLanguage } from '@/hooks/useLanguage';
import { useTranslation } from '@/hooks/useTranslation';
import type { RiskAnalysis } from '@/types';

interface AiFinancialSummaryProps {
  analysis: RiskAnalysis;
}

export function AiFinancialSummary({ analysis }: AiFinancialSummaryProps) {
  const { t } = useLanguage();
  const insights = generateAllInsights(analysis);

  // Translate dynamic AI-generated content
  const allTexts = [insights.summary, ...insights.positiveIndicators, ...insights.riskIndicators];
  const { translated } = useTranslation(allTexts);
  const tSummary = translated[0] ?? insights.summary;
  const tPositive = translated.slice(1, 1 + insights.positiveIndicators.length);
  const tRisk = translated.slice(1 + insights.positiveIndicators.length);

  const verdictStyles = {
    strong:   { bg: 'bg-emerald-50 dark:bg-emerald-900/30', border: 'border-emerald-200 dark:border-emerald-800', badge: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300', dot: 'bg-emerald-500',  label: t.aiSummary.strong },
    moderate: { bg: 'bg-amber-50 dark:bg-amber-900/30',   border: 'border-amber-200 dark:border-amber-800',   badge: 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300',   dot: 'bg-amber-500',    label: t.aiSummary.moderate },
    weak:     { bg: 'bg-red-50 dark:bg-red-900/30',     border: 'border-red-200 dark:border-red-800',     badge: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300',       dot: 'bg-red-500',      label: t.aiSummary.needsAttention },
  };

  const style = verdictStyles[insights.overallVerdict];

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t.aiSummary.title}
          </span>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
          {style.label}
        </span>
      </div>

      {/* Narrative */}
      <div className={`rounded-xl border p-4 ${style.bg} ${style.border}`}>
        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{tSummary}</p>
      </div>

      {/* Positive / Risk split */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Positives */}
        {insights.positiveIndicators.length > 0 && (
          <div className="rounded-xl border border-emerald-100 dark:border-emerald-800 bg-white dark:bg-gray-900 p-4">
            <div className="mb-2 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                {t.aiSummary.positiveIndicators}
              </span>
            </div>
            <ul className="space-y-1.5">
              {tPositive.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                  <p className="text-xs text-gray-600 leading-relaxed">{item}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risk factors */}
        {insights.riskIndicators.length > 0 && (
          <div className="rounded-xl border border-red-100 dark:border-red-800 bg-white dark:bg-gray-900 p-4">
            <div className="mb-2 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
              <span className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">
                {t.aiSummary.riskIndicators}
              </span>
            </div>
            <ul className="space-y-1.5">
              {tRisk.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-400" />
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{item}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* All clear state */}
        {insights.riskIndicators.length === 0 && (
          <div className="rounded-xl border border-emerald-100 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 p-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <p className="text-xs text-emerald-700 dark:text-emerald-300">{t.aiSummary.noRiskIndicators}</p>
          </div>
        )}
      </div>
    </div>
  );
}
