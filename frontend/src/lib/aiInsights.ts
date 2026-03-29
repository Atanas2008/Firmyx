/**
 * AI Financial Insights — deterministic rule-based engine.
 *
 * Three exported generator functions:
 *   generateFinancialSummary(analysis)  – narrative overview of financial health
 *   generateExecutiveSummary(analysis)  – board-level one-paragraph briefing
 *   generateRecommendations(analysis)   – up to 3 prioritised action items
 *
 * Each function works entirely from the RiskAnalysis object, so it always
 * produces output regardless of whether an external AI service is available.
 */

import type { RiskAnalysis } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Priority = 'High' | 'Medium' | 'Low';

// CHANGED: Added metric_trigger, current_value, target_value, estimated_impact fields
export interface Recommendation {
  text: string;
  priority: Priority;
  category: 'Liquidity' | 'Leverage' | 'Profitability' | 'Revenue' | 'Stability';
  metric_trigger: string;
  current_value: string;
  target_value: string;
  estimated_impact: string;
}

// CHANGED: Added severity and trend_direction to insights
export interface InsightItem {
  text: string;
  severity: number;  // 1-10 urgency score
  trend_direction: 'improving' | 'worsening' | 'stable' | 'unknown';
}

export interface FinancialInsights {
  summary: string;
  executiveSummary: string;
  recommendations: Recommendation[];
  positiveIndicators: string[];
  riskIndicators: string[];
  // CHANGED: Added structured insight items with severity
  insightItems: InsightItem[];
  overallVerdict: 'strong' | 'moderate' | 'weak';
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function zScoreInterpretation(z: number): string {
  if (z >= 3)   return `The Altman Z-score of ${z.toFixed(2)} places the company firmly in the safe zone, indicating very low financial distress risk.`;
  if (z >= 2.6) return `The Altman Z-score of ${z.toFixed(2)} is approaching the safe zone threshold — no immediate distress, but continued monitoring is advised.`;
  if (z >= 1.8) return `The Altman Z-score of ${z.toFixed(2)} falls in the grey zone, indicating moderate financial risk that warrants proactive attention.`;
  return `The Altman Z-score of ${z.toFixed(2)} signals elevated distress risk; immediate corrective action is advisable.`;
}

function riskScoreLabel(score: number): string {
  if (score <= 30)  return 'low';
  if (score <= 60)  return 'moderate';
  return 'high';
}

function profitMarginLabel(pm: number): string {
  if (pm >= 20) return 'strong profit margins';
  if (pm >= 10) return 'healthy profit margins';
  if (pm >= 0)  return 'thin but positive profit margins';
  return 'negative profit margins';
}

function liquidityLabel(lr: number): string {
  if (lr >= 2)    return 'strong liquidity';
  if (lr >= 1.2)  return 'healthy liquidity';
  if (lr >= 1)    return 'adequate liquidity (watch zone)';
  return 'constrained liquidity';
}

function debtLabel(dr: number): string {
  if (dr < 0.3) return 'low leverage';
  if (dr < 0.6) return 'moderate leverage';
  return 'high leverage';
}

function revenueTrendLabel(rt: number | null): string {
  if (rt === null)   return 'unknown revenue trend';
  if (rt * 100 >= 10) return 'strong revenue growth';
  if (rt >= 0)        return 'stable revenue';
  return 'declining revenue';
}

// ─── Positive & risk indicator builders ──────────────────────────────────────

function buildPositiveIndicators(a: RiskAnalysis): string[] {
  const positives: string[] = [];
  if (a.profit_margin >= 10)       positives.push(`Profit margin of ${a.profit_margin.toFixed(1)}% reflects solid earnings quality.`);
  if (a.liquidity_ratio >= 1.2)    positives.push(`Liquidity ratio of ${a.liquidity_ratio.toFixed(2)} provides a comfortable buffer against short-term obligations.`);
  if (a.debt_ratio < 0.3)          positives.push(`Debt ratio of ${(a.debt_ratio * 100).toFixed(1)}% indicates conservative use of leverage.`);
  if (a.revenue_trend !== null && a.revenue_trend * 100 >= 5)
                                    positives.push(`Revenue is growing at ${(a.revenue_trend * 100).toFixed(1)}% month-over-month, reflecting positive business momentum.`);
  if (a.altman_z_score >= 3)       positives.push(`Altman Z-score of ${a.altman_z_score.toFixed(2)} confirms low financial distress probability.`);
  if (a.bankruptcy_probability !== null && a.bankruptcy_probability <= 10)
                                    positives.push(`Bankruptcy probability of ${a.bankruptcy_probability.toFixed(0)}% is well within safe thresholds.`);
  if (a.cash_runway_months !== null && a.cash_runway_months >= 12)
                                    positives.push(`Cash runway of ${a.cash_runway_months.toFixed(0)} months provides ample operational breathing room.`);
  if (a.burn_rate === 0)            positives.push(`The business is cash-flow positive with zero burn rate \u2014 cash reserves are not being depleted.`);
  return positives;
}

function buildRiskIndicators(a: RiskAnalysis): string[] {
  const risks: string[] = [];
  if (a.liquidity_ratio < 1)       risks.push(`Liquidity ratio of ${a.liquidity_ratio.toFixed(2)} is below 1.0 — current liabilities may exceed current assets; working capital action required.`);
  if (a.liquidity_ratio >= 1 && a.liquidity_ratio < 1.2)
                                    risks.push(`Liquidity ratio of ${a.liquidity_ratio.toFixed(2)} is in the watch zone (1.0–1.2) — limited buffer against short-term obligations.`);
  if (a.debt_ratio >= 0.6)         risks.push(`Debt ratio of ${(a.debt_ratio * 100).toFixed(1)}% signals high dependency on debt financing.`);
  // CHANGED: Include exact loss per month when profit margin is negative
  if (a.profit_margin < 0) {
    const lossPerMonth = a.burn_rate > 0 ? ` The business is losing approximately $${a.burn_rate.toLocaleString(undefined, { maximumFractionDigits: 0 })} per month.` : '';
    risks.push(`Profit margin of ${a.profit_margin.toFixed(1)}% leaves little room to absorb cost increases or revenue shortfalls.${lossPerMonth}`);
  } else if (a.profit_margin >= 0 && a.profit_margin < 5) {
    risks.push(`Profit margin of ${a.profit_margin.toFixed(1)}% leaves little room to absorb cost increases or revenue shortfalls.`);
  }
  if (a.revenue_trend !== null && a.revenue_trend < 0)
                                    risks.push(`Revenue is declining at ${(Math.abs(a.revenue_trend) * 100).toFixed(1)}% month-over-month, pressuring cash flow generation.`);
  // CHANGED: Combined warning when revenue declining AND expenses rising
  if (a.revenue_trend !== null && a.revenue_trend < 0 && a.expense_trend !== null && a.expense_trend > 0)
                                    risks.push(`Revenue is falling while costs are rising — a compounding risk that will accelerate cash depletion.`);
  if (a.altman_z_score < 1.8)      risks.push(`Altman Z-score of ${a.altman_z_score.toFixed(2)} falls in the distress zone, warranting immediate attention.`);
  if (a.bankruptcy_probability !== null && a.bankruptcy_probability > 30)
                                    risks.push(`Elevated bankruptcy probability of ${a.bankruptcy_probability.toFixed(0)}% requires urgent structural review.`);
  // CHANGED: Include exact runway figure when < 3 months
  if (a.burn_rate > 0 && a.cash_runway_months !== null && a.cash_runway_months > 0 && a.cash_runway_months < 3)
                                    risks.push(`Cash will run out in approximately ${a.cash_runway_months.toFixed(1)} months at current burn rate. Immediate action is critical.`);
  else if (a.burn_rate > 0 && a.cash_runway_months !== null && a.cash_runway_months >= 3 && a.cash_runway_months < 6)
                                    risks.push(`Cash runway of only ${a.cash_runway_months.toFixed(1)} months creates near-term liquidity pressure.`);
  if (a.expense_trend !== null && a.expense_trend * 100 > 15)
                                    risks.push(`Expense growth of ${(a.expense_trend * 100).toFixed(1)}% month-over-month is outpacing sustainable business growth.`);
  return risks;
}

// ─── Overall verdict ──────────────────────────────────────────────────────────

function computeVerdict(a: RiskAnalysis): 'strong' | 'moderate' | 'weak' {
  const positives = buildPositiveIndicators(a).length;
  const risks     = buildRiskIndicators(a).length;
  if (risks === 0 && positives >= 3)  return 'strong';
  if (risks >= 3 || a.debt_ratio >= 0.6 && a.profit_margin < 0) return 'weak';
  if (a.risk_level === 'safe' && a.altman_z_score >= 2)          return 'strong';
  if (a.risk_level === 'high_risk')                               return 'weak';
  return 'moderate';
}

// ─── Public generators ────────────────────────────────────────────────────────

/**
 * Generates a plain-language narrative of the business's financial condition.
 * Covers: overall health, strongest positives, biggest risks, Z-score context.
 */
export function generateFinancialSummary(analysis: RiskAnalysis): string {
  const verdict   = computeVerdict(analysis);
  const positives = buildPositiveIndicators(analysis);
  const risks     = buildRiskIndicators(analysis);

  // Build support phrase for 'strong' verdict: only include liquidity if ratio >= 1
  // to avoid the contradiction of "strong position, supported by constrained liquidity".
  const strongSupportItems = [
    profitMarginLabel(analysis.profit_margin),
    analysis.liquidity_ratio >= 1 ? liquidityLabel(analysis.liquidity_ratio) : null,
    debtLabel(analysis.debt_ratio),
  ].filter((x): x is string => x !== null);

  const openings: Record<typeof verdict, string> = {
    strong:   'This business is in a strong financial position',
    moderate: 'This business demonstrates a mixed financial profile',
    weak:     'This business is experiencing notable financial stress',
  };

  const supportPhrases: Record<typeof verdict, string> = {
    strong:   `supported by ${strongSupportItems.join(', ')}.${analysis.liquidity_ratio < 1 ? ' However, liquidity is constrained and requires close monitoring.' : ''}`,
    moderate: `with a combination of encouraging signals and areas that require attention.`,
    weak:     `characterised by ${[profitMarginLabel(analysis.profit_margin), liquidityLabel(analysis.liquidity_ratio)].join(' and ')}.`,
  };
  let summary = `${openings[verdict]}, ${supportPhrases[verdict]}`;

  if (positives.length > 0) {
    const topPositive = positives[0];
    summary += ` ${topPositive}`;
  }

  if (risks.length > 0) {
    summary += ` However, ${risks[0].charAt(0).toLowerCase() + risks[0].slice(1)}`;
  }

  summary += ` ${zScoreInterpretation(analysis.altman_z_score)}`;

  const closings: Record<typeof verdict, string> = {
    strong:   ' Continued focus on forecasting accuracy, pricing discipline, and maintaining liquidity reserves is recommended to sustain this trajectory.',
    moderate: ' Management should prioritise addressing identified vulnerabilities while building on existing strengths.',
    weak:     ' Immediate intervention at the strategic level is required to stabilise operations and restore financial resilience.',
  };

  summary += closings[verdict];
  return summary;
}

/**
 * Generates a concise board-level executive summary suitable for reports or investors.
 */
export function generateExecutiveSummary(analysis: RiskAnalysis): string {
  const verdict  = computeVerdict(analysis);
  const riskLbl  = riskScoreLabel(analysis.risk_score);
  const profitLbl = profitMarginLabel(analysis.profit_margin);
  const debtLbl  = debtLabel(analysis.debt_ratio);
  const revLbl   = revenueTrendLabel(analysis.revenue_trend);
  const liqLbl   = liquidityLabel(analysis.liquidity_ratio);

  const overallHealth: Record<typeof verdict, string> = {
    strong:   `The company presents a compelling financial profile`,
    moderate: `The company exhibits a stable but mixed financial position`,
    weak:     `The company faces material financial headwinds`,
  };

  let exec = `${overallHealth[verdict]}, characterised by ${profitLbl}, ${debtLbl}, ${liqLbl}, and ${revLbl}.`;

  exec += ` The composite risk score stands at ${analysis.risk_score.toFixed(0)}/100 (${riskLbl} risk)`;

  if (analysis.financial_health_score !== null) {
    exec += `, with a Financial Health Score of ${analysis.financial_health_score.toFixed(0)}/100`;
  }
  exec += '.';

  if (analysis.altman_z_score >= 3) {
    exec += ` Altman Z-score analysis confirms the business operates well within safe financial boundaries, substantially reducing insolvency risk.`;
  } else if (analysis.altman_z_score >= 2.6) {
    exec += ` The Altman Z-score of ${analysis.altman_z_score.toFixed(2)} is approaching the safe zone threshold — financial stability is improving and distress probability remains low.`;
  } else if (analysis.altman_z_score < 1.8) {
    exec += ` The Altman Z-score of ${analysis.altman_z_score.toFixed(2)} warrants board-level attention, as it falls below the distress threshold.`;
  } else {
    exec += ` The Altman Z-score of ${analysis.altman_z_score.toFixed(2)} suggests moderate financial uncertainty; proactive monitoring is recommended.`;
  }

  if (analysis.bankruptcy_probability !== null) {
    if (analysis.bankruptcy_probability <= 10) {
      exec += ` Estimated bankruptcy probability of ${analysis.bankruptcy_probability.toFixed(0)}% affirms the company's near-term solvency.`;
    } else if (analysis.bankruptcy_probability <= 30) {
      exec += ` Bankruptcy probability of ${analysis.bankruptcy_probability.toFixed(0)}% requires management oversight and contingency planning.`;
    } else {
      exec += ` Bankruptcy probability of ${analysis.bankruptcy_probability.toFixed(0)}% is elevated; capital restructuring or liquidity injection should be evaluated without delay.`;
    }
  }

  const closings: Record<typeof verdict, string> = {
    strong:   ` The board is advised to maintain current controls and explore strategic growth opportunities.`,
    moderate: ` The board should prioritise targeted interventions in identified risk areas to strengthen long-term resilience.`,
    weak:     ` Urgent board action is required to address structural vulnerabilities and protect stakeholder value.`,
  };
  exec += closings[verdict];
  return exec;
}

/**
 * Generates up to 3 prioritised, metric-driven recommendations.
 * Priority order: High → Medium → Low. Only the top 3 are returned.
 * CHANGED: Each recommendation now includes metric_trigger, current_value, target_value, estimated_impact
 */
export function generateRecommendations(analysis: RiskAnalysis): Recommendation[] {
  const candidates: Recommendation[] = [];

  // ── Liquidity ────────────────────────────────────────────────────────────────
  if (analysis.liquidity_ratio < 1) {
    candidates.push({
      priority: 'High',
      category: 'Liquidity',
      text: `Liquidity ratio of ${analysis.liquidity_ratio.toFixed(2)} is critically low — current liabilities exceed current assets. Improve working capital by accelerating receivables, reducing short-term obligations, and building a cash reserve above 3 months of operating expenses.`,
      metric_trigger: 'liquidity_ratio',
      current_value: analysis.liquidity_ratio.toFixed(2),
      target_value: '> 1.5',
      estimated_impact: 'Reduces risk score by ~10 points',
    });
  } else if (analysis.liquidity_ratio < 1.2) {
    candidates.push({
      priority: 'High',
      category: 'Liquidity',
      text: `Liquidity ratio of ${analysis.liquidity_ratio.toFixed(2)} is in the watch zone (1.0–1.2). Strengthen working capital before it falls below 1.0 — consider extending credit lines or deferring non-critical near-term expenditures.`,
      metric_trigger: 'liquidity_ratio',
      current_value: analysis.liquidity_ratio.toFixed(2),
      target_value: '> 1.5',
      estimated_impact: 'Reduces risk score by ~5 points',
    });
  } else if (analysis.liquidity_ratio < 2) {
    candidates.push({
      priority: 'Medium',
      category: 'Liquidity',
      text: `Liquidity ratio of ${analysis.liquidity_ratio.toFixed(2)} is healthy but below the 2.0 safety target. Consider extending credit lines or reducing discretionary near-term expenditures to provide additional buffer.`,
      metric_trigger: 'liquidity_ratio',
      current_value: analysis.liquidity_ratio.toFixed(2),
      target_value: '> 2.0',
      estimated_impact: 'Improves financial stability buffer',
    });
  } else {
    candidates.push({
      priority: 'Low',
      category: 'Liquidity',
      text: `Strong liquidity (ratio: ${analysis.liquidity_ratio.toFixed(2)}). Excess working capital could be strategically reinvested into growth initiatives or used to build a long-term reserve fund.`,
      metric_trigger: 'liquidity_ratio',
      current_value: analysis.liquidity_ratio.toFixed(2),
      target_value: 'Maintain > 2.0',
      estimated_impact: 'Opportunity for strategic reinvestment',
    });
  }

  // ── Leverage / Debt ──────────────────────────────────────────────────────────
  if (analysis.debt_ratio >= 0.6) {
    candidates.push({
      priority: 'High',
      category: 'Leverage',
      text: `Debt ratio of ${(analysis.debt_ratio * 100).toFixed(1)}% exceeds the 60% high-risk threshold. Evaluate debt restructuring options, convert short-term debt to longer maturities, or pursue equity financing to reduce financial risk and lower interest obligations.`,
      metric_trigger: 'debt_ratio',
      current_value: `${(analysis.debt_ratio * 100).toFixed(1)}%`,
      target_value: '< 40%',
      estimated_impact: 'Reduces risk score by ~12 points',
    });
  } else if (analysis.debt_ratio >= 0.3) {
    candidates.push({
      priority: 'Medium',
      category: 'Leverage',
      text: `Debt ratio of ${(analysis.debt_ratio * 100).toFixed(1)}% is moderate. Implement a debt reduction plan and avoid taking on new obligations until the ratio is brought below 30%.`,
      metric_trigger: 'debt_ratio',
      current_value: `${(analysis.debt_ratio * 100).toFixed(1)}%`,
      target_value: '< 30%',
      estimated_impact: 'Reduces risk score by ~5 points',
    });
  } else if (analysis.debt_ratio < 0.3) {
    candidates.push({
      priority: 'Low',
      category: 'Leverage',
      text: `Low leverage (debt ratio: ${(analysis.debt_ratio * 100).toFixed(1)}%) provides room for strategic financing if expansion capital is needed.`,
      metric_trigger: 'debt_ratio',
      current_value: `${(analysis.debt_ratio * 100).toFixed(1)}%`,
      target_value: 'Maintain < 30%',
      estimated_impact: 'Healthy leverage enables growth options',
    });
  }

  // ── Profitability ────────────────────────────────────────────────────────────
  if (analysis.profit_margin < 0) {
    candidates.push({
      priority: 'High',
      category: 'Profitability',
      text: `Negative profit margin of ${analysis.profit_margin.toFixed(1)}% indicates the business is operating at a loss. Conduct an immediate cost audit, review pricing strategy, and identify non-essential expenditures that can be eliminated.`,
      metric_trigger: 'profit_margin',
      current_value: `${analysis.profit_margin.toFixed(1)}%`,
      target_value: '> 10%',
      estimated_impact: 'Reduces risk score by ~15 points',
    });
  } else if (analysis.profit_margin < 10) {
    candidates.push({
      priority: 'Medium',
      category: 'Profitability',
      text: `Profit margin of ${analysis.profit_margin.toFixed(1)}% is thin. Review product or service pricing against market benchmarks, explore cost optimisation in COGS and operating expenses, and identify upsell or cross-sell opportunities to improve margins.`,
      metric_trigger: 'profit_margin',
      current_value: `${analysis.profit_margin.toFixed(1)}%`,
      target_value: '> 10%',
      estimated_impact: 'Reduces risk score by ~8 points',
    });
  }

  // ── Revenue trend ────────────────────────────────────────────────────────────
  if (analysis.revenue_trend !== null && analysis.revenue_trend < 0) {
    candidates.push({
      priority: 'High',
      category: 'Revenue',
      text: `Revenue decline detected (${(analysis.revenue_trend * 100).toFixed(1)}% MoM). Investigate customer retention and sales pipeline — launch targeted retention initiatives, reassess acquisition channels, and diversify revenue streams to reverse the trend.`,
      metric_trigger: 'revenue_trend',
      current_value: `${(analysis.revenue_trend * 100).toFixed(1)}%`,
      target_value: '> 0%',
      estimated_impact: 'Stabilises cash flow and reduces risk score by ~5 points',
    });
  } else if (analysis.revenue_trend !== null && analysis.revenue_trend * 100 < 3) {
    candidates.push({
      priority: 'Medium',
      category: 'Revenue',
      text: `Revenue growth of ${(analysis.revenue_trend * 100).toFixed(1)}% is below optimal levels. Develop a structured growth plan including new customer acquisition channels, expansion into adjacent markets, or product line extensions.`,
      metric_trigger: 'revenue_trend',
      current_value: `${(analysis.revenue_trend * 100).toFixed(1)}%`,
      target_value: '> 5%',
      estimated_impact: 'Accelerates growth trajectory',
    });
  }

  // ── Expense growth ───────────────────────────────────────────────────────────
  if (analysis.expense_trend !== null && analysis.expense_trend * 100 > 15) {
    candidates.push({
      priority: 'High',
      category: 'Profitability',
      text: `Expenses are rising at ${(analysis.expense_trend * 100).toFixed(1)}% month-over-month — significantly faster than sustainable growth rates. Implement a spending freeze on non-critical items and conduct a vendor renegotiation cycle.`,
      metric_trigger: 'expense_trend',
      current_value: `${(analysis.expense_trend * 100).toFixed(1)}%`,
      target_value: '< 5%',
      estimated_impact: 'Reduces burn rate and extends cash runway',
    });
  } else if (analysis.expense_trend !== null && analysis.expense_trend * 100 > 8) {
    candidates.push({
      priority: 'Medium',
      category: 'Profitability',
      text: `Expense trend of ${(analysis.expense_trend * 100).toFixed(1)}% warrants close attention. Establish monthly budget reviews and enforce approval processes for discretionary spending.`,
      metric_trigger: 'expense_trend',
      current_value: `${(analysis.expense_trend * 100).toFixed(1)}%`,
      target_value: '< 5%',
      estimated_impact: 'Prevents margin erosion',
    });
  }

  // ── Altman Z-Score ──────────────────────────────────────────────────────────
  if (analysis.altman_z_score < 1.8) {
    candidates.push({
      priority: 'High',
      category: 'Stability',
      text: `Altman Z-score of ${analysis.altman_z_score.toFixed(2)} signals financial distress. Engage financial advisors, develop a turnaround plan focused on improving working capital and earnings, and consider asset disposals to strengthen the balance sheet.`,
      metric_trigger: 'altman_z_score',
      current_value: analysis.altman_z_score.toFixed(2),
      target_value: '> 3.0',
      estimated_impact: 'Reduces risk score by ~20 points',
    });
  } else if (analysis.altman_z_score < 3) {
    candidates.push({
      priority: 'Medium',
      category: 'Stability',
      text: `Altman Z-score of ${analysis.altman_z_score.toFixed(2)} is in the grey zone. Monitor Z-score trends quarterly; avoid significant new debt, and focus on improving retained earnings and reducing current liabilities.`,
      metric_trigger: 'altman_z_score',
      current_value: analysis.altman_z_score.toFixed(2),
      target_value: '> 3.0',
      estimated_impact: 'Reduces risk score by ~8 points',
    });
  } else {
    candidates.push({
      priority: 'Low',
      category: 'Stability',
      text: `Strong Altman Z-score of ${analysis.altman_z_score.toFixed(2)} reflects financial stability. Maintain current discipline in capital allocation, continue tracking leading indicators, and ensure scenario planning is in place for macroeconomic shifts.`,
      metric_trigger: 'altman_z_score',
      current_value: analysis.altman_z_score.toFixed(2),
      target_value: 'Maintain > 3.0',
      estimated_impact: 'Sustains low distress probability',
    });
  }

  // ── Cash runway ──────────────────────────────────────────────────────────────
  if (    analysis.burn_rate > 0 &&    analysis.cash_runway_months !== null &&
    analysis.cash_runway_months > 0 &&
    analysis.cash_runway_months < 6
  ) {
    candidates.push({
      priority: 'High',
      category: 'Liquidity',
      text: `Cash runway of ${analysis.cash_runway_months.toFixed(1)} months is dangerously short. Immediately explore bridge financing, reduce burn rate, or accelerate collections to extend the operational runway beyond 12 months.`,
      metric_trigger: 'cash_runway_months',
      current_value: `${analysis.cash_runway_months.toFixed(1)} months`,
      target_value: '> 12 months',
      estimated_impact: 'Critical for business survival',
    });
  }

  // Sort: High → Medium → Low
  const order: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };
  candidates.sort((a, b) => order[a.priority] - order[b.priority]);

