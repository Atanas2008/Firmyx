import { HealthScoreCard } from '@/components/dashboard/HealthScoreCard';
import { RiskIndicator } from '@/components/dashboard/RiskIndicator';
import type { RiskAnalysis } from '@/types';
import { formatDate } from '@/lib/utils';

interface RiskScoreDisplayProps {
  analysis: RiskAnalysis;
}

export function RiskScoreDisplay({ analysis }: RiskScoreDisplayProps) {
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
          <span className="text-sm text-gray-500">Risk Level</span>
          <RiskIndicator riskLevel={analysis.risk_level} />
        </div>
        <div>
          <p className="text-xs text-gray-400">
            Analysis run on {formatDate(analysis.created_at)}
          </p>
        </div>
        {analysis.risk_explanation && (
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-700 mb-1">Summary</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              {analysis.risk_explanation}
            </p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="text-center rounded-lg border border-gray-100 p-3">
            <p className="text-xs text-gray-400">Altman Z-Score</p>
            <p className="mt-0.5 text-lg font-bold text-gray-900">
              {analysis.altman_z_score.toFixed(2)}
            </p>
          </div>
          <div className="text-center rounded-lg border border-gray-100 p-3">
            <p className="text-xs text-gray-400">Runway</p>
            <p className="mt-0.5 text-lg font-bold text-gray-900">
              {isRunwayNotApplicable
                ? 'N/A'
                : `${analysis.cash_runway_months!.toFixed(1)} mo`}
            </p>
            <p className="text-xs text-gray-400">at current expenses</p>
          </div>
          <div className="text-center rounded-lg border border-gray-100 p-3">
            <p className="text-xs text-gray-400">Profit Margin</p>
            <p className="mt-0.5 text-lg font-bold text-gray-900">
              {analysis.profit_margin.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
