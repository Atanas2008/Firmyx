/**
 * Financial Insights Engine — deterministic, rule-based.
 *
 * SINGLE SOURCE OF TRUTH: Every function draws from one validated metrics
 * snapshot derived from the RiskAnalysis object. No section computes its
 * own independent version of any metric.
 *
 * Priority engine:
 *   HIGH   — liquidity_ratio < 1.0, debt_ratio > 60%, Altman Z < 1.8
 *   MEDIUM — profit_margin < 5%, revenue Flat/Declining, bankruptcy >= 15%
 *   LOW    — optimisation / non-urgent improvements only
 */

import type { RiskAnalysis } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Priority = 'High' | 'Medium' | 'Low';

export interface Recommendation {
  title: string;
  text: string;
  priority: Priority;
  category: 'Liquidity' | 'Leverage' | 'Profitability' | 'Revenue' | 'Stability';
  metric_trigger: string;
  current_value: string;
  target_value: string;
  estimated_impact: string;
  timeframe: string;
}

type RecommendationDraft = Omit<Recommendation, 'title' | 'timeframe'>;

export interface BiggestRisk {
  label: string;
  explanation: string;
  potentialScoreReduction: number;
  category: string;
}

export interface UrgencyAlert {
  text: string;
  severity: 'critical' | 'warning';
  monthsAffected: number;
}

export interface ScoreChange {
  previousScore: number;
  currentScore: number;
  delta: number;
  improved: boolean;
  previousDate: string;
}

export interface InsightItem {
  text: string;
  severity: number;
  trend_direction: 'improving' | 'worsening' | 'stable' | 'unknown';
}

export type RevenueTrendLabel = 'Increasing' | 'Flat' | 'Declining' | 'Volatile' | 'Insufficient data';

export interface ValidatedMetrics {
  risk_score: number;
  health_score: number;
  profit_margin: number;
  burn_rate: number;
  runway_label: string;
  liquidity_ratio: number;
  debt_ratio: number;
  altman_z: number;
  bankruptcy_probability: number;
  revenue_trend_label: RevenueTrendLabel;
  revenue_trend_value: number;
  expense_trend_label: string;
  expense_trend_value: number;
  is_working_capital_constrained: boolean;
  is_structurally_fragile: boolean;
}

export interface FinancialInsights {
  summary: string;
  executiveSummary: string;
  recommendations: Recommendation[];
  positiveIndicators: string[];
  riskIndicators: string[];
  insightItems: InsightItem[];
  overallVerdict: 'strong' | 'moderate' | 'weak';
  metrics: ValidatedMetrics;
}

// ─── Validated Metrics Builder (Single Source of Truth) ───────────────────────

function classifyRevenueTrend(rt: number | null): { label: RevenueTrendLabel; value: number } {
  if (rt === null || rt === undefined) return { label: 'Insufficient data', value: 0 };
  const pct = rt * 100;
  if (pct > 1)  return { label: 'Increasing', value: rt };
  if (pct < -1) return { label: 'Declining', value: rt };
  return { label: 'Flat', value: rt };
}

function classifyExpenseTrend(et: number | null): { label: string; value: number } {
  if (et === null || et === undefined) return { label: 'Stable', value: 0 };
  const pct = et * 100;
  if (pct > 5)  return { label: `Rising (${pct.toFixed(1)}% MoM)`, value: et };
  if (pct < -1) return { label: `Declining (${pct.toFixed(1)}% MoM)`, value: et };
  return { label: 'Stable', value: et };
}

function resolveRunwayLabel(a: RiskAnalysis, isWCConstrained: boolean): string {
  // Use backend-provided label if available (v4.0+)
  if (a.runway_label) return a.runway_label;

  if (a.burn_rate > 0 && a.cash_runway_months !== null) {
    if (a.cash_runway_months < 3)  return `${a.cash_runway_months.toFixed(1)} months \u2014 critical`;
    if (a.cash_runway_months < 6)  return `${a.cash_runway_months.toFixed(1)} months \u2014 tight`;
    if (a.cash_runway_months < 12) return `${a.cash_runway_months.toFixed(1)} months`;
    return `${a.cash_runway_months.toFixed(0)} months \u2014 comfortable`;
  }
  if (isWCConstrained) return 'Working-capital constrained';
  return 'No burn (cash-flow positive)';
}

export function buildValidatedMetrics(a: RiskAnalysis): ValidatedMetrics {
  const isWCConstrained = a.burn_rate === 0 && a.liquidity_ratio < 1.0;
  const isStructurallyFragile = a.debt_ratio >= 0.6 && a.altman_z_score < 1.8;
  // Use backend label if available (v4.0+), otherwise classify locally
  const revTrend = a.revenue_trend_label
    ? { label: a.revenue_trend_label as RevenueTrendLabel, value: a.revenue_trend ?? 0 }
    : classifyRevenueTrend(a.revenue_trend);
  const expTrend = classifyExpenseTrend(a.expense_trend);

  return {
    risk_score: a.risk_score,
    health_score: a.financial_health_score ?? (100 - a.risk_score),
    profit_margin: a.profit_margin,
    burn_rate: a.burn_rate,
    runway_label: resolveRunwayLabel(a, isWCConstrained),
    liquidity_ratio: a.liquidity_ratio,
    debt_ratio: a.debt_ratio,
    altman_z: a.altman_z_score,
    bankruptcy_probability: a.bankruptcy_probability ?? 0,
    revenue_trend_label: revTrend.label,
    revenue_trend_value: revTrend.value,
    expense_trend_label: expTrend.label,
    expense_trend_value: expTrend.value,
    is_working_capital_constrained: isWCConstrained,
    is_structurally_fragile: isStructurallyFragile,
  };
}

