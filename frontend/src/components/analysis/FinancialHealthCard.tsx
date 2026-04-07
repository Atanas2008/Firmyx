'use client';

import React from 'react';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { useLanguage } from '@/hooks/useLanguage';
import type { RiskAnalysis } from '@/types';

interface FinancialHealthCardProps {
  analysis: RiskAnalysis;
}

/**
 * Industry-specific weight configurations mirroring the backend INDUSTRY_WEIGHTS.
 * Displayed in the UI so users understand which risk model was applied.
 */
const INDUSTRY_WEIGHT_LABELS: Record<string, string> = {
  // Metric emphasis by industry — shown as human-readable breakdown
  Technology:            '35% Z-Score · 20% Liquidity · 20% Profit Margin · 15% Debt · 10% Revenue Trend',
  Software:              '35% Z-Score · 20% Liquidity · 20% Profit Margin · 15% Debt · 10% Revenue Trend',
  'Food & Beverage':     '25% Z-Score · 20% Liquidity · 25% Profit Margin · 20% Debt · 10% Revenue Trend',
  Restaurants:           '25% Z-Score · 20% Liquidity · 25% Profit Margin · 20% Debt · 10% Revenue Trend',
  'Coffee Chains':       '25% Z-Score · 20% Liquidity · 25% Profit Margin · 20% Debt · 10% Revenue Trend',
  Retail:                '30% Z-Score · 25% Liquidity · 20% Profit Margin · 15% Debt · 10% Revenue Trend',
  Manufacturing:         '30% Z-Score · 25% Liquidity · 20% Profit Margin · 15% Debt · 10% Revenue Trend',
  Healthcare:            '25% Z-Score · 20% Liquidity · 25% Profit Margin · 20% Debt · 10% Revenue Trend',
  'Real Estate':         '15% Z-Score · 20% Liquidity · 20% Profit Margin · 35% Debt · 10% Revenue Trend',
  'Logistics & Transport': '25% Z-Score · 25% Liquidity · 20% Profit Margin · 20% Debt · 10% Revenue Trend',
  'General Industry':    '30% Z-Score · 25% Liquidity · 20% Profit Margin · 15% Debt · 10% Revenue Trend',
};

/**
 * Displays the composite Financial Health Score (0–100) with a colour-coded
 * arc indicator and the Bankruptcy Probability underneath.
 *
 * Score interpretation:
 *   70–100  Healthy     (green)
 *   40–70   Moderate    (yellow)
 *   0–40    At Risk     (red)
 *
 * FinancialHealthScore = 100 − RiskScore, so a low-risk business scores high here.
 */
export function FinancialHealthCard({ analysis }: FinancialHealthCardProps) {
  const { t } = useLanguage();
  const score = analysis.financial_health_score ?? null;
  const probability = analysis.bankruptcy_probability ?? null;
  const modelName = analysis.industry_model_applied ?? 'General Industry';
  const weightLabel = INDUSTRY_WEIGHT_LABELS[modelName] ?? INDUSTRY_WEIGHT_LABELS['General Industry'];

  if (score === null) {
    return (
      <p className="text-sm text-gray-400 dark:text-gray-500 italic">
        {t.health.notAvailable}
      </p>
    );
  }

  // Determine colour tier (higher health score = safer)
  // health_score = 100 − risk_score, so thresholds mirror risk levels:
  //   ≥ 70 → Low Risk     (risk_score 0–30)
  //   ≥ 50 → Medium Risk  (risk_score 30–50)
  //   ≥ 30 → High Risk    (risk_score 50–70)
  //   < 30 → Critical     (risk_score 70–100)
  const tier =
    score >= 70
      ? { label: t.risk.low ?? t.risk.lowRisk,           color: '#10b981', bg: 'bg-emerald-50 dark:bg-emerald-900/30',  text: 'text-emerald-700 dark:text-emerald-300',  border: 'border-emerald-200 dark:border-emerald-800'  }
      : score >= 50
      ? { label: t.risk.medium ?? t.risk.moderateRisk,   color: '#f59e0b', bg: 'bg-amber-50 dark:bg-amber-900/30',    text: 'text-amber-700 dark:text-amber-300',    border: 'border-amber-200 dark:border-amber-800'    }
      : score >= 30
      ? { label: t.risk.high ?? t.risk.highRisk,         color: '#f97316', bg: 'bg-orange-50 dark:bg-orange-900/30',  text: 'text-orange-700 dark:text-orange-300',  border: 'border-orange-200 dark:border-orange-800'  }
      : { label: t.risk.critical ?? 'Critical Risk',     color: '#ef4444', bg: 'bg-red-50 dark:bg-red-900/30',      text: 'text-red-700 dark:text-red-300',      border: 'border-red-200 dark:border-red-800'      };

  // SVG arc parameters for the gauge
  const radius = 54;
  const cx = 70;
  const cy = 70;
  const circumference = Math.PI * radius; // half-circle arc length
  const offset = circumference * (1 - score / 100);

  return (
    <div className="space-y-5">
      {/* Industry model badge */}
      <div className="flex items-center gap-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          <span className="font-semibold">{t.health.industryModelApplied}</span>{' '}
          {modelName}
        </p>
      </div>

      {/* Gauge */}
      <div className="flex flex-col items-center">
        <svg width="140" height="80" viewBox="0 0 140 80" className="overflow-visible">
          {/* Background arc */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Filled arc (progress) */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke={tier.color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={`${offset}`}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
          {/* Score label */}
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize="22" fontWeight="bold" fill={tier.color}>
            {Math.round(score)}
          </text>
          <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9" fill="#6b7280">
            / 100
          </text>
        </svg>

        <span className={`mt-1 inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold ${tier.bg} ${tier.text} ${tier.border}`}>
          {tier.label}
        </span>
      </div>

      {/* Metric breakdown */}
      <div className="text-center space-y-1">
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center justify-center gap-1">{t.health.healthScore} <InfoTooltip text={t.health.healthScoreTooltip} /></p>
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-snug max-w-xs mx-auto">
          {t.health.healthScoreText} {weightLabel}
        </p>
      </div>

      {/* Bankruptcy Probability */}
      {probability !== null && (
        <div className={`rounded-xl border p-4 ${tier.bg} ${tier.border}`}>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1 flex items-center justify-center gap-1">{t.health.bankruptcyProbability} <InfoTooltip text={t.health.bankruptcyTooltip} /></p>
          <p className={`text-3xl font-bold text-center ${tier.text}`}>{probability.toFixed(0)}%</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-center">
            {probability <= 10
              ? t.health.safeZone
              : probability <= 20
              ? t.health.greyZone
              : t.health.distressZone}
          </p>
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            {t.health.bankruptcyDrivenBy}{' '}
            {analysis.altman_z_score >= 3
              ? t.health.zScoreSafe.replace('{z}', analysis.altman_z_score.toFixed(2))
              : analysis.altman_z_score >= 1.8
              ? t.health.zScoreGrey.replace('{z}', analysis.altman_z_score.toFixed(2))
              : t.health.zScoreDistress.replace('{z}', analysis.altman_z_score.toFixed(2))}
            {analysis.debt_ratio >= 0.6
              ? ' ' + t.health.highDebtContributes.replace('{d}', (analysis.debt_ratio * 100).toFixed(0))
              : ''}
            {analysis.liquidity_ratio < 1.0
              ? ' ' + t.health.lowLiquidityContributes.replace('{l}', analysis.liquidity_ratio.toFixed(2))
              : ''}
          </p>
        </div>
      )}
    </div>
  );
}
