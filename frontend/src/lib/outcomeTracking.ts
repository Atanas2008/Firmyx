/**
 * Outcome Tracking Engine — composable utilities for the Outcome Ownership layer.
 *
 * Computes score history timelines, correlates completed actions with score
 * changes, tracks predicted-vs-actual improvement, generates accountability
 * state, and determines smart follow-up suggestions.
 *
 * Builds on top of existing primitives:
 *   - computeScoreChange / detectUrgencyAlerts from aiInsights
 *   - getExecutionState / computeProgress from actionSteps
 *   - generateRecommendations from aiInsights
 */

import type { RiskAnalysis } from '@/types';
import { computeScoreChange, generateRecommendations } from './aiInsights';
import type { ScoreChange } from './aiInsights';
import { getExecutionState, computeProgress, generateActionSteps } from './actionSteps';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TimelineEntry {
  date: string;
  riskScore: number;
  riskLevel: string;
  periodLabel: string;
  delta: number | null;       // change from previous entry
  improved: boolean | null;
}

export interface OutcomeSummary {
  totalImprovement: number;      // total risk score reduction since first analysis
  bestScore: number;
  worstScore: number;
  daysSinceFirstAnalysis: number;
  analysisCount: number;
  scoreChange: ScoreChange | null;
}

export interface AccountabilityState {
  totalSteps: number;
  completedCount: number;
  remainingCount: number;
  percentage: number;
  daysSinceStart: number | null;
  daysSinceLastActivity: number | null;
  estimatedRiskReduction: number;
  isStale: boolean;              // no activity in 3+ days
}

export interface FollowUpSuggestion {
  type: 'new_bottleneck' | 'next_action' | 'reanalyze' | 'celebrate';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionLabel: string;
}

export interface ImprovementProofData {
  predictedReduction: number;
  actualChange: number;         // negative = improved
  daysElapsed: number;
  stepsCompleted: number;
  totalSteps: number;
  effectivenessRatio: number;   // actual / predicted (>1 = better than expected)
}

// ─── Timeline Builder ─────────────────────────────────────────────────────────

export function buildTimeline(analyses: RiskAnalysis[]): TimelineEntry[] {
  if (analyses.length === 0) return [];

  const sorted = [...analyses]
    .filter(a => a.analysis_scope === 'monthly')
    .sort((a, b) =>
      ((a.period_year ?? 0) * 12 + (a.period_month ?? 0)) -
      ((b.period_year ?? 0) * 12 + (b.period_month ?? 0))
    );

  return sorted.map((a, i) => {
    const prev = i > 0 ? sorted[i - 1] : null;
    const delta = prev ? a.risk_score - prev.risk_score : null;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const periodLabel = a.period_month && a.period_year
      ? `${monthNames[(a.period_month - 1) % 12]} ${a.period_year}`
      : new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    return {
      date: a.created_at,
      riskScore: a.risk_score,
      riskLevel: a.risk_level,
      periodLabel,
      delta,
      improved: delta !== null ? delta < 0 : null,
    };
  });
}

// ─── Outcome Summary ──────────────────────────────────────────────────────────

