'use client';

import { useMemo } from 'react';
import { Sparkles, AlertCircle, RefreshCw, PartyPopper, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { generateFollowUps } from '@/lib/outcomeTracking';
import type { RiskAnalysis } from '@/types';

interface SmartFollowUpProps {
  analyses: RiskAnalysis[];
  businessId: string;
  onRerun?: () => void;
  scenarioHref?: string;
}

export function SmartFollowUp({ analyses, businessId, onRerun, scenarioHref }: SmartFollowUpProps) {
  const { t } = useLanguage();
  const ent = t.enterprise.outcome;
  const suggestions = useMemo(
    () => generateFollowUps(analyses, businessId),
    [analyses, businessId]
  );

  if (suggestions.length === 0) return null;

  const iconMap = {
    new_bottleneck: AlertCircle,
    next_action: Sparkles,
    reanalyze: RefreshCw,
    celebrate: PartyPopper,
  };

  const colorMap = {
    new_bottleneck: {
      border: 'border-red-200 dark:border-red-800',
      bg: 'bg-red-50 dark:bg-red-950/40',
      icon: 'text-red-500 bg-red-100 dark:bg-red-900/50',
      title: 'text-red-900 dark:text-red-100',
      text: 'text-red-700 dark:text-red-300',
      btn: 'bg-red-600 hover:bg-red-700 text-white',
    },
    next_action: {
      border: 'border-blue-200 dark:border-blue-800',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      icon: 'text-blue-500 bg-blue-100 dark:bg-blue-900/50',
      title: 'text-blue-900 dark:text-blue-100',
      text: 'text-blue-700 dark:text-blue-300',
      btn: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    reanalyze: {
      border: 'border-purple-200 dark:border-purple-800',
      bg: 'bg-purple-50 dark:bg-purple-950/40',
      icon: 'text-purple-500 bg-purple-100 dark:bg-purple-900/50',
      title: 'text-purple-900 dark:text-purple-100',
      text: 'text-purple-700 dark:text-purple-300',
      btn: 'bg-purple-600 hover:bg-purple-700 text-white',
    },
    celebrate: {
      border: 'border-emerald-200 dark:border-emerald-800',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      icon: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/50',
      title: 'text-emerald-900 dark:text-emerald-100',
      text: 'text-emerald-700 dark:text-emerald-300',
      btn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
  };

  // Show top 2 follow-ups max
  const visible = suggestions.slice(0, 2);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
        {ent.followUpTitle}
      </h3>
      {visible.map((suggestion, i) => {
        const Icon = iconMap[suggestion.type];
        const colors = colorMap[suggestion.type];

        return (
          <div
            key={i}
            className={`rounded-xl border ${colors.border} ${colors.bg} p-4 flex items-start gap-3`}
          >
            <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${colors.icon}`}>
              <Icon className="h-4.5 w-4.5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`text-sm font-semibold ${colors.title}`}>
                {suggestion.title}
              </h4>
              <p className={`text-xs ${colors.text} mt-0.5`}>
                {suggestion.description}
              </p>
            </div>
            <button
              onClick={() => {
                if (suggestion.type === 'reanalyze' || suggestion.type === 'celebrate') {
                  onRerun?.();
                } else if (suggestion.type === 'new_bottleneck' && scenarioHref) {
                  window.location.href = scenarioHref;
                }
                // next_action — scroll to ActionPlan
                if (suggestion.type === 'next_action') {
                  document.getElementById('action-plan-section')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className={`flex-shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${colors.btn}`}
            >
              {suggestion.actionLabel}
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
