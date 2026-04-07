'use client';

import { ShieldCheck, AlertCircle, Info } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import type { RiskAnalysis } from '@/types';

interface DataConfidenceProps {
  analysis: RiskAnalysis;
}

const TRACKED_FIELDS = ['total_assets', 'current_liabilities', 'ebit', 'retained_earnings'] as const;

const FIELD_LABELS: Record<string, string> = {
  total_assets: 'Total Assets',
  current_liabilities: 'Current Liabilities',
  ebit: 'EBIT',
  retained_earnings: 'Retained Earnings',
};

type ConfidenceLevel = 'high' | 'medium' | 'low';

function getConfidenceLevel(providedCount: number, total: number): ConfidenceLevel {
  if (providedCount === total) return 'high';
  if (providedCount >= total / 2) return 'medium';
  return 'low';
}

const CONFIDENCE_STYLES: Record<ConfidenceLevel, {
  bg: string; border: string; text: string; dot: string; icon: typeof ShieldCheck;
}> = {
  high: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    icon: ShieldCheck,
  },
  medium: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
    icon: Info,
  },
  low: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-700 dark:text-red-300',
    dot: 'bg-red-500',
    icon: AlertCircle,
  },
};

/**
 * Shows users which balance-sheet fields were provided vs estimated by fallback.
 * Builds trust by being transparent about data quality — enterprise/audit essential.
 */
export function DataConfidence({ analysis }: DataConfidenceProps) {
  const { t } = useLanguage();
  const sources = analysis.calculation_sources ?? {};

  const fields = TRACKED_FIELDS.map((key) => ({
    key,
    label: FIELD_LABELS[key],
    isProvided: sources[key] === 'provided',
  }));

  const providedCount = fields.filter((f) => f.isProvided).length;
  // Prefer authoritative backend confidence_level when available
  const backendConfidence = analysis.confidence_level as ConfidenceLevel | null | undefined;
  const level: ConfidenceLevel = (backendConfidence && backendConfidence in CONFIDENCE_STYLES)
    ? backendConfidence
    : getConfidenceLevel(providedCount, TRACKED_FIELDS.length);
  const style = CONFIDENCE_STYLES[level];
  const Icon = style.icon;

  const confidenceLabels: Record<ConfidenceLevel, string> = {
    high: t.enterprise.highConfidence,
    medium: t.enterprise.mediumConfidence,
    low: t.enterprise.lowConfidence,
  };

  return (
    <div className={`rounded-xl border ${style.border} ${style.bg} p-4`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${style.text}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <p className={`text-xs font-bold uppercase tracking-wider ${style.text}`}>
              {t.enterprise.dataConfidence}
            </p>
            <span className={`text-xs font-semibold ${style.text}`}>
              {t.enterprise.fieldsProvided
                .replace('{count}', String(providedCount))
                .replace('{total}', String(TRACKED_FIELDS.length))}
            </span>
          </div>

          {/* Field indicators */}
          <div className="flex flex-wrap gap-2 mb-2">
            {fields.map((f) => (
              <span
                key={f.key}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${
                  f.isProvided
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${f.isProvided ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                {f.label}
                <span className="text-[10px] opacity-75">
                  {f.isProvided ? t.enterprise.provided : t.enterprise.estimated}
                </span>
              </span>
            ))}
          </div>

          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {(analysis.confidence_explanation as string) || confidenceLabels[level]}
          </p>
        </div>
      </div>
    </div>
  );
}
