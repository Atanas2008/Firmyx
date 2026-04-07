'use client';

import { useState, useCallback } from 'react';
import {
  CheckCircle2, Circle, ChevronDown, ChevronRight, Zap, Clock,
  ListChecks, Trophy,
} from 'lucide-react';
import { generateRecommendations } from '@/lib/aiInsights';
import {
  generateActionSteps, getExecutionState, toggleStep, computeProgress,
  type ActionPlanData, type ExecutionState,
} from '@/lib/actionSteps';
import { useLanguage } from '@/hooks/useLanguage';
import type { RiskAnalysis } from '@/types';

interface ActionPlanProps {
  analysis: RiskAnalysis;
  businessId: string;
}

const EFFORT_COLORS: Record<string, string> = {
  quick:    'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  medium:   'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  involved: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
};

const EFFORT_LABELS: Record<string, string> = {
  quick: '5 min',
  medium: '30 min',
  involved: '1+ hr',
};

/**
 * Execution layer — turns recommendations into checkable micro-steps.
 * Shows "Start Fixing This" inline flow with progress tracking.
 * Persists state to localStorage per business.
 */
export function ActionPlan({ analysis, businessId }: ActionPlanProps) {
  const { t } = useLanguage();
  const recommendations = generateRecommendations(analysis);
  const plans = generateActionSteps(recommendations);

  const [execState, setExecState] = useState<ExecutionState>(() =>
    getExecutionState(businessId)
  );
  const [expandedPlan, setExpandedPlan] = useState<number | null>(
    // Auto-expand first plan if user has no progress yet
    () => (execState.completedSteps.length === 0 ? 0 : null)
  );

  const progress = computeProgress(plans, execState);

  const handleToggle = useCallback((stepId: string) => {
    const newState = toggleStep(businessId, stepId);
    setExecState({ ...newState });
  }, [businessId]);

  if (plans.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
      {/* Header with overall progress */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/50">
              <ListChecks className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-50">
                {t.enterprise.actionPlan}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t.enterprise.actionPlanSub}
              </p>
            </div>
          </div>
          {progress.completedCount > 0 && (
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t.enterprise.stepsCompleted
                  .replace('{done}', String(progress.completedCount))
                  .replace('{total}', String(progress.totalSteps))}
              </p>
            </div>
          )}
        </div>

        {/* Overall progress bar */}
        <div className="relative h-2.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-500 ease-out"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>

        {/* Progress feedback */}
        {progress.completedCount > 0 && (
          <div className="mt-2 flex items-center gap-3">
            {progress.estimatedRiskReduction > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <Zap className="h-3 w-3" />
                {t.enterprise.riskReduced.replace('{points}', String(progress.estimatedRiskReduction))}
              </span>
            )}
            {progress.percentage === 100 && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                <Trophy className="h-3 w-3" />
                {t.enterprise.allStepsComplete}
              </span>
            )}
            {progress.percentage > 0 && progress.percentage < 100 && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {t.enterprise.keepGoing}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Plan list */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {plans.map((plan, planIdx) => {
          const isExpanded = expandedPlan === planIdx;
          const planDone = plan.steps.filter((s) => execState.completedSteps.includes(s.id)).length;
          const planPct = plan.steps.length > 0 ? Math.round((planDone / plan.steps.length) * 100) : 0;

          return (
            <div key={planIdx}>
              {/* Plan header */}
              <button
                type="button"
                onClick={() => setExpandedPlan(isExpanded ? null : planIdx)}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-50 truncate">
                      {plan.title}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                      {plan.steps.length} {plan.steps.length === 1 ? 'step' : 'steps'}
                    </span>
                  </div>
                  {planDone > 0 && (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1 flex-1 max-w-[120px] rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                          style={{ width: `${planPct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">{planDone}/{plan.steps.length}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />
                    {plan.timeframe}
                  </span>
                  {plan.estimatedImpactPoints > 0 && (
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      −{plan.estimatedImpactPoints} pts
                    </span>
                  )}
                </div>
              </button>

              {/* Expanded step list */}
              {isExpanded && (
                <div className="px-5 pb-4">
                  <ol className="space-y-2 ml-2">
                    {plan.steps.map((step) => {
                      const isDone = execState.completedSteps.includes(step.id);
                      return (
                        <li
                          key={step.id}
                          className={`flex items-start gap-3 rounded-lg p-3 transition-all cursor-pointer group ${
                            isDone
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50'
                              : 'bg-gray-50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-800'
                          }`}
                          onClick={() => handleToggle(step.id)}
                        >
                          {/* Checkbox */}
                          <div className="flex-shrink-0 mt-0.5">
                            {isDone ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
                            ) : (
                              <Circle className="h-5 w-5 text-gray-300 dark:text-gray-600 group-hover:text-indigo-400 transition-colors" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${
                              isDone
                                ? 'text-emerald-700 dark:text-emerald-300 line-through'
                                : 'text-gray-800 dark:text-gray-200'
                            }`}>
                              {step.label}
                            </p>
                            <p className={`text-xs mt-0.5 ${
                              isDone
                                ? 'text-emerald-600/60 dark:text-emerald-400/50'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              {step.description}
                            </p>
                          </div>

                          {/* Effort tag */}
                          <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${EFFORT_COLORS[step.effort]}`}>
                            {EFFORT_LABELS[step.effort]}
                          </span>
                        </li>
                      );
                    })}
                  </ol>

                  {/* Plan-level CTA */}
                  {planDone === plan.steps.length && plan.steps.length > 0 && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2.5 border border-emerald-200 dark:border-emerald-800">
                      <Trophy className="h-4 w-4 text-amber-500" />
                      <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                        {t.enterprise.planComplete.replace('{title}', plan.title)}
                      </p>
                      {plan.estimatedImpactPoints > 0 && (
                        <span className="ml-auto text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          −{plan.estimatedImpactPoints} {t.enterprise.riskPoints}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
