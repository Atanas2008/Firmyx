'use client';

import Link from 'next/link';
import { Target, ArrowRight, Clock, CheckCircle2 } from 'lucide-react';
import { generateRecommendations, buildValidatedMetrics } from '@/lib/aiInsights';
import { useLanguage } from '@/hooks/useLanguage';
import type { RiskAnalysis } from '@/types';

interface PrimaryActionProps {
  analysis: RiskAnalysis;
  scenarioHref: string;
}

/**
 * Single prominent "Do This First" card — the #1 highest-impact recommendation
 * pulled from the insights engine. Makes it impossible for a user to ask
 * "what should I actually do?"
 */
export function PrimaryAction({ analysis, scenarioHref }: PrimaryActionProps) {
  const { t } = useLanguage();
  const recommendations = generateRecommendations(analysis);
  const m = buildValidatedMetrics(analysis);

  // No urgent actions — positive state
  if (recommendations.length === 0 || m.risk_score <= 15) {
    return (
      <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
              {t.enterprise.allClear}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              {t.enterprise.allClearSub}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const top = recommendations[0];

  // Extract numeric impact from the estimated_impact string (e.g. "Reduces risk score by ~10 points")
  const impactMatch = top.estimated_impact.match(/(\d+)/);
  const impactPoints = impactMatch ? parseInt(impactMatch[1], 10) : null;

  const borderColor = top.priority === 'High'
    ? 'border-red-300 dark:border-red-700'
    : top.priority === 'Medium'
    ? 'border-amber-300 dark:border-amber-700'
    : 'border-blue-300 dark:border-blue-700';

  const bgGradient = top.priority === 'High'
    ? 'from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20'
    : top.priority === 'Medium'
    ? 'from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20'
    : 'from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20';

  const accentColor = top.priority === 'High'
    ? 'text-red-600 dark:text-red-400'
    : top.priority === 'Medium'
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-blue-600 dark:text-blue-400';

  const iconBg = top.priority === 'High'
    ? 'bg-red-100 dark:bg-red-900/50'
    : top.priority === 'Medium'
    ? 'bg-amber-100 dark:bg-amber-900/50'
    : 'bg-blue-100 dark:bg-blue-900/50';

  return (
    <div className={`rounded-xl border-2 ${borderColor} bg-gradient-to-r ${bgGradient} p-5`}>
      {/* Label */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
          <Target className={`h-4 w-4 ${accentColor}`} />
        </div>
        <div>
          <p className={`text-xs font-bold uppercase tracking-wider ${accentColor}`}>
            {t.enterprise.primaryAction}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            {t.enterprise.primaryActionSub}
          </p>
        </div>
      </div>

      {/* Action title + detail */}
      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50 mb-1">
        {top.title}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
        {top.text}
      </p>

      {/* Impact strip */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        {impactPoints && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 dark:text-gray-400">{t.enterprise.expectedImpact}:</span>
            <span className={`text-sm font-bold ${accentColor}`}>
              {t.enterprise.riskReduction.replace('{points}', String(impactPoints))}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs text-gray-500 dark:text-gray-400">{t.enterprise.timeframe}:</span>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{top.timeframe}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 dark:text-gray-400">{top.current_value}</span>
          <ArrowRight className="h-3 w-3 text-gray-400" />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{top.target_value}</span>
        </div>
      </div>

      {/* CTA */}
      <Link
        href={scenarioHref}
        className="inline-flex items-center gap-2 rounded-lg bg-gray-900 dark:bg-white px-5 py-2.5 text-sm font-bold text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm"
      >
        {t.enterprise.simulateAction}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
