'use client';

import { useMemo } from 'react';
import { Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { computeAccountability } from '@/lib/outcomeTracking';
import type { RiskAnalysis } from '@/types';

interface AccountabilityBannerProps {
  analysis: RiskAnalysis;
  businessId: string;
}

export function AccountabilityBanner({ analysis, businessId }: AccountabilityBannerProps) {
  const { t } = useLanguage();
  const ent = t.enterprise.outcome;
  const acc = useMemo(
    () => computeAccountability(analysis, businessId),
    [analysis, businessId]
  );

  // Don't show if no steps started
  if (acc.completedCount === 0 && acc.daysSinceStart === null) return null;
  // Don't show if all done
  if (acc.percentage === 100) return null;

  const isStale = acc.isStale;
  const variant = isStale ? 'warning' : 'default';

  const styles = {
    warning: {
      border: 'border-amber-200 dark:border-amber-800',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      icon: 'text-amber-500',
      title: 'text-amber-900 dark:text-amber-100',
      text: 'text-amber-700 dark:text-amber-300',
      bar: 'bg-amber-500',
      barBg: 'bg-amber-200 dark:bg-amber-800',
    },
    default: {
      border: 'border-blue-200 dark:border-blue-800',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      icon: 'text-blue-500',
      title: 'text-blue-900 dark:text-blue-100',
      text: 'text-blue-700 dark:text-blue-300',
      bar: 'bg-blue-500',
      barBg: 'bg-blue-200 dark:bg-blue-800',
    },
  }[variant];

  const message = isStale
    ? ent.staleMessage.replace('{days}', String(acc.daysSinceLastActivity))
    : ent.progressMessage
        .replace('{completed}', String(acc.completedCount))
        .replace('{total}', String(acc.totalSteps));

  return (
    <div className={`rounded-xl border ${styles.border} ${styles.bg} px-4 py-3`}>
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          {isStale ? (
            <AlertTriangle className={`h-5 w-5 ${styles.icon}`} />
          ) : acc.percentage >= 50 ? (
            <CheckCircle2 className={`h-5 w-5 ${styles.icon}`} />
          ) : (
            <Clock className={`h-5 w-5 ${styles.icon}`} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-sm font-semibold ${styles.title}`}>
              {isStale ? ent.staleTitle : ent.onTrackTitle}
            </p>
            <span className={`text-xs font-medium ${styles.text} tabular-nums`}>
              {acc.completedCount}/{acc.totalSteps} {ent.steps}
            </span>
          </div>
          <p className={`text-xs ${styles.text} mt-0.5`}>
            {message}
          </p>
          {/* Progress bar */}
          <div className={`mt-2 h-1 rounded-full ${styles.barBg} overflow-hidden`}>
            <div
              className={`h-full rounded-full ${styles.bar} transition-all duration-500`}
              style={{ width: `${acc.percentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
