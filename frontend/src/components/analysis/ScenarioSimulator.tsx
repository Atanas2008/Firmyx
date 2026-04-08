'use client';

import { useState, useEffect } from 'react';
import { SlidersHorizontal, ArrowDown, ArrowUp, Minus, Zap, Info, ArrowRight } from 'lucide-react';
import { analysisApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useLanguage } from '@/hooks/useLanguage';
import type { ScenarioResult, ScenarioAdjustments, ScenarioPreset } from '@/types';

interface ScenarioSimulatorProps {
  businessId: string;
}

function formatMetricValue(key: string, value: number | null): string {
  if (value === null) return 'N/A';
  if (key === 'profit_margin') return `${value.toFixed(1)}%`;
  if (key === 'debt_ratio') return `${(value * 100).toFixed(1)}%`;
  if (key === 'bankruptcy_probability') return `${value.toFixed(0)}%`;
  if (key === 'cash_runway_months') {
    if (value >= 999) return 'CF+';
    return value.toFixed(1);
  }
  return value.toFixed(2);
}

const DEFAULT_ADJUSTMENTS: ScenarioAdjustments = {
  revenue_change_pct: 0,
  revenue_change_abs: 0,
  expense_change_pct: 0,
  expense_change_abs: 0,
  debt_change_abs: 0,
  cash_change_abs: 0,
  cost_reduction_pct: 0,
};

