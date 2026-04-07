'use client';

import { useState, useEffect } from 'react';
import { Flame, TrendingDown, CheckCircle2, ArrowDown, Clock } from 'lucide-react';
import { generateRecommendations } from '@/lib/aiInsights';
import {
  generateActionSteps, getExecutionState, computeProgress,
} from '@/lib/actionSteps';
import { useLanguage } from '@/hooks/useLanguage';
import type { RiskAnalysis } from '@/types';

interface ExecutionTrackerProps {
  analysis: RiskAnalysis;
  businessId: string;
}

/**
 * Compact execution progress badge — sits near the top of the analysis page.
 * Shows overall progress, risk reduction achieved, and streak/momentum signals.
 * Creates stickiness: users return to continue checking off steps.
 */
export function ExecutionTracker({ analysis, businessId }: ExecutionTrackerProps) {
  const { t } = useLanguage();
  const recommendations = generateRecommendations(analysis);
  const plans = generateActionSteps(recommendations);

  const [execState, setExecState] = useState(() => getExecutionState(businessId));

  // Re-read state on storage events (cross-tab sync)
  useEffect(() => {
    const handler = () => setExecState(getExecutionState(businessId));
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [businessId]);

  const progress = computeProgress(plans, execState);

  // Don't show if there's nothing to track or user hasn't started
  if (plans.length === 0 || progress.completedCount === 0) return null;

  const daysActive = execState.startedAt
    ? Math.max(1, Math.ceil((Date.now() - new Date(execState.startedAt).getTime()) / 86400000))
    : 0;

  const allDone = progress.percentage === 100;

  return (
    <div className={`rounded-xl border p-4 ${
      allDone
        ? 'border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20'
        : 'border-indigo-200 dark:border-indigo-800 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20'
    }`}>
      <div className="flex items-center gap-4 flex-wrap">
        {/* Progress ring */}
        <div className="relative h-14 w-14 flex-shrink-0">
          <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56">
            <circle
              cx="28" cy="28" r="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              className="text-gray-200 dark:text-gray-700"
            />
            <circle
              cx="28" cy="28" r="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 24}`}
              strokeDashoffset={`${2 * Math.PI * 24 * (1 - progress.percentage / 100)}`}
              className={allDone ? 'text-emerald-500' : 'text-indigo-500'}
              style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-sm font-black ${
              allDone ? 'text-emerald-700 dark:text-emerald-300' : 'text-indigo-700 dark:text-indigo-300'
            }`}>
              {progress.percentage}%
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${
            allDone ? 'text-emerald-800 dark:text-emerald-200' : 'text-gray-900 dark:text-gray-50'
          }`}>
            {allDone ? t.enterprise.executionComplete : t.enterprise.executionInProgress}
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
            {/* Steps done */}
            <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              {progress.completedCount}/{progress.totalSteps} {t.enterprise.stepsDone}
            </span>

            {/* Risk reduction */}
            {progress.estimatedRiskReduction > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <ArrowDown className="h-3 w-3" />
                {t.enterprise.riskReduced.replace('{points}', String(progress.estimatedRiskReduction))}
              </span>
            )}

            {/* Days active */}
            {daysActive > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                <Clock className="h-3 w-3" />
                {t.enterprise.daysActive.replace('{days}', String(daysActive))}
              </span>
            )}

            {/* Streak / Momentum */}
            {progress.completedCount >= 3 && !allDone && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 dark:text-orange-400">
                <Flame className="h-3 w-3" />
                {t.enterprise.onFire}
              </span>
            )}
          </div>
        </div>

        {/* Re-run nudge when all done */}
        {allDone && (
          <div className="flex-shrink-0">
            <div className="flex items-center gap-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 px-3 py-2">
              <TrendingDown className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                {t.enterprise.rerunToVerify}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
