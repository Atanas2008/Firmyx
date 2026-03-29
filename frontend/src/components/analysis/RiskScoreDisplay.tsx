import { HealthScoreCard } from '@/components/dashboard/HealthScoreCard';
import { RiskIndicator } from '@/components/dashboard/RiskIndicator';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { useLanguage } from '@/hooks/useLanguage';
import type { RiskAnalysis } from '@/types';
import { formatDate } from '@/lib/utils';

interface RiskScoreDisplayProps {
  analysis: RiskAnalysis;
}

export function RiskScoreDisplay({ analysis }: RiskScoreDisplayProps) {
  const { language, t } = useLanguage();
  const isRunwayNotApplicable =
    analysis.cash_runway_months === null;

  return (
    <div className="flex flex-col items-center gap-4 py-4 sm:flex-row sm:items-start sm:gap-8">
      <HealthScoreCard
        score={analysis.risk_score}
        riskLevel={analysis.risk_level}
      />
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">{t.analysis.riskLevel}</span>
          <RiskIndicator riskLevel={analysis.risk_level} />
        </div>
        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {t.analysis.analysisRunOn} {formatDate(analysis.created_at, language)}
          </p>
        </div>
        {analysis.risk_explanation && (
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{t.analysis.summary}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {analysis.risk_explanation}
            </p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="text-center rounded-lg border border-gray-100 dark:border-gray-800 p-3">
            <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1">Altman Z-Score <InfoTooltip text="Bankruptcy prediction model: >2.99 safe, 1.81–2.99 grey zone, <1.81 distress" /></p>
            <p className="mt-0.5 text-lg font-bold text-gray-900 dark:text-gray-50">
              {analysis.altman_z_score.toFixed(2)}
            </p>
          </div>
          <div className="text-center rounded-lg border border-gray-100 dark:border-gray-800 p-3">
            <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1">Runway <InfoTooltip text="How many months your cash reserves will last at your current monthly expense rate" /></p>
            <p className="mt-0.5 text-lg font-bold text-gray-900 dark:text-gray-50">
              {analysis.burn_rate === 0
                ? t.metrics.notAtRisk
                : isRunwayNotApplicable
                ? t.common.notApplicable
                : `${analysis.cash_runway_months!.toFixed(1)} mo`}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{analysis.burn_rate === 0 ? t.metrics.cashFlowPositive : t.metrics.atCurrentBurnRate}</p>
          </div>
          <div className="text-center rounded-lg border border-gray-100 dark:border-gray-800 p-3">
            <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1">Profit Margin <InfoTooltip text="Percentage of revenue remaining after all expenses — higher is better" /></p>
            <p className="mt-0.5 text-lg font-bold text-gray-900 dark:text-gray-50">
              {analysis.profit_margin.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