export function ScenarioSimulator({ businessId }: ScenarioSimulatorProps) {
  const { t } = useLanguage();

  const METRIC_LABELS: Record<string, string> = {
    profit_margin: t.metrics.profitMargin,
    burn_rate: t.metrics.burnRate,
    cash_runway_months: t.scenario.cashRunwayMonths,
    debt_ratio: t.metrics.debtRatio,
    liquidity_ratio: t.metrics.liquidityRatio,
    altman_z_score: t.metrics.altmanZScore,
    risk_score: t.businesses.riskScore,
    financial_health_score: t.scenario.healthScore,
    bankruptcy_probability: t.scenario.bankruptcyProb,
  };

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [presets, setPresets] = useState<ScenarioPreset[]>([]);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const [adjustments, setAdjustments] = useState<ScenarioAdjustments>({ ...DEFAULT_ADJUSTMENTS });

  useEffect(() => {
    if (isOpen && presets.length === 0) {
      analysisApi.scenarioPresets(businessId).then((res) => setPresets(res.data)).catch(() => {});
    }
  }, [isOpen, businessId, presets.length]);

  async function runScenario() {
    setLoading(true);
    setError('');
    try {
      const payload: ScenarioAdjustments = activePreset
        ? { ...adjustments, preset: activePreset }
        : adjustments;
      const res = await analysisApi.scenario(businessId, payload);
      setResult(res.data);
    } catch {
      setError(t.scenario.failedToSimulate);
    } finally {
      setLoading(false);
    }
  }

  function applyPreset(key: string) {
    setActivePreset(key);
    setAdjustments({ ...DEFAULT_ADJUSTMENTS });
    setResult(null);
  }

  function resetAdjustments() {
    setAdjustments({ ...DEFAULT_ADJUSTMENTS });
    setActivePreset(null);
    setResult(null);
  }

  return (
    <div className="space-y-4">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {t.scenario.simulatorTitle}
          </span>
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500">{isOpen ? t.scenario.collapse : t.scenario.expand}</span>
      </button>

      {isOpen && (
        <div className="space-y-5">
          {/* Preset cards */}
          {presets.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {t.scenario.quickScenarios}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {presets.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => applyPreset(p.key)}
                    className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                      activePreset === p.key
                        ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-500'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Zap className={`h-3.5 w-3.5 ${activePreset === p.key ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
                      <span className="text-xs font-medium text-gray-800 dark:text-gray-100 truncate">{p.label}</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2">{p.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sliders */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SliderInput
              label={t.scenario.revenueChange}
              suffix="%"
              min={-50}
              max={50}
              step={1}
              value={adjustments.revenue_change_pct}
              onChange={(v) => setAdjustments((a) => ({ ...a, revenue_change_pct: v }))}
            />
            <SliderInput
              label={t.scenario.expenseChange}
              suffix="%"
              min={-50}
              max={50}
              step={1}
              value={adjustments.expense_change_pct}
              onChange={(v) => setAdjustments((a) => ({ ...a, expense_change_pct: v }))}
            />
            <SliderInput
              label={t.scenario.debtChange}
              suffix="$"
              min={-200000}
              max={200000}
              step={5000}
              value={adjustments.debt_change_abs}
              onChange={(v) => setAdjustments((a) => ({ ...a, debt_change_abs: v }))}
              formatDisplay={(v) =>
                v >= 0 ? `+$${v.toLocaleString()}` : `-$${Math.abs(v).toLocaleString()}`
              }
            />
            <SliderInput
              label={t.scenario.cashInjection}
              suffix="$"
              min={0}
              max={1000000}
              step={10000}
              value={adjustments.cash_change_abs}
              onChange={(v) => setAdjustments((a) => ({ ...a, cash_change_abs: v }))}
              formatDisplay={(v) => `+$${v.toLocaleString()}`}
            />
            <SliderInput
              label={t.scenario.costReduction}
              suffix="%"
              min={0}
              max={30}
              step={1}
              value={adjustments.cost_reduction_pct}
              onChange={(v) => setAdjustments((a) => ({ ...a, cost_reduction_pct: v }))}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={runScenario}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {loading ? t.scenario.simulating : t.scenario.simulate}
            </button>
            <button
              type="button"
              onClick={resetAdjustments}
              className="rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {t.scenario.reset}
            </button>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {loading && <LoadingSpinner />}

          {/* Summary banner */}
          {result && !loading && result.summary && (
            <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm text-blue-800 dark:text-blue-200">{result.summary}</p>
                {result.disclaimer && (
                  <p className="mt-1 text-[11px] italic text-blue-600/70 dark:text-blue-300/60">{result.disclaimer}</p>
                )}
              </div>
            </div>
          )}

          {/* Before/After score comparison hero */}
          {result && !loading && result.comparison.risk_score && (
            <ScoreComparisonHero comparison={result.comparison} t={t} />
          )}

          {/* Results */}
          {result && !loading && (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-3 text-left font-medium">{t.scenario.metric}</th>
                    <th className="px-4 py-3 text-right font-medium">{t.scenario.original}</th>
                    <th className="px-4 py-3 text-right font-medium">{t.scenario.simulated}</th>
                    <th className="px-4 py-3 text-right font-medium">{t.scenario.change}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {Object.entries(result.comparison).map(([key, cmp]) => {
                    const label = METRIC_LABELS[key] ?? key;
                    return (
                      <tr key={key} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{label}</td>
                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                          {formatMetricValue(key, cmp.original)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-gray-100">
                          {formatMetricValue(key, cmp.adjusted)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <DirectionBadge
                            direction={cmp.direction}
                            delta={cmp.delta}
                            metricKey={key}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Post-scenario CTA */}
          {result && !loading && (
            <div className="flex flex-col gap-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-5">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                {t.conversion.saveAndTrack}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t.conversion.saveAndTrackDesc}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

interface SliderInputProps {
  label: string;
  suffix: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (val: number) => void;
  formatDisplay?: (val: number) => string;
}

function SliderInput({ label, suffix, min, max, step, value, onChange, formatDisplay }: SliderInputProps) {
  const display = formatDisplay ? formatDisplay(value) : `${value}${suffix}`;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}</label>
        <span className="text-xs font-semibold text-gray-800 dark:text-gray-100">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-600"
      />
    </div>
  );
}

interface DirectionBadgeProps {
  direction: string;
  delta: number | null;
  metricKey: string;
}

function DirectionBadge({ direction, delta, metricKey }: DirectionBadgeProps) {
  if (delta === null) return <span className="text-xs text-gray-400 dark:text-gray-500">N/A</span>;

  const Icon = direction === 'better' ? ArrowUp : direction === 'worse' ? ArrowDown : Minus;
  const colorClass =
    direction === 'better'
      ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
      : direction === 'worse'
        ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
        : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700';

  let displayDelta: string;
  if (metricKey === 'profit_margin' || metricKey === 'bankruptcy_probability') {
    displayDelta = `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`;
  } else if (metricKey === 'debt_ratio') {
    displayDelta = `${delta > 0 ? '+' : ''}${(delta * 100).toFixed(1)}%`;
  } else {
    displayDelta = `${delta > 0 ? '+' : ''}${delta.toFixed(2)}`;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${colorClass}`}
    >
      <Icon className="h-3 w-3" />
      {displayDelta}
    </span>
  );
}

// ─── Before/After Score Comparison ────────────────────────────────────────────

import type { MetricComparison } from '@/types';

function scoreColor(score: number): string {
  if (score > 70) return 'text-red-600 dark:text-red-400';
  if (score > 50) return 'text-orange-600 dark:text-orange-400';
  if (score > 30) return 'text-amber-600 dark:text-amber-400';
  return 'text-emerald-600 dark:text-emerald-400';
}

function scoreRing(score: number): string {
  if (score > 70) return 'ring-red-500';
  if (score > 50) return 'ring-orange-500';
  if (score > 30) return 'ring-amber-500';
  return 'ring-emerald-500';
}

function statusFromScore(score: number, t: ReturnType<typeof useLanguage>['t']): string {
  if (score > 70) return t.conversion.statusHigh;
  if (score > 30) return t.conversion.statusModerate;
  return t.conversion.statusLow;
}

function ScoreComparisonHero({ comparison, t }: { comparison: Record<string, MetricComparison>; t: ReturnType<typeof useLanguage>['t'] }) {
  const riskCmp = comparison.risk_score;
  if (!riskCmp || riskCmp.original === null || riskCmp.adjusted === null) return null;

  const origScore = riskCmp.original;
  const newScore = riskCmp.adjusted;
  const improved = newScore < origScore;

  return (
    <div className={`rounded-xl border p-5 ${
      improved ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/20' : 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20'
    }`}>
      <div className="flex items-center justify-center gap-6">
        {/* Before */}
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">{t.scenario.original}</p>
          <div className={`flex h-16 w-16 items-center justify-center rounded-full ring-3 ${scoreRing(origScore)} bg-white dark:bg-gray-900 mx-auto`}>
            <span className={`text-xl font-bold ${scoreColor(origScore)}`}>{Math.round(origScore)}</span>
          </div>
          <p className={`text-xs font-medium mt-1 ${scoreColor(origScore)}`}>{statusFromScore(origScore, t)}</p>
        </div>

        {/* Arrow */}
        <div className="flex flex-col items-center">
          <ArrowRight className={`h-6 w-6 ${improved ? 'text-emerald-500' : 'text-amber-500'}`} />
          {riskCmp.delta !== null && (
            <span className={`text-xs font-bold mt-0.5 ${improved ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {riskCmp.delta > 0 ? '+' : ''}{riskCmp.delta.toFixed(0)} pts
            </span>
          )}
        </div>

        {/* After */}
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">{t.scenario.simulated}</p>
          <div className={`flex h-16 w-16 items-center justify-center rounded-full ring-3 ${scoreRing(newScore)} bg-white dark:bg-gray-900 mx-auto`}>
            <span className={`text-xl font-bold ${scoreColor(newScore)}`}>{Math.round(newScore)}</span>
          </div>
          <p className={`text-xs font-medium mt-1 ${scoreColor(newScore)}`}>{statusFromScore(newScore, t)}</p>
        </div>
      </div>
    </div>
  );
}