// ─── Label helpers (CFO/credit-analyst language) ─────────────────────────────

function profitMarginLabel(pm: number): string {
  if (pm >= 20) return 'strong margins';
  if (pm >= 10) return 'healthy margins';
  if (pm >= 5)  return 'thin margins';
  if (pm >= 0)  return 'razor-thin margins that reduce shock absorption';
  return 'negative margins \u2014 the business is operating at a loss';
}

function liquidityLabel(lr: number): string {
  if (lr >= 2)   return 'strong liquidity';
  if (lr >= 1.2) return 'adequate liquidity';
  if (lr >= 1)   return 'liquidity in the watch zone';
  return 'constrained liquidity \u2014 current liabilities exceed current assets';
}

function debtLabel(dr: number): string {
  if (dr < 0.3) return 'low leverage';
  if (dr < 0.6) return 'moderate leverage';
  return 'high leverage that limits financial flexibility';
}

function zScoreZone(z: number): string {
  if (z >= 3)   return 'safe zone';
  if (z >= 1.8) return 'grey zone';
  return 'distress zone';
}

// ─── Positive & Risk Indicator Builders ──────────────────────────────────────

function buildPositiveIndicators(m: ValidatedMetrics): string[] {
  const positives: string[] = [];

  if (m.profit_margin >= 10)
    positives.push(`Profit margin of ${m.profit_margin.toFixed(1)}% reflects solid earnings quality.`);
  if (m.liquidity_ratio >= 1.2)
    positives.push(`Liquidity ratio of ${m.liquidity_ratio.toFixed(2)} provides a comfortable buffer against short-term obligations.`);
  if (m.debt_ratio < 0.3)
    positives.push(`Debt ratio of ${(m.debt_ratio * 100).toFixed(1)}% indicates conservative leverage.`);
  if (m.revenue_trend_label === 'Increasing')
    positives.push(`Revenue growing at ${(m.revenue_trend_value * 100).toFixed(1)}% MoM, reflecting positive momentum.`);
  if (m.altman_z >= 3)
    positives.push(`Altman Z-score of ${m.altman_z.toFixed(2)} confirms low insolvency risk.`);
  if (m.bankruptcy_probability <= 10 && m.bankruptcy_probability > 0)
    positives.push(`Bankruptcy probability of ${m.bankruptcy_probability.toFixed(0)}% is well within safe thresholds.`);
  // Do NOT list "cash-flow positive" as a positive if WC-constrained (Rule #2)
  if (m.burn_rate === 0 && !m.is_working_capital_constrained)
    positives.push('Cash-flow positive \u2014 reserves are not being depleted.');

  return positives;
}

