'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { identifyBiggestRisk } from '@/lib/aiInsights';
import { useLanguage } from '@/hooks/useLanguage';
import type { RiskAnalysis } from '@/types';

interface InsightBannerProps {
  analysis: RiskAnalysis;
  scenarioHref: string;
  ctaLabel?: string;
}

export function InsightBanner({ analysis, scenarioHref, ctaLabel }: InsightBannerProps) {
  const { t } = useLanguage();
  const risk = identifyBiggestRisk(analysis);

  return (
    <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
            <AlertTriangle className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
              {t.conversion.biggestRisk}: <span className="capitalize">{risk.label}</span>
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              {risk.explanation}. {t.conversion.fixCouldReduce.replace('{points}', String(risk.potentialScoreReduction))}
            </p>
          </div>
        </div>
        <Link
          href={scenarioHref}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition-colors shadow-sm whitespace-nowrap flex-shrink-0"
        >
          {ctaLabel ?? t.conversion.seeHowToFix}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
