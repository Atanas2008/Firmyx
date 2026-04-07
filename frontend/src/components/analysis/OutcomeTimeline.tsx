'use client';

import { useMemo } from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { buildTimeline } from '@/lib/outcomeTracking';
import type { RiskAnalysis } from '@/types';

interface OutcomeTimelineProps {
  analyses: RiskAnalysis[];
}

export function OutcomeTimeline({ analyses }: OutcomeTimelineProps) {
  const { t } = useLanguage();
  const ent = t.enterprise.outcome;
  const timeline = useMemo(() => buildTimeline(analyses), [analyses]);

  if (timeline.length < 2) return null;

  const visibleEntries = timeline;

  const maxScore = Math.max(...timeline.map(e => e.riskScore), 100);
  const minScore = Math.min(...timeline.map(e => e.riskScore), 0);
  const range = Math.max(maxScore - minScore, 1);

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
            {ent.timelineTitle}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {ent.timelineSub}
          </p>
        </div>
        {timeline.length > 0 && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {timeline.length} {ent.analyses}
          </span>
        )}
      </div>

      {/* Timeline visualization */}
      <div className="relative">
        {/* Connecting line */}
        <div className="absolute left-[21px] top-3 bottom-3 w-0.5 bg-gray-200 dark:bg-gray-700" />

        <div className="space-y-0">
          {visibleEntries.map((entry, i) => {
            const barWidth = Math.max(8, ((entry.riskScore - minScore) / range) * 100);
            const isLatest = i === visibleEntries.length - 1;
            const color = entry.riskScore >= 60
              ? 'text-red-600 dark:text-red-400'
              : entry.riskScore >= 30
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-600 dark:text-emerald-400';
            const barColor = entry.riskScore >= 60
              ? 'bg-red-500/20 dark:bg-red-500/30'
              : entry.riskScore >= 30
                ? 'bg-amber-500/20 dark:bg-amber-500/30'
                : 'bg-emerald-500/20 dark:bg-emerald-500/30';
            const dotColor = entry.riskScore >= 60
              ? 'bg-red-500'
              : entry.riskScore >= 30
                ? 'bg-amber-500'
                : 'bg-emerald-500';

            return (
              <div key={entry.date} className="relative flex items-center gap-3 py-2.5">
                {/* Dot */}
                <div className={`relative z-10 flex h-[10px] w-[10px] flex-shrink-0 rounded-full ${dotColor} ${isLatest ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900' : ''}`}
                  style={isLatest ? { ['--tw-ring-color' as string]: entry.riskScore >= 60 ? '#ef4444' : entry.riskScore >= 30 ? '#f59e0b' : '#10b981' } : undefined}
                />

                {/* Period label */}
                <span className="w-16 flex-shrink-0 text-xs font-medium text-gray-600 dark:text-gray-300">
                  {entry.periodLabel}
                </span>

                {/* Bar + score */}
                <div className="flex-1 flex items-center gap-2">
                  <div className={`h-5 rounded-md ${barColor} transition-all duration-500`} style={{ width: `${barWidth}%` }} />
                  <span className={`text-sm font-bold tabular-nums ${color}`}>
                    {entry.riskScore.toFixed(0)}
                  </span>
                </div>

                {/* Delta badge */}
                {entry.delta !== null && (
                  <div className={`flex items-center gap-0.5 text-xs font-medium ${
                    entry.improved
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : entry.delta > 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-400'
                  }`}>
                    {entry.improved ? (
                      <TrendingDown className="h-3 w-3" />
                    ) : entry.delta > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <Minus className="h-3 w-3" />
                    )}
                    {entry.delta !== 0 && (
                      <span>{entry.delta > 0 ? '+' : ''}{entry.delta.toFixed(0)}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