function buildRiskIndicators(m: ValidatedMetrics): string[] {
  const risks: string[] = [];

  // Working-capital constrained (Rule #2 special case)
  if (m.is_working_capital_constrained)
    risks.push(`Profitable or cash-flow positive, but working-capital constrained. Positive operating cash flow does not eliminate short-term balance-sheet risk when current liabilities exceed current assets (liquidity ratio: ${m.liquidity_ratio.toFixed(2)}).`);
  else if (m.liquidity_ratio < 1)
    risks.push(`Liquidity ratio of ${m.liquidity_ratio.toFixed(2)} \u2014 current liabilities exceed current assets. Working capital action required.`);
  else if (m.liquidity_ratio < 1.2)
    risks.push(`Liquidity ratio of ${m.liquidity_ratio.toFixed(2)} is in the watch zone (1.0\u20131.2) \u2014 limited buffer against short-term obligations.`);

  // Structurally fragile (special case)
  if (m.is_structurally_fragile)
    risks.push(`Structurally fragile and highly leveraged: debt ratio of ${(m.debt_ratio * 100).toFixed(1)}% combined with Altman Z-score of ${m.altman_z.toFixed(2)} in the distress zone.`);
  else if (m.debt_ratio >= 0.6)
    risks.push(`Debt ratio of ${(m.debt_ratio * 100).toFixed(1)}% \u2014 high leverage limits financial flexibility.`);

  if (m.profit_margin < 0) {
    const lossNote = m.burn_rate > 0
      ? ` The business is consuming approximately $${m.burn_rate.toLocaleString(undefined, { maximumFractionDigits: 0 })} per month in excess of revenue.`
      : '';
    risks.push(`Negative profit margin of ${m.profit_margin.toFixed(1)}% \u2014 the business is operating at a loss.${lossNote}`);
  } else if (m.profit_margin < 5) {
    risks.push(`Profit margin of ${m.profit_margin.toFixed(1)}% is razor-thin, leaving minimal buffer against cost increases or revenue dips.`);
  }

  if (m.revenue_trend_label === 'Declining')
    risks.push(`Revenue declining at ${(Math.abs(m.revenue_trend_value) * 100).toFixed(1)}% MoM, pressuring cash flow generation.`);

  // Revenue falling + expenses rising
  if (m.revenue_trend_value < 0 && m.expense_trend_value > 0)
    risks.push('Revenue is falling while costs are rising \u2014 a compounding risk that will accelerate cash depletion.');

  if (m.altman_z < 1.8 && !m.is_structurally_fragile)
    risks.push(`Altman Z-score of ${m.altman_z.toFixed(2)} falls in the distress zone, warranting immediate attention.`);

  // Bankruptcy probability (Rule #6 \u2014 always include driver context)
  if (m.bankruptcy_probability > 30) {
    const drivers: string[] = [];
    if (m.altman_z < 1.8)      drivers.push('distress-zone Altman Z-score');
    if (m.liquidity_ratio < 1) drivers.push('sub-1 liquidity');
    if (m.debt_ratio >= 0.6)   drivers.push('high leverage');
    if (m.profit_margin < 0)   drivers.push('negative profitability');
    risks.push(`Bankruptcy probability of ${m.bankruptcy_probability.toFixed(0)}% is elevated${drivers.length > 0 ? ', driven by ' + drivers.join(', ') : ''}. Urgent structural review required.`);
  } else if (m.bankruptcy_probability >= 15) {
    const drivers: string[] = [];
    if (m.altman_z < 3)         drivers.push(`grey-zone Z-score of ${m.altman_z.toFixed(2)}`);
    if (m.liquidity_ratio < 1.2) drivers.push('tight liquidity');
    if (m.debt_ratio >= 0.3)    drivers.push(`${(m.debt_ratio * 100).toFixed(0)}% debt ratio`);
    risks.push(`Bankruptcy probability of ${m.bankruptcy_probability.toFixed(0)}% warrants close monitoring${drivers.length > 0 ? ', linked to ' + drivers.join(', ') : ''}.`);
  }

  // Cash runway warnings
  if (m.burn_rate > 0) {
    if (m.runway_label.includes('critical'))
      risks.push(`Cash will be exhausted in approximately ${m.runway_label.split(' ')[0]} months at current burn. Immediate action is critical.`);
    else if (m.runway_label.includes('tight'))
      risks.push(`Cash runway of ${m.runway_label.split(' ')[0]} months creates near-term liquidity pressure.`);
  }

  if (m.expense_trend_value * 100 > 15)
    risks.push(`Expense growth of ${(m.expense_trend_value * 100).toFixed(1)}% MoM is outpacing sustainable growth rates.`);

  return risks;
}

// ─── Verdict ──────────────────────────────────────────────────────────────────

function computeVerdict(m: ValidatedMetrics): 'strong' | 'moderate' | 'weak' {
  // Structurally fragile is always weak
  if (m.is_structurally_fragile) return 'weak';
  if (m.risk_score > 50) return 'weak';

  // SPECIAL RULE: debt_ratio > 60% OR Z < 2.5 → never "strong"
  const isFinanciallyConstrained = m.debt_ratio > 0.6 || m.altman_z < 2.5;

  // Multiple high-severity issues
  const highSeverityCount = [
    m.liquidity_ratio < 1,
    m.debt_ratio >= 0.6,
    m.altman_z < 1.8,
    m.profit_margin < 0,
  ].filter(Boolean).length;
  if (highSeverityCount >= 2) return 'weak';

  const risks = buildRiskIndicators(m);
  const positives = buildPositiveIndicators(m);
  if (!isFinanciallyConstrained && risks.length === 0 && positives.length >= 3 && m.risk_score <= 30) return 'strong';
  if (!isFinanciallyConstrained && m.risk_score <= 30 && m.altman_z >= 2) return 'strong';

  return 'moderate';
}

// ─── Summary Generator (Rule #7 \u2014 CFO/credit-analyst tone) ─────────────────

export function generateFinancialSummary(analysis: RiskAnalysis): string {
  const m = buildValidatedMetrics(analysis);
  const verdict = computeVerdict(m);
  const risks = buildRiskIndicators(m);
  const positives = buildPositiveIndicators(m);

  const openings: Record<typeof verdict, string> = {
    strong:   'This business occupies a strong financial position',
    moderate: 'This business presents a mixed financial profile',
    weak:     'This business faces material financial headwinds',
  };

  let summary = openings[verdict];

  // Special-case compound descriptions
  if (m.is_structurally_fragile) {
    summary += ', structurally fragile and highly leveraged';
  } else if (m.is_working_capital_constrained) {
    summary += ', profitable but working-capital constrained';
  }

  summary += `, characterised by ${profitMarginLabel(m.profit_margin)}, ${liquidityLabel(m.liquidity_ratio)}, and ${debtLabel(m.debt_ratio)}.`;

  // Top positive
  if (positives.length > 0 && verdict !== 'weak') {
    summary += ` ${positives[0]}`;
  }

  // Top risk
  if (risks.length > 0) {
    summary += ` ${risks[0]}`;
  }

  // Z-score context
  summary += ` The Altman Z-score of ${m.altman_z.toFixed(2)} places the business in the ${zScoreZone(m.altman_z)}`;
  if (m.altman_z >= 3) {
    summary += ', substantially reducing insolvency risk.';
  } else if (m.altman_z >= 1.8) {
    summary += '; proactive monitoring is warranted.';
  } else {
    summary += '; immediate corrective action is advisable.';
  }

  // Closing
  const closings: Record<typeof verdict, string> = {
    strong:   ' Maintain current financial discipline \u2014 focus on forecasting accuracy, margin preservation, and building liquidity reserves against downside scenarios.',
    moderate: ' Management should prioritise addressing identified vulnerabilities while building on existing strengths. Quarterly metric review is essential.',
    weak:     ' Immediate intervention at the strategic level is required to stabilise operations and restore financial resilience.',
  };
  summary += closings[verdict];
  return summary;
}

