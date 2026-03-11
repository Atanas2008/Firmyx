'use client';

import { FileText, Briefcase } from 'lucide-react';
import { generateAllInsights } from '@/lib/aiInsights';
import type { RiskAnalysis } from '@/types';

interface ExecutiveSummaryCardProps {
  analysis: RiskAnalysis;
  businessName?: string;
}

export function ExecutiveSummaryCard({ analysis, businessName }: ExecutiveSummaryCardProps) {
  const insights = generateAllInsights(analysis);

  const verdictStyles = {
    strong:   { accent: 'border-l-emerald-500', tagBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',  label: 'Financial Position: Strong'       },
    moderate: { accent: 'border-l-amber-500',   tagBg: 'bg-amber-50 text-amber-700 border-amber-200',        label: 'Financial Position: Moderate'     },
    weak:     { accent: 'border-l-red-500',     tagBg: 'bg-red-50 text-red-700 border-red-200',              label: 'Financial Position: Needs Review' },
  };

  const style = verdictStyles[insights.overallVerdict];

  // Formatted date for the report header
  const reportDate = new Date(analysis.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Briefcase className="h-4 w-4 text-gray-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Executive Summary
            </span>
          </div>
          {businessName && (
            <p className="text-sm font-semibold text-gray-800">{businessName}</p>
          )}
          <p className="text-xs text-gray-400 mt-0.5">As of {reportDate}</p>
        </div>
        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap ${style.tagBg}`}>
          {style.label}
        </span>
      </div>

      {/* Executive text body */}
      <div className={`rounded-xl border border-gray-200 bg-white p-5 border-l-4 ${style.accent}`}>
        <p className="text-sm text-gray-700 leading-relaxed">{insights.executiveSummary}</p>
      </div>

      {/* Scorecard strip */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
        <div className="px-4 py-3 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Risk Score</p>
          <p className="mt-1 text-xl font-bold text-gray-800">{analysis.risk_score.toFixed(0)}<span className="text-xs font-normal text-gray-400">/100</span></p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Z-Score</p>
          <p className="mt-1 text-xl font-bold text-gray-800">{analysis.altman_z_score.toFixed(2)}</p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Profit Margin</p>
          <p className="mt-1 text-xl font-bold text-gray-800">{analysis.profit_margin.toFixed(1)}<span className="text-xs font-normal text-gray-400">%</span></p>
        </div>
      </div>

      {/* Print / export hint */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <FileText className="h-3.5 w-3.5" />
        <span>Suitable for board presentations, investor reviews, and financial reports.</span>
      </div>
    </div>
  );
}
