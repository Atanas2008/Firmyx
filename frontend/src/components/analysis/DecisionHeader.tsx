'use client';

import Link from 'next/link';
import { ArrowRight, Shield } from 'lucide-react';
import { buildValidatedMetrics } from '@/lib/aiInsights';
import { useLanguage } from '@/hooks/useLanguage';
import type { RiskAnalysis } from '@/types';

interface DecisionHeaderProps {
  analysis: RiskAnalysis;
  scenarioHref?: string;
}

function riskColor(score: number) {
  if (score > 80) return { ring: 'ring-red-700', text: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/50', border: 'border-red-300 dark:border-red-700' };
  if (score > 60) return { ring: 'ring-red-500', text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30', border: 'border-red-200 dark:border-red-800' };
  if (score > 40) return { ring: 'ring-amber-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30', border: 'border-amber-200 dark:border-amber-800' };
  if (score > 20) return { ring: 'ring-blue-500', text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30', border: 'border-blue-200 dark:border-blue-800' };
  return { ring: 'ring-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30', border: 'border-emerald-200 dark:border-emerald-800' };
}

function statusLabel(m: ReturnType<typeof buildValidatedMetrics>, t: ReturnType<typeof useLanguage>['t']): { label: string; color: string } {
  if (m.risk_score > 80) return { label: t.decision.critical ?? 'CRITICAL', color: 'text-red-700 dark:text-red-300 font-black' };
  if (m.is_structurally_fragile) return { label: t.decision.structurallyFragile, color: 'text-red-600 dark:text-red-400' };
  if (m.risk_score > 60) return { label: t.decision.distressed ?? 'DISTRESSED', color: 'text-red-600 dark:text-red-400' };
  if (m.is_working_capital_constrained) return { label: t.decision.workingCapitalConstrained, color: 'text-amber-600 dark:text-amber-400' };
  if (m.risk_score > 40) return { label: t.decision.elevated ?? 'ELEVATED RISK', color: 'text-amber-600 dark:text-amber-400' };
  if (m.risk_score > 20) return { label: t.decision.stable ?? 'STABLE', color: 'text-blue-600 dark:text-blue-400' };
  return { label: t.decision.strongPosition, color: 'text-emerald-600 dark:text-emerald-400' };
}

function buildTopDrivers(m: ReturnType<typeof buildValidatedMetrics>): string[] {
  const drivers: string[] = [];
  if (m.liquidity_ratio < 1) drivers.push(`Liquidity ratio ${m.liquidity_ratio.toFixed(2)} — below 1.0`);
  if (m.debt_ratio >= 0.6) drivers.push(`Debt ratio ${(m.debt_ratio * 100).toFixed(0)}% — high leverage`);
  if (m.altman_z < 1.8) drivers.push(`Z-Score ${m.altman_z.toFixed(2)} — distress zone`);
  if (m.profit_margin < 0) drivers.push(`Profit margin ${m.profit_margin.toFixed(1)}% — operating at loss`);
  if (m.revenue_trend_label === 'Declining') drivers.push(`Revenue declining ${(Math.abs(m.revenue_trend_value) * 100).toFixed(1)}% MoM`);
  if (m.burn_rate > 0 && m.runway_label.includes('critical')) drivers.push(`Cash runway critical — ${m.runway_label.split(' —')[0]}`);
  if (m.bankruptcy_probability > 30) drivers.push(`Bankruptcy probability ${m.bankruptcy_probability.toFixed(0)}%`);
  if (m.expense_trend_value * 100 > 15) drivers.push(`Expenses rising ${(m.expense_trend_value * 100).toFixed(1)}% MoM`);
  if (m.liquidity_ratio >= 1 && m.liquidity_ratio < 1.2) drivers.push(`Liquidity ratio ${m.liquidity_ratio.toFixed(2)} — watch zone`);
  if (m.altman_z >= 1.8 && m.altman_z < 3) drivers.push(`Z-Score ${m.altman_z.toFixed(2)} — grey zone`);
  if (m.profit_margin >= 0 && m.profit_margin < 5) drivers.push(`Thin margins at ${m.profit_margin.toFixed(1)}%`);
  return drivers.slice(0, 3);
}

export function DecisionHeader({ analysis, scenarioHref }: DecisionHeaderProps) {
  const { t } = useLanguage();
  const m = buildValidatedMetrics(analysis);
  const color = riskColor(m.risk_score);
  const status = statusLabel(m, t);
  const drivers = buildTopDrivers(m);
  const bankruptcyProb = m.bankruptcy_probability;
  const indicatorCount = 6; // liquidity, debt, profit, z-score, revenue trend, bankruptcy

  return (
    <div className={`rounded-xl border-2 ${color.border} ${color.bg} p-4 sm:p-5`}>
      <div className="flex flex-col gap-4 sm:gap-5 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: Risk score + status */}
        <div className="flex flex-col items-center sm:flex-row sm:items-start gap-4 sm:gap-5">
          {/* Score circle */}
          <div className={`flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-full ring-4 ${color.ring} bg-white dark:bg-gray-900 shadow-lg`}>
            <div className="text-center">
              <span className={`text-3xl font-black ${color.text}`}>{Math.round(m.risk_score)}</span>
              <p className="text-[10px] text-gray-400 -mt-0.5">/100</p>
            </div>
          </div>

          <div className="space-y-1.5 text-center sm:text-left">
            <h2 className={`text-lg sm:text-xl font-bold ${status.color}`}>{status.label}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t.decision.riskScore}: {Math.round(m.risk_score)} · {t.decision.healthScore}: {Math.round(m.health_score)}</p>

            {/* Bankruptcy probability */}
            {bankruptcyProb > 0 && (
              <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">{t.decision.bankruptcyProb}:</span>
                <span className={`text-sm font-semibold ${
                  bankruptcyProb > 30 ? 'text-red-600 dark:text-red-400' :
                  bankruptcyProb > 15 ? 'text-amber-600 dark:text-amber-400' :
                  'text-emerald-600 dark:text-emerald-400'
                }`}>{bankruptcyProb.toFixed(0)}%</span>
              </div>
            )}

            {/* Trust badge */}
            <div className="flex items-center justify-center sm:justify-start gap-1 mt-1.5">
              <Shield className="h-3 w-3 text-gray-400" />
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                {t.conversion.basedOnIndicators.replace('{count}', String(indicatorCount))}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Top risk drivers */}
        {drivers.length > 0 && (
          <div className="text-center sm:text-right">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">{t.decision.topRiskDrivers}</p>
            <ul className="space-y-1">
              {drivers.map((d, i) => (
                <li key={i} className={`text-sm flex items-center justify-center sm:justify-end gap-1.5 ${
                  i === 0 ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                    i === 0 ? 'bg-red-500' : i === 1 ? 'bg-amber-500' : 'bg-gray-400'
                  }`} />
                  {d}
                </li>
              ))}
            </ul>

            {/* CTA */}
            {scenarioHref && m.risk_score > 30 && (
              <Link
                href={scenarioHref}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 sm:px-3.5 sm:py-1.5 text-sm sm:text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm w-full sm:w-auto justify-center"
              >
                {t.conversion.reduceYourRisk}
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