// ─── Executive Summary (Rule #7 \u2014 board-ready language) ────────────────────

export function generateExecutiveSummary(analysis: RiskAnalysis): string {
  const m = buildValidatedMetrics(analysis);
  const verdict = computeVerdict(m);

  const overallHealth: Record<typeof verdict, string> = {
    strong:   'The company presents a compelling financial profile',
    moderate: 'The company exhibits a stable but mixed financial position',
    weak:     'The company faces material financial headwinds requiring board attention',
  };

  let exec = `${overallHealth[verdict]}, characterised by ${profitMarginLabel(m.profit_margin)}, ${debtLabel(m.debt_ratio)}, ${liquidityLabel(m.liquidity_ratio)}, and ${m.revenue_trend_label.toLowerCase()} revenue.`;

  exec += ` Composite risk score: ${m.risk_score.toFixed(0)}/100`;
  if (m.health_score !== null) {
    exec += ` (Financial Health: ${m.health_score.toFixed(0)}/100)`;
  }
  exec += '.';

  // Z-score
  exec += ` Altman Z-score of ${m.altman_z.toFixed(2)} (${zScoreZone(m.altman_z)})`;
  if (m.altman_z >= 3) {
    exec += ' confirms low insolvency risk.';
  } else if (m.altman_z >= 1.8) {
    exec += ' warrants proactive monitoring.';
  } else {
    exec += ' requires board-level attention as it falls below the distress threshold.';
  }

  // Bankruptcy probability (Rule #6 \u2014 always tie to drivers)
  if (m.bankruptcy_probability > 0) {
    const drivers: string[] = [];
    if (m.altman_z < 1.8)      drivers.push('distress-zone Z-score');
    else if (m.altman_z < 3)   drivers.push('grey-zone Z-score');
    if (m.liquidity_ratio < 1) drivers.push('sub-1 liquidity');
    if (m.debt_ratio >= 0.6)   drivers.push('high leverage');
    if (m.profit_margin < 5)   drivers.push('thin profitability');
    const driverStr = drivers.length > 0 ? `, driven primarily by ${drivers.join(', ')}` : '';

    if (m.bankruptcy_probability <= 10) {
      exec += ` Estimated bankruptcy probability of ${m.bankruptcy_probability.toFixed(0)}%${driverStr} affirms near-term solvency.`;
    } else if (m.bankruptcy_probability <= 30) {
      exec += ` Bankruptcy probability of ${m.bankruptcy_probability.toFixed(0)}%${driverStr} requires management oversight and contingency planning.`;
    } else {
      exec += ` Bankruptcy probability of ${m.bankruptcy_probability.toFixed(0)}%${driverStr} is elevated; capital restructuring or liquidity injection should be evaluated without delay.`;
    }
  }

  // Special-case labels
  if (m.is_structurally_fragile) {
    exec += ' The business is structurally fragile and highly leveraged \u2014 urgent deleveraging or recapitalisation is needed.';
  } else if (m.is_working_capital_constrained) {
    exec += ' Despite positive operating cash flow, working-capital constraints create short-term balance-sheet risk that must be addressed.';
  }

  const closings: Record<typeof verdict, string> = {
    strong:   ' The board is advised to maintain current controls and explore strategic growth opportunities.',
    moderate: ' The board should prioritise targeted interventions in identified risk areas to strengthen long-term resilience.',
    weak:     ' Urgent board action is required to address structural vulnerabilities and protect stakeholder value.',
  };
  exec += closings[verdict];
  return exec;
}
// ─── Recommendation Enrichment ────────────────────────────────────────────────

const REC_TITLES: Record<string, Record<Priority, string>> = {
  liquidity_ratio:       { High: 'Improve working capital',    Medium: 'Build liquidity buffer',    Low: 'Build liquidity buffer' },
  debt_ratio:            { High: 'Reduce debt exposure',       Medium: 'Reduce leverage',           Low: 'Reduce leverage gradually' },
  altman_z_score:        { High: 'Develop turnaround plan',    Medium: 'Strengthen balance sheet',  Low: 'Strengthen balance sheet' },
  cash_runway_months:    { High: 'Extend cash runway',         Medium: 'Extend cash runway',        Low: 'Extend cash runway' },
  profit_margin:         { High: 'Stop the cash drain',        Medium: 'Improve margins',           Low: 'Optimise pricing' },
  revenue_trend:         { High: 'Reverse revenue decline',    Medium: 'Reverse revenue decline',   Low: 'Accelerate growth' },
  bankruptcy_probability:{ High: 'Reduce insolvency risk',     Medium: 'Reduce insolvency risk',    Low: 'Reduce insolvency risk' },
  expense_trend:         { High: 'Control expense growth',     Medium: 'Control expense growth',    Low: 'Control expense growth' },
};