  // De-duplicate categories — keep only the most critical entry per category
  const seen = new Set<string>();
  const deduplicated = candidates.filter((c) => {
    if (seen.has(c.category)) return false;
    seen.add(c.category);
    return true;
  });

  return deduplicated.slice(0, 3);
}

/**
 * CHANGED: Generates severity-scored, trend-aware insight items.
 * Each insight has a numeric urgency (1–10) and a trend direction indicator.
 */
export function generateInsightItems(analysis: RiskAnalysis): InsightItem[] {
  const items: InsightItem[] = [];

  // Cash runway
  if (analysis.burn_rate > 0 && analysis.cash_runway_months !== null && analysis.cash_runway_months > 0) {
    if (analysis.cash_runway_months < 3) {
      items.push({
        text: `Cash will run out in approximately ${analysis.cash_runway_months.toFixed(1)} months at current burn rate.`,
        severity: 10,
        trend_direction: 'worsening',
      });
    } else if (analysis.cash_runway_months < 6) {
      items.push({
        text: `Cash runway of ${analysis.cash_runway_months.toFixed(1)} months creates near-term liquidity pressure.`,
        severity: 7,
        trend_direction: 'worsening',
      });
    } else if (analysis.cash_runway_months >= 12) {
      items.push({
        text: `Cash runway of ${analysis.cash_runway_months.toFixed(0)} months provides ample operational breathing room.`,
        severity: 1,
        trend_direction: 'stable',
      });
    }
  }

  // Profit margin
  if (analysis.profit_margin < 0) {
    const lossPerMonth = analysis.burn_rate > 0 ? analysis.burn_rate : Math.abs(analysis.profit_margin);
    items.push({
      text: `The business is losing approximately $${lossPerMonth.toLocaleString(undefined, { maximumFractionDigits: 0 })} per month.`,
      severity: 9,
      trend_direction: analysis.expense_trend !== null && analysis.expense_trend > 0 ? 'worsening' : 'stable',
    });
  } else if (analysis.profit_margin < 5) {
    items.push({
      text: `Profit margin of ${analysis.profit_margin.toFixed(1)}% is thin and vulnerable to cost fluctuations.`,
      severity: 6,
      trend_direction: analysis.revenue_trend !== null && analysis.revenue_trend > 0 ? 'improving' : 'stable',
    });
  }

  // Compounding risk: revenue falling + expenses rising
  if (analysis.revenue_trend !== null && analysis.revenue_trend < 0 &&
      analysis.expense_trend !== null && analysis.expense_trend > 0) {
    items.push({
      text: `Revenue is falling while costs are rising — a compounding risk that will accelerate cash depletion.`,
      severity: 9,
      trend_direction: 'worsening',
    });
  }

  // Altman Z-Score
  if (analysis.altman_z_score < 1.8) {
    items.push({
      text: `Altman Z-score of ${analysis.altman_z_score.toFixed(2)} signals financial distress.`,
      severity: 9,
      trend_direction: 'worsening',
    });
  } else if (analysis.altman_z_score < 3) {
    items.push({
      text: `Altman Z-score of ${analysis.altman_z_score.toFixed(2)} is in the grey zone — moderate uncertainty.`,
      severity: 5,
      trend_direction: 'stable',
    });
  } else {
    items.push({
      text: `Altman Z-score of ${analysis.altman_z_score.toFixed(2)} confirms low distress risk.`,
      severity: 1,
      trend_direction: 'improving',
    });
  }

  // Revenue trend
  if (analysis.revenue_trend !== null) {
    if (analysis.revenue_trend < -0.05) {
      items.push({
        text: `Revenue declining at ${(Math.abs(analysis.revenue_trend) * 100).toFixed(1)}% month-over-month.`,
        severity: 8,
        trend_direction: 'worsening',
      });
    } else if (analysis.revenue_trend >= 0.1) {
      items.push({
        text: `Revenue growing at ${(analysis.revenue_trend * 100).toFixed(1)}% month-over-month.`,
        severity: 1,
        trend_direction: 'improving',
      });
    }
  }

  // Debt ratio
  if (analysis.debt_ratio >= 0.6) {
    items.push({
      text: `Debt ratio of ${(analysis.debt_ratio * 100).toFixed(1)}% indicates high-risk leverage.`,
      severity: 8,
      trend_direction: 'worsening',
    });
  }

  // Liquidity
  if (analysis.liquidity_ratio < 1) {
    items.push({
      text: `Liquidity ratio of ${analysis.liquidity_ratio.toFixed(2)} indicates current liabilities exceed current assets.`,
      severity: 8,
      trend_direction: 'worsening',
    });
  }

  // Sort by severity descending (most urgent first)
  items.sort((a, b) => b.severity - a.severity);
  return items;
}

/**
 * Convenience wrapper that produces all insights in one call.
 * CHANGED: Now includes insightItems with severity scores
 */
export function generateAllInsights(analysis: RiskAnalysis): FinancialInsights {
  return {
    summary:            generateFinancialSummary(analysis),
    executiveSummary:   generateExecutiveSummary(analysis),
    recommendations:    generateRecommendations(analysis),
    positiveIndicators: buildPositiveIndicators(analysis),
    riskIndicators:     buildRiskIndicators(analysis),
    insightItems:       generateInsightItems(analysis),
    overallVerdict:     computeVerdict(analysis),
  };
}