export function computeOutcomeSummary(analyses: RiskAnalysis[]): OutcomeSummary | null {
  if (analyses.length === 0) return null;

  const sorted = [...analyses].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const scores = sorted.map(a => a.risk_score);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const daysSinceFirst = Math.floor(
    (new Date(last.created_at).getTime() - new Date(first.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    totalImprovement: first.risk_score - last.risk_score, // positive = improved
    bestScore: Math.min(...scores),
    worstScore: Math.max(...scores),
    daysSinceFirstAnalysis: daysSinceFirst,
    analysisCount: analyses.length,
    scoreChange: computeScoreChange(analyses),
  };
}

// ─── Accountability ───────────────────────────────────────────────────────────

export function computeAccountability(
  analysis: RiskAnalysis,
  businessId: string
): AccountabilityState {
  const recommendations = generateRecommendations(analysis);
  const plans = generateActionSteps(recommendations);
  const state = getExecutionState(businessId);
  const progress = computeProgress(plans, state);

  const now = Date.now();
  const daysSinceStart = state.startedAt
    ? Math.floor((now - new Date(state.startedAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const daysSinceLastActivity = state.lastUpdated
    ? Math.floor((now - new Date(state.lastUpdated).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    totalSteps: progress.totalSteps,
    completedCount: progress.completedCount,
    remainingCount: progress.totalSteps - progress.completedCount,
    percentage: progress.percentage,
    daysSinceStart,
    daysSinceLastActivity,
    estimatedRiskReduction: progress.estimatedRiskReduction,
    isStale: daysSinceLastActivity !== null && daysSinceLastActivity >= 3,
  };
}

// ─── Improvement Proof ────────────────────────────────────────────────────────

export function computeImprovementProof(
  analyses: RiskAnalysis[],
  businessId: string
): ImprovementProofData | null {
  const scoreChange = computeScoreChange(analyses);
  if (!scoreChange) return null;

  const latest = [...analyses].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0];

  const recommendations = generateRecommendations(latest);
  const plans = generateActionSteps(recommendations);
  const state = getExecutionState(businessId);
  const progress = computeProgress(plans, state);

  const daysElapsed = scoreChange.previousDate
    ? Math.max(1, Math.floor(
        (new Date(latest.created_at).getTime() - new Date(scoreChange.previousDate).getTime()) / (1000 * 60 * 60 * 24)
      ))
    : 1;

  const predictedReduction = progress.estimatedRiskReduction;
  const actualChange = scoreChange.delta; // negative = improvement

  return {
    predictedReduction,
    actualChange,
    daysElapsed,
    stepsCompleted: progress.completedCount,
    totalSteps: progress.totalSteps,
    effectivenessRatio: predictedReduction > 0 ? Math.abs(actualChange) / predictedReduction : 0,
  };
}

// ─── Smart Follow-Up ──────────────────────────────────────────────────────────

export function generateFollowUps(
  analyses: RiskAnalysis[],
  businessId: string
): FollowUpSuggestion[] {
  const suggestions: FollowUpSuggestion[] = [];

  if (analyses.length === 0) return suggestions;

  const sorted = [...analyses].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const latest = sorted[0];
  const accountability = computeAccountability(latest, businessId);

  // 1. All done? Celebrate + re-analyze
  if (accountability.percentage === 100) {
    suggestions.push({
      type: 'celebrate',
      title: 'Action Plan Complete!',
      description: `You finished all ${accountability.totalSteps} steps. Re-run analysis to measure your real impact.`,
      priority: 'high',
      actionLabel: 'Re-run Analysis',
    });
    return suggestions;
  }

  // 2. Stale? Gentle nudge
  if (accountability.isStale && accountability.remainingCount > 0) {
    suggestions.push({
      type: 'next_action',
      title: 'Pick Up Where You Left Off',
      description: `You have ${accountability.remainingCount} steps remaining. Your last activity was ${accountability.daysSinceLastActivity} days ago.`,
      priority: 'high',
      actionLabel: 'Continue Plan',
    });
  }

  // 3. Detect new bottleneck from score worsening
  const scoreChange = computeScoreChange(analyses);
  if (scoreChange && scoreChange.delta > 5) {
    const recommendations = generateRecommendations(latest);
    const topRec = recommendations[0];
    suggestions.push({
      type: 'new_bottleneck',
      title: 'New Risk Detected',
      description: topRec
        ? `Risk score increased by ${scoreChange.delta.toFixed(0)} points. Top issue: ${topRec.category} — ${topRec.title}`
        : `Risk score increased by ${scoreChange.delta.toFixed(0)} points since last analysis.`,
      priority: 'high',
      actionLabel: 'View New Plan',
    });
  }

  // 4. Good progress? Suggest next action
  if (accountability.percentage > 0 && accountability.percentage < 100 && !accountability.isStale) {
    suggestions.push({
      type: 'next_action',
      title: 'Keep the Momentum',
      description: `${accountability.completedCount} of ${accountability.totalSteps} steps done. Complete the next step to reduce risk by an estimated ${accountability.estimatedRiskReduction} points.`,
      priority: 'medium',
      actionLabel: 'Next Step',
    });
  }

  // 5. Multiple analyses but no execution started
  if (analyses.length >= 2 && accountability.completedCount === 0) {
    suggestions.push({
      type: 'next_action',
      title: 'Start Your Action Plan',
      description: 'You have multiple analyses but haven\'t started executing. Small steps compound into big improvements.',
      priority: 'medium',
      actionLabel: 'Start Now',
    });
  }

  // 6. Old analysis? Suggest re-analyze
  const latestDate = new Date(latest.created_at).getTime();
  const daysSinceLatest = Math.floor((Date.now() - latestDate) / (1000 * 60 * 60 * 24));
  if (daysSinceLatest >= 7) {
    suggestions.push({
      type: 'reanalyze',
      title: 'Time to Re-Analyze',
      description: `Your last analysis was ${daysSinceLatest} days ago. Re-run to track your progress.`,
      priority: 'low',
      actionLabel: 'Re-run Analysis',
    });
  }

  return suggestions;
}