const TIMEFRAMES: Record<Priority, string> = { High: 'Immediate', Medium: '1–3 months', Low: '3–6 months' };

function enrichRecommendation(draft: RecommendationDraft): Recommendation {
  return {
    ...draft,
    title: REC_TITLES[draft.metric_trigger]?.[draft.priority] ?? `Address ${draft.category.toLowerCase()}`,
    timeframe: TIMEFRAMES[draft.priority],
  };
}
// ─── Recommendations (Rules #4, #5 \u2014 strict priority, no duplicates) ───────

export function generateRecommendations(analysis: RiskAnalysis): Recommendation[] {
  const m = buildValidatedMetrics(analysis);
  const candidates: RecommendationDraft[] = [];

  // ── HIGH PRIORITY ───────────────────────────────────────────────────────────

  // Liquidity < 1.0
  if (m.liquidity_ratio < 1) {
    const extra = m.is_working_capital_constrained
      ? ' Although the business generates positive operating cash flow, current liabilities exceed current assets, creating structural short-term risk.'
      : '';
    candidates.push({
      priority: 'High', category: 'Liquidity',
      text: `Liquidity ratio of ${m.liquidity_ratio.toFixed(2)} is critically low.${extra} Improve working capital by accelerating receivables, reducing short-term obligations, and building a cash reserve above 3 months of operating expenses.`,
      metric_trigger: 'liquidity_ratio',
      current_value: m.liquidity_ratio.toFixed(2),
      target_value: '> 1.5',
      estimated_impact: 'Reduces risk score by ~10 points; eliminates structural short-term risk',
    });
  }

  // Debt > 60%
  if (m.debt_ratio >= 0.6) {
    candidates.push({
      priority: 'High', category: 'Leverage',
      text: `Debt ratio of ${(m.debt_ratio * 100).toFixed(1)}% exceeds the 60% high-risk threshold.${m.is_structurally_fragile ? ' Combined with a distress-zone Z-score, the business is structurally fragile \u2014 deleveraging is urgent.' : ''} Evaluate debt restructuring, extend maturities, or pursue equity financing.`,
      metric_trigger: 'debt_ratio',
      current_value: `${(m.debt_ratio * 100).toFixed(1)}%`,
      target_value: '< 40%',
      estimated_impact: 'Reduces risk score by ~12 points; improves Z-score and solvency metrics',
    });
  }

  // Altman Z < 1.8 (only if not already covered by leverage+fragile combined rec)
  if (m.altman_z < 1.8 && !m.is_structurally_fragile) {
    candidates.push({
      priority: 'High', category: 'Stability',
      text: `Altman Z-score of ${m.altman_z.toFixed(2)} signals financial distress. Engage financial advisors, develop a turnaround plan focused on improving working capital and retained earnings, and consider asset disposals to strengthen the balance sheet.`,
      metric_trigger: 'altman_z_score',
      current_value: m.altman_z.toFixed(2),
      target_value: '> 3.0',
      estimated_impact: 'Reduces risk score by ~20 points',
    });
  }

  // Cash runway critical
  if (m.burn_rate > 0 && m.runway_label.includes('critical')) {
    candidates.push({
      priority: 'High', category: 'Liquidity',
      text: `Cash runway is critically short (${m.runway_label.split(' \u2014')[0]}). Immediately explore bridge financing, reduce burn rate, or accelerate collections to extend runway beyond 12 months.`,
      metric_trigger: 'cash_runway_months',
      current_value: m.runway_label.split(' \u2014')[0],
      target_value: '> 12 months',
      estimated_impact: 'Critical for business survival',
    });
  }

  // ── MEDIUM PRIORITY ─────────────────────────────────────────────────────────

  if (m.profit_margin < 0) {
    candidates.push({
      priority: 'High', category: 'Profitability',
      text: `Negative profit margin of ${m.profit_margin.toFixed(1)}% \u2014 the business is operating at a loss. Conduct an immediate cost audit, review pricing strategy, and eliminate non-essential expenditures.`,
      metric_trigger: 'profit_margin',
      current_value: `${m.profit_margin.toFixed(1)}%`,
      target_value: '> 10%',
      estimated_impact: 'Reduces risk score by ~15 points; stops cash drain',
    });
  } else if (m.profit_margin < 5) {
    candidates.push({
      priority: 'Medium', category: 'Profitability',
      text: `Profit margin of ${m.profit_margin.toFixed(1)}% is thin \u2014 minimal buffer against cost increases or revenue dips. Review pricing against market benchmarks, identify COGS optimisation opportunities, and explore upsell/cross-sell revenue.`,
      metric_trigger: 'profit_margin',
      current_value: `${m.profit_margin.toFixed(1)}%`,
      target_value: '> 10%',
      estimated_impact: 'Reduces risk score by ~8 points',
    });
  } else if (m.profit_margin < 10) {
    candidates.push({
      priority: 'Medium', category: 'Profitability',
      text: `Profit margin of ${m.profit_margin.toFixed(1)}% is below the 10% target. Review product pricing and explore cost optimisation to improve margins.`,
      metric_trigger: 'profit_margin',
      current_value: `${m.profit_margin.toFixed(1)}%`,
      target_value: '> 10%',
      estimated_impact: 'Reduces risk score by ~5 points',
    });
  }

  // Revenue Flat or Declining
  if (m.revenue_trend_label === 'Declining') {
    candidates.push({
      priority: 'Medium', category: 'Revenue',
      text: `Revenue declining at ${(Math.abs(m.revenue_trend_value) * 100).toFixed(1)}% MoM. Investigate customer churn, reassess acquisition channels, and diversify revenue streams to reverse the trend.`,
      metric_trigger: 'revenue_trend',
      current_value: `${(m.revenue_trend_value * 100).toFixed(1)}%`,
      target_value: '> 0% (positive growth)',
      estimated_impact: 'Stabilises cash flow; reduces risk score by ~5 points',
    });
  } else if (m.revenue_trend_label === 'Flat') {
    candidates.push({
      priority: 'Medium', category: 'Revenue',
      text: `Revenue is flat (${(m.revenue_trend_value * 100).toFixed(1)}% MoM). Develop a structured growth plan \u2014 new customer acquisition, market expansion, or product extensions.`,
      metric_trigger: 'revenue_trend',
      current_value: `${(m.revenue_trend_value * 100).toFixed(1)}%`,
      target_value: '> 5% MoM',
      estimated_impact: 'Accelerates growth trajectory',
    });
  }

  // Bankruptcy >= 15%
  if (m.bankruptcy_probability >= 15 && m.bankruptcy_probability <= 30) {
    const drivers: string[] = [];
    if (m.altman_z < 3)         drivers.push(`Z-score in ${zScoreZone(m.altman_z)}`);
    if (m.liquidity_ratio < 1.2) drivers.push('tight liquidity');
    if (m.debt_ratio >= 0.3)    drivers.push(`${(m.debt_ratio * 100).toFixed(0)}% leverage`);
    candidates.push({
      priority: 'Medium', category: 'Stability',
      text: `Bankruptcy probability of ${m.bankruptcy_probability.toFixed(0)}% warrants attention${drivers.length ? ' (' + drivers.join(', ') + ')' : ''}. Focus on improving retained earnings, reducing current liabilities, and monitoring Z-score quarterly.`,
      metric_trigger: 'bankruptcy_probability',
      current_value: `${m.bankruptcy_probability.toFixed(0)}%`,
      target_value: '< 10%',
      estimated_impact: 'Reduces insolvency risk',
    });
  }

  // Expense growth elevated
  if (m.expense_trend_value * 100 > 15) {
    candidates.push({
      priority: 'Medium', category: 'Profitability',
      text: `Expenses rising at ${(m.expense_trend_value * 100).toFixed(1)}% MoM \u2014 significantly above sustainable thresholds. Implement spending controls and conduct vendor renegotiations.`,
      metric_trigger: 'expense_trend',
      current_value: `${(m.expense_trend_value * 100).toFixed(1)}%`,
      target_value: '< 5%',
      estimated_impact: 'Reduces burn rate; extends runway',
    });
  }

  // ── LOW PRIORITY ────────────────────────────────────────────────────────────

  if (m.liquidity_ratio >= 1.2 && m.liquidity_ratio < 2) {
    candidates.push({
      priority: 'Low', category: 'Liquidity',
      text: `Liquidity ratio of ${m.liquidity_ratio.toFixed(2)} is adequate but below the 2.0 target. Consider extending credit lines to expand the buffer.`,
      metric_trigger: 'liquidity_ratio',
      current_value: m.liquidity_ratio.toFixed(2),
      target_value: '> 2.0',
      estimated_impact: 'Improves financial stability buffer',
    });
  }

  if (m.debt_ratio >= 0.3 && m.debt_ratio < 0.6) {
    candidates.push({
      priority: 'Low', category: 'Leverage',
      text: `Debt ratio of ${(m.debt_ratio * 100).toFixed(1)}% is moderate. Avoid additional leverage and focus on systematic paydown.`,
      metric_trigger: 'debt_ratio',
      current_value: `${(m.debt_ratio * 100).toFixed(1)}%`,
      target_value: '< 30%',
      estimated_impact: 'Reduces leverage risk over time',
    });
  }

  if (m.altman_z >= 1.8 && m.altman_z < 3) {
    candidates.push({
      priority: 'Low', category: 'Stability',
      text: `Altman Z-score of ${m.altman_z.toFixed(2)} is in the grey zone. Monitor quarterly; avoid significant new debt and focus on retained earnings growth.`,
      metric_trigger: 'altman_z_score',
      current_value: m.altman_z.toFixed(2),
      target_value: '> 3.0',
      estimated_impact: 'Moves Z-score toward safe zone',
    });
  }

  // Sort: High -> Medium -> Low
  const order: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };
  candidates.sort((a, b) => order[a.priority] - order[b.priority]);

  // De-duplicate by category (Rule #5)
  const seen = new Set<string>();
  const deduplicated = candidates.filter((c) => {
    if (seen.has(c.category)) return false;
    seen.add(c.category);
    return true;
  });

  return deduplicated.slice(0, 5).map(enrichRecommendation);
}

