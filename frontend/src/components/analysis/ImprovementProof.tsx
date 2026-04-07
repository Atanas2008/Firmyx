'use client';

import { useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight, Trophy, Target } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { computeImprovementProof } from '@/lib/outcomeTracking';
import type { RiskAnalysis } from '@/types';

interface ImprovementProofProps {
  analyses: RiskAnalysis[];
  businessId: string;
}

export function ImprovementProof({ analyses, businessId }: ImprovementProofProps) {
  const { t } = useLanguage();
  const ent = t.enterprise.outcome;
  const proof = useMemo(
    () => computeImprovementProof(analyses, businessId),
    [analyses, businessId]
  );

  if (!proof) return null;

  const improved = proof.actualChange < 0;
  const changeAbs = Math.abs(proof.actualChange);

  // Don't render if no meaningful change
  if (changeAbs < 1 && proof.stepsCompleted === 0) return null;

  const progressPercent = proof.totalSteps > 0
    ? Math.round((proof.stepsCompleted / proof.totalSteps) * 100)
    : 0;

  return (
    <div className={`rounded-2xl border p-5 ${
      improved
        ? 'border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40'
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
    }`}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          improved
            ? 'bg-emerald-100 dark:bg-emerald-900/50'
            : 'bg-gray-100 dark:bg-gray-800'
        }`}>
          {improved ? (
            <Trophy className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Target className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          )}
        </div>
        <div>
          <h3 className={`text-sm font-semibold ${
            improved
              ? 'text-emerald-900 dark:text-emerald-100'
              : 'text-gray-900 dark:text-gray-100'
          }`}>
            {improved
              ? ent.improvedTitle.replace('{points}', changeAbs.toFixed(0)).replace('{days}', String(proof.daysElapsed))
              : ent.noChangeTitle
            }
          </h3>
          <p className={`text-xs mt-0.5 ${
            improved
              ? 'text-emerald-700 dark:text-emerald-300'
              : 'text-gray-500 dark:text-gray-400'
          }`}>
            {improved ? ent.improvedSub : ent.noChangeSub}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {/* Actual change */}
        <div className="rounded-lg bg-white/60 dark:bg-gray-800/60 border border-gray-200/50 dark:border-gray-700/50 px-3 py-2.5 text-center">
          <div className={`flex items-center justify-center gap-1 text-lg font-bold tabular-nums ${
            improved ? 'text-emerald-600 dark:text-emerald-400' : proof.actualChange > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
          }`}>
            {improved ? (
              <ArrowDownRight className="h-4 w-4" />
            ) : proof.actualChange > 0 ? (
              <ArrowUpRight className="h-4 w-4" />
            ) : null}
            {changeAbs.toFixed(0)}
          </div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1">
            {ent.actualChange}
          </p>
        </div>

        {/* Predicted */}
        <div className="rounded-lg bg-white/60 dark:bg-gray-800/60 border border-gray-200/50 dark:border-gray-700/50 px-3 py-2.5 text-center">
          <div className="text-lg font-bold tabular-nums text-blue-600 dark:text-blue-400">
            {proof.predictedReduction}
          </div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1">
            {ent.predicted}
          </p>
        </div>

        {/* Steps completed */}
        <div className="rounded-lg bg-white/60 dark:bg-gray-800/60 border border-gray-200/50 dark:border-gray-700/50 px-3 py-2.5 text-center">
          <div className="text-lg font-bold tabular-nums text-gray-900 dark:text-gray-100">
            {proof.stepsCompleted}/{proof.totalSteps}
          </div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1">
            {ent.stepsCompleted}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {proof.totalSteps > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-gray-500 dark:text-gray-400">{ent.executionProgress}</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">{progressPercent}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                improved ? 'bg-emerald-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
