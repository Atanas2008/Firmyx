'use client';

import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { computeScoreChange } from '@/lib/aiInsights';
import { useLanguage } from '@/hooks/useLanguage';
import type { RiskAnalysis } from '@/types';

interface RetentionBannerProps {
  analyses: RiskAnalysis[];
}

export function RetentionBanner({ analyses }: RetentionBannerProps) {
  const { t } = useLanguage();
  const change = computeScoreChange(analyses);

  if (!change || Math.abs(change.delta) < 1) return null;

  const absDelta = Math.abs(change.delta);

  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${
        change.improved
          ? 'border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20'
          : 'border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
      }`}
    >
      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
        change.improved ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-red-100 dark:bg-red-900/50'
      }`}>
        {change.improved ? (
          <ArrowDown className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <ArrowUp className="h-4 w-4 text-red-600 dark:text-red-400" />
        )}
      </div>
      <div>
        <p className={`font-semibold ${
          change.improved
            ? 'text-emerald-800 dark:text-emerald-200'
            : 'text-red-800 dark:text-red-200'
        }`}>
          {change.improved
            ? t.conversion.scoreImproved.replace('{points}', absDelta.toFixed(0))
            : t.conversion.scoreWorsened.replace('{points}', absDelta.toFixed(0))
          }
        </p>
        <p className={`text-xs mt-0.5 ${
          change.improved
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-red-600 dark:text-red-400'
        }`}>
          {change.improved
            ? t.conversion.keepImproving
            : t.conversion.takeAction
          }
        </p>
      </div>
    </div>
  );
}