// ─── Insight Items (severity-scored) ─────────────────────────────────────────

export function generateInsightItems(analysis: RiskAnalysis): InsightItem[] {
  const m = buildValidatedMetrics(analysis);
  const items: InsightItem[] = [];

  // Working-capital constrained
  if (m.is_working_capital_constrained) {
    items.push({
      text: 'Profitable but working-capital constrained \u2014 current liabilities exceed current assets despite positive cash flow.',
      severity: 8,
      trend_direction: 'worsening',
    });
  }

  // Structurally fragile
  if (m.is_structurally_fragile) {
    items.push({
      text: `Structurally fragile: high leverage (${(m.debt_ratio * 100).toFixed(0)}%) combined with distress-zone Z-score (${m.altman_z.toFixed(2)}).`,
      severity: 10,
      trend_direction: 'worsening',
    });
  }

  // Cash runway
  if (m.burn_rate > 0 && m.runway_label.includes('critical')) {
    items.push({ text: `Cash runway: ${m.runway_label}. Immediate action required.`, severity: 10, trend_direction: 'worsening' });
  } else if (m.burn_rate > 0 && m.runway_label.includes('tight')) {
    items.push({ text: `Cash runway: ${m.runway_label}.`, severity: 7, trend_direction: 'worsening' });
  }

  // Profit margin
  if (m.profit_margin < 0) {
    items.push({
      text: `Operating at a loss \u2014 profit margin of ${m.profit_margin.toFixed(1)}%.`,
      severity: 9,
      trend_direction: m.expense_trend_value > 0 ? 'worsening' : 'stable',
    });
  } else if (m.profit_margin < 5) {
    items.push({
      text: `Thin margin of ${m.profit_margin.toFixed(1)}% reduces shock absorption capacity.`,
      severity: 6,
      trend_direction: m.revenue_trend_value > 0 ? 'improving' : 'stable',
    });
  }

  // Revenue falling + expenses rising
  if (m.revenue_trend_value < 0 && m.expense_trend_value > 0) {
    items.push({ text: 'Revenue falling while costs rise \u2014 compounding risk.', severity: 9, trend_direction: 'worsening' });
  }

  // Z-score
  if (m.altman_z < 1.8 && !m.is_structurally_fragile) {
    items.push({ text: `Z-score of ${m.altman_z.toFixed(2)} \u2014 distress zone.`, severity: 9, trend_direction: 'worsening' });
  } else if (m.altman_z < 3) {
    items.push({ text: `Z-score of ${m.altman_z.toFixed(2)} \u2014 grey zone, moderate uncertainty.`, severity: 5, trend_direction: 'stable' });
  } else {
    items.push({ text: `Z-score of ${m.altman_z.toFixed(2)} \u2014 safe zone.`, severity: 1, trend_direction: 'improving' });
  }

  // Revenue trend
  if (m.revenue_trend_label === 'Declining') {
    items.push({ text: `Revenue declining at ${(Math.abs(m.revenue_trend_value) * 100).toFixed(1)}% MoM.`, severity: 8, trend_direction: 'worsening' });
  } else if (m.revenue_trend_label === 'Increasing' && m.revenue_trend_value >= 0.1) {
    items.push({ text: `Revenue growing at ${(m.revenue_trend_value * 100).toFixed(1)}% MoM.`, severity: 1, trend_direction: 'improving' });
  }

  // Debt
  if (m.debt_ratio >= 0.6 && !m.is_structurally_fragile) {
    items.push({ text: `Debt ratio of ${(m.debt_ratio * 100).toFixed(1)}% \u2014 high leverage.`, severity: 8, trend_direction: 'worsening' });
  }

  // Liquidity (if not already covered by WC-constrained)
  if (m.liquidity_ratio < 1 && !m.is_working_capital_constrained) {
    items.push({ text: `Liquidity ratio of ${m.liquidity_ratio.toFixed(2)} \u2014 current liabilities exceed current assets.`, severity: 8, trend_direction: 'worsening' });
  }

  items.sort((a, b) => b.severity - a.severity);
  return items;
}

