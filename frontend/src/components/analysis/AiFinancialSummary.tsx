'use client';

import { Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';
import { generateAllInsights } from '@/lib/aiInsights';
import type { RiskAnalysis } from '@/types';

interface AiFinancialSummaryProps {
  analysis: RiskAnalysis;
}

export function AiFinancialSummary({ analysis }: AiFinancialSummaryProps) {
  const insights = generateAllInsights(analysis);

  const verdictStyles = {
    strong:   { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500',  label: 'Strong' },
    moderate: { bg: 'bg-amber-50',   border: 'border-amber-200',   badge: 'bg-amber-100 text-amber-800',   dot: 'bg-amber-500',    label: 'Moderate' },
    weak:     { bg: 'bg-red-50',     border: 'border-red-200',     badge: 'bg-red-100 text-red-800',       dot: 'bg-red-500',      label: 'Needs Attention' },
  };

  const style = verdictStyles[insights.overallVerdict];

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            AI Financial Summary
          </span>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
          {style.label}
        </span>
      </div>

      {/* Narrative */}
      <div className={`rounded-xl border p-4 ${style.bg} ${style.border}`}>
        <p className="text-sm text-gray-700 leading-relaxed">{insights.summary}</p>
      </div>

      {/* Positive / Risk split */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Positives */}
        {insights.positiveIndicators.length > 0 && (
          <div className="rounded-xl border border-emerald-100 bg-white p-4">
            <div className="mb-2 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Positive Indicators
              </span>
            </div>
            <ul className="space-y-1.5">
              {insights.positiveIndicators.map((item, i) => (
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
          <div className="rounded-xl border border-red-100 bg-white p-4">
            <div className="mb-2 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
              <span className="text-xs font-semibold uppercase tracking-wide text-red-700">
                Risk Indicators
              </span>
            </div>
            <ul className="space-y-1.5">
              {insights.riskIndicators.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-400" />
                  <p className="text-xs text-gray-600 leading-relaxed">{item}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* All clear state */}
        {insights.riskIndicators.length === 0 && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-600 flex-shrink-0" />
            <p className="text-xs text-emerald-700">No material risk indicators detected at this time.</p>
          </div>
        )}
      </div>
    </div>
  );
}