// ─── Convenience wrapper ─────────────────────────────────────────────────────

export function generateAllInsights(analysis: RiskAnalysis): FinancialInsights {
  const m = buildValidatedMetrics(analysis);
  return {
    summary:            generateFinancialSummary(analysis),
    executiveSummary:   generateExecutiveSummary(analysis),
    recommendations:    generateRecommendations(analysis),
    positiveIndicators: buildPositiveIndicators(m),
    riskIndicators:     buildRiskIndicators(m),
    insightItems:       generateInsightItems(analysis),
    overallVerdict:     computeVerdict(m),
    metrics:            m,
  };
}

// ─── Biggest Risk Identifier ──────────────────────────────────────────────────

export function identifyBiggestRisk(analysis: RiskAnalysis): BiggestRisk {
  const m = buildValidatedMetrics(analysis);

  const risks: (BiggestRisk & { weight: number })[] = [];

  if (m.burn_rate > 0 && m.runway_label.includes('critical'))
    risks.push({ label: 'critical cash runway', explanation: `Only ${m.runway_label.split(' —')[0]} of cash remaining at current burn rate`, potentialScoreReduction: 8, category: 'Liquidity', weight: 28 });
  if (m.liquidity_ratio < 1)
    risks.push({ label: 'liquidity imbalance', explanation: `Current liabilities exceed assets (ratio: ${m.liquidity_ratio.toFixed(2)})`, potentialScoreReduction: 10, category: 'Liquidity', weight: m.liquidity_ratio < 0.5 ? 30 : 20 });
  if (m.profit_margin < -10)
    risks.push({ label: 'negative profitability', explanation: `Operating at a loss with ${m.profit_margin.toFixed(1)}% margin`, potentialScoreReduction: 15, category: 'Profitability', weight: 25 });
  if (m.debt_ratio >= 0.6)
    risks.push({ label: 'high leverage', explanation: `Debt ratio at ${(m.debt_ratio * 100).toFixed(0)}% — above safe threshold`, potentialScoreReduction: 12, category: 'Leverage', weight: m.debt_ratio >= 0.8 ? 25 : 20 });
  if (m.altman_z < 1.8)
    risks.push({ label: 'insolvency risk', explanation: `Z-score of ${m.altman_z.toFixed(2)} in the distress zone`, potentialScoreReduction: 20, category: 'Stability', weight: m.altman_z < 1 ? 20 : 15 });
  if (m.profit_margin >= -10 && m.profit_margin < 0)
    risks.push({ label: 'negative profitability', explanation: `Operating at a loss with ${m.profit_margin.toFixed(1)}% margin`, potentialScoreReduction: 8, category: 'Profitability', weight: 15 });
  if (m.revenue_trend_label === 'Declining')
    risks.push({ label: 'declining revenue', explanation: `Revenue falling ${(Math.abs(m.revenue_trend_value) * 100).toFixed(1)}% month-over-month`, potentialScoreReduction: 5, category: 'Revenue', weight: 10 });

  risks.sort((a, b) => b.weight - a.weight);

  if (risks.length === 0) {
    return { label: 'financial risk exposure', explanation: 'Overall risk profile could be optimised further', potentialScoreReduction: 5, category: 'General' };
  }

  const { weight: _, ...risk } = risks[0];
  return risk;
}

// ─── Urgency Alerts (multi-month pattern detection) ───────────────────────────

export function detectUrgencyAlerts(analyses: RiskAnalysis[]): UrgencyAlert[] {
  if (analyses.length < 2) return [];

  const sorted = [...analyses]
    .filter(a => a.analysis_scope === 'monthly')
    .sort((a, b) => ((a.period_year ?? 0) * 12 + (a.period_month ?? 0)) - ((b.period_year ?? 0) * 12 + (b.period_month ?? 0)));

  if (sorted.length < 2) return [];
  const alerts: UrgencyAlert[] = [];

  // Persistent low liquidity
  const lowLiq = sorted.filter(a => a.liquidity_ratio < 1).length;
  if (lowLiq >= 2)
    alerts.push({ text: `Liquidity below safe level for ${lowLiq} consecutive months`, severity: lowLiq >= 3 ? 'critical' : 'warning', monthsAffected: lowLiq });

  // Worsening risk score
  const recentScores = sorted.slice(-3).map(a => a.risk_score);
  if (recentScores.length >= 2 && recentScores.every((s, i) => i === 0 || s >= recentScores[i - 1])) {
    const delta = recentScores[recentScores.length - 1] - recentScores[0];
    if (delta > 5)
      alerts.push({ text: `Risk score increased by ${delta.toFixed(0)} points over ${recentScores.length} months`, severity: delta > 15 ? 'critical' : 'warning', monthsAffected: recentScores.length });
  }

  // Persistent losses
  const lossMonths = sorted.filter(a => a.profit_margin < 0).length;
  if (lossMonths >= 2)
    alerts.push({ text: `Operating at a loss for ${lossMonths} consecutive months`, severity: lossMonths >= 3 ? 'critical' : 'warning', monthsAffected: lossMonths });

  // Shrinking runway
  const runways = sorted.map(a => a.cash_runway_months ?? 999);
  if (runways.length >= 2 && runways.every((v, i) => i === 0 || v <= runways[i - 1]) && runways[runways.length - 1] < 6)
    alerts.push({ text: `Cash runway shrinking — now at ${runways[runways.length - 1].toFixed(1)} months`, severity: runways[runways.length - 1] < 3 ? 'critical' : 'warning', monthsAffected: runways.length });

  // Persistent high debt
  const highDebt = sorted.filter(a => a.debt_ratio >= 0.6).length;
  if (highDebt >= 2)
    alerts.push({ text: `Debt ratio above 60% for ${highDebt} consecutive months`, severity: highDebt >= 3 ? 'critical' : 'warning', monthsAffected: highDebt });

  return alerts.sort((a, b) => (a.severity === 'critical' ? 0 : 1) - (b.severity === 'critical' ? 0 : 1));
}

// ─── Score Change Detection (Retention) ───────────────────────────────────────

export function computeScoreChange(analyses: RiskAnalysis[]): ScoreChange | null {
  if (analyses.length < 2) return null;
  const sorted = [...analyses].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const current = sorted[0];
  const previous = sorted[1];
  const delta = current.risk_score - previous.risk_score;
  return { previousScore: previous.risk_score, currentScore: current.risk_score, delta, improved: delta < 0, previousDate: previous.created_at };
}
