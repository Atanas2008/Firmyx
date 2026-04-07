/**
 * Action Step Generator — deterministic micro-step engine.
 *
 * Maps each Recommendation (from aiInsights) to a concrete, ordered set of
 * execution steps the user can check off. Steps are generated based on the
 * recommendation's category + metric_trigger + priority, not AI-generated.
 *
 * localStorage persistence for checked state per business.
 */

import type { Recommendation, Priority } from './aiInsights';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActionStep {
  id: string;
  label: string;
  description: string;
  effort: 'quick' | 'medium' | 'involved';
  /** Which recommendation spawned this step */
  recommendationIndex: number;
}

export interface ActionPlanData {
  steps: ActionStep[];
  estimatedImpactPoints: number;
  category: string;
  title: string;
  timeframe: string;
}

export interface ExecutionState {
  completedSteps: string[];
  startedAt: string | null;
  lastUpdated: string | null;
}

// ─── Step Templates ───────────────────────────────────────────────────────────

interface StepTemplate {
  label: string;
  description: string;
  effort: ActionStep['effort'];
}

const STEP_TEMPLATES: Record<string, Record<Priority, StepTemplate[]>> = {
  liquidity_ratio: {
    High: [
      { label: 'Audit accounts receivable', description: 'List all outstanding invoices >30 days. Identify top 5 overdue amounts.', effort: 'quick' },
      { label: 'Contact overdue clients', description: 'Send collection notices to all clients with invoices >30 days past due.', effort: 'medium' },
      { label: 'Negotiate payable extensions', description: 'Contact top 3 vendors to extend payment terms from 30 to 60 days.', effort: 'medium' },
      { label: 'Set up cash reserve target', description: 'Open a separate account and set a target of 3 months operating expenses.', effort: 'quick' },
      { label: 'Review credit facilities', description: 'Explore revolving credit line or invoice factoring to bridge short-term gaps.', effort: 'involved' },
    ],
    Medium: [
      { label: 'Review receivables aging', description: 'Export AR aging report and flag anything >45 days.', effort: 'quick' },
      { label: 'Tighten payment terms', description: 'Reduce standard payment terms from Net 60 to Net 30 for new contracts.', effort: 'medium' },
      { label: 'Build emergency buffer', description: 'Transfer fixed monthly amount to cash reserve account.', effort: 'quick' },
    ],
    Low: [
      { label: 'Monitor receivables weekly', description: 'Add a weekly AR review to your calendar.', effort: 'quick' },
      { label: 'Explore credit line options', description: 'Get quotes from 2-3 lenders for a revolving credit facility.', effort: 'medium' },
    ],
  },

  debt_ratio: {
    High: [
      { label: 'List all current debts', description: 'Create a spreadsheet with every debt: amount, rate, minimum payment, maturity.', effort: 'quick' },
      { label: 'Contact primary lender', description: 'Schedule a call to discuss restructuring, rate reduction, or term extension.', effort: 'medium' },
      { label: 'Negotiate terms', description: 'Propose extended maturity or reduced rate in exchange for good payment history.', effort: 'involved' },
      { label: 'Identify non-essential costs', description: 'Review last 3 months of expenses. Flag anything that can be cut by 10%.', effort: 'medium' },
      { label: 'Redirect savings to paydown', description: 'Apply any freed-up cash to highest-rate debt first (avalanche method).', effort: 'quick' },
      { label: 'Evaluate equity alternatives', description: 'If debt restructuring insufficient, explore equity injection or asset disposal.', effort: 'involved' },
    ],
    Medium: [
      { label: 'List all debts by interest rate', description: 'Rank debts from highest to lowest rate.', effort: 'quick' },
      { label: 'Create paydown schedule', description: 'Set monthly paydown targets for high-rate debt.', effort: 'medium' },
      { label: 'Avoid new leverage', description: 'Implement a policy of no new debt until ratio is below 40%.', effort: 'quick' },
    ],
    Low: [
      { label: 'Monitor debt ratio monthly', description: 'Track debt-to-total ratio in your financial dashboard.', effort: 'quick' },
      { label: 'Systematic paydown plan', description: 'Allocate 5% of monthly revenue to accelerated debt repayment.', effort: 'medium' },
    ],
  },

  altman_z_score: {
    High: [
      { label: 'Engage financial advisor', description: 'Hire or consult a turnaround specialist to assess restructuring options.', effort: 'involved' },
      { label: 'Improve retained earnings', description: 'Cut dividends/distributions temporarily to rebuild retained earnings.', effort: 'medium' },
      { label: 'Reduce current liabilities', description: 'Negotiate extended payment terms with top 5 vendors.', effort: 'medium' },
      { label: 'Evaluate asset disposals', description: 'Identify non-core assets that can be sold to strengthen the balance sheet.', effort: 'involved' },
    ],
    Medium: [
      { label: 'Review balance sheet quarterly', description: 'Set a quarterly review of retained earnings, working capital, and EBIT.', effort: 'quick' },
      { label: 'Focus on retained earnings', description: 'Reduce discretionary spending to improve retained earnings ratio.', effort: 'medium' },
    ],
    Low: [
      { label: 'Monitor Z-score quarterly', description: 'Track Z-score each quarter and investigate any decline >0.3.', effort: 'quick' },
    ],
  },

  cash_runway_months: {
    High: [
      { label: 'Freeze non-essential spending', description: 'Immediately pause all discretionary expenditures (marketing, travel, new hires).', effort: 'quick' },
      { label: 'Accelerate collections', description: 'Call top 10 clients with outstanding invoices. Offer 2% early payment discount.', effort: 'medium' },
      { label: 'Explore bridge financing', description: 'Contact bank about bridge loan or line of credit within 5 business days.', effort: 'involved' },
      { label: 'Reduce burn rate by 20%', description: 'Identify and implement cost cuts that reduce monthly expenses by at least 20%.', effort: 'involved' },
    ],
    Medium: [
      { label: 'Review monthly burn rate', description: 'Break down expenses by category. Identify top 3 areas for reduction.', effort: 'quick' },
      { label: 'Accelerate receivables', description: 'Shorten payment terms or offer early payment incentives.', effort: 'medium' },
      { label: 'Build revenue pipeline', description: 'Focus sales effort on deals that can close within 30 days.', effort: 'medium' },
    ],
    Low: [
      { label: 'Track runway monthly', description: 'Calculate and log runway each month-end.', effort: 'quick' },
    ],
  },

  profit_margin: {
    High: [
      { label: 'Conduct cost audit', description: 'Review every expense line from last 3 months. Flag items >$500/mo for review.', effort: 'medium' },
      { label: 'Review pricing strategy', description: 'Compare your prices to 3 competitors. Identify underpriced products/services.', effort: 'medium' },
      { label: 'Cut non-essential expenses', description: 'Eliminate or pause subscriptions, services, and costs not tied to revenue.', effort: 'quick' },
      { label: 'Renegotiate vendor contracts', description: 'Contact top 5 vendors and request 10-15% rate reduction or volume discount.', effort: 'involved' },
      { label: 'Implement pricing increase', description: 'Raise prices by 5-10% on lowest-margin products. Monitor volume impact.', effort: 'medium' },
    ],
    Medium: [
      { label: 'Analyze margins by product', description: 'Calculate gross margin per product/service. Identify bottom 20%.', effort: 'medium' },
      { label: 'Review COGS optimization', description: 'Identify if raw material costs or supplier terms can be improved.', effort: 'medium' },
      { label: 'Test price increase on 1 product', description: 'Pilot a 5% increase on one product line for 30 days and measure impact.', effort: 'quick' },
    ],
    Low: [
      { label: 'Benchmark pricing quarterly', description: 'Compare pricing to market every quarter.', effort: 'quick' },
      { label: 'Explore upsell opportunities', description: 'Identify cross-sell or upsell options for existing customers.', effort: 'medium' },
    ],
  },

  revenue_trend: {
    High: [
      { label: 'Analyze customer churn', description: 'Identify customers lost in last 3 months. Survey or call top 5 to learn why.', effort: 'medium' },
      { label: 'Audit acquisition channels', description: 'Review which channels bring customers. Double down on top performer.', effort: 'medium' },
      { label: 'Launch win-back campaign', description: 'Contact former customers with a special offer to re-engage.', effort: 'medium' },
      { label: 'Diversify revenue streams', description: 'Brainstorm and test 1 new revenue stream within 30 days.', effort: 'involved' },
    ],
    Medium: [
      { label: 'Review customer acquisition funnel', description: 'Map the funnel. Identify where prospects drop off.', effort: 'medium' },
      { label: 'Create growth plan', description: 'Set specific monthly revenue targets for next 3 months.', effort: 'quick' },
      { label: 'Explore new markets', description: 'Research adjacent markets or customer segments.', effort: 'medium' },
    ],
    Low: [
      { label: 'Set growth targets', description: 'Define monthly revenue growth goal (e.g. +5% MoM).', effort: 'quick' },
      { label: 'Invest in retention', description: 'Implement one customer retention initiative this month.', effort: 'medium' },
    ],
  },

  bankruptcy_probability: {
    High: [
      { label: 'Engage restructuring advisor', description: 'Consult with a financial advisor specializing in business turnarounds.', effort: 'involved' },
      { label: 'Build contingency plan', description: 'Document Plan B scenarios: asset sales, equity injection, strategic merger.', effort: 'involved' },
      { label: 'Improve Z-score drivers', description: 'Focus on retained earnings growth and working capital improvement.', effort: 'medium' },
    ],
    Medium: [
      { label: 'Monitor quarterly Z-score', description: 'Review Altman Z-score and bankruptcy probability each quarter.', effort: 'quick' },
      { label: 'Strengthen retained earnings', description: 'Reduce distributions and reinvest profits to build equity base.', effort: 'medium' },
    ],
    Low: [
      { label: 'Track solvency metrics', description: 'Add Z-score and bankruptcy probability to monthly dashboard.', effort: 'quick' },
    ],
  },

  expense_trend: {
    High: [
      { label: 'Implement spending freeze', description: 'Freeze all non-essential spending for 30 days.', effort: 'quick' },
      { label: 'Review vendor contracts', description: 'Renegotiate or cancel contracts for bottom 20% ROI vendors.', effort: 'medium' },
      { label: 'Set department budgets', description: 'Assign hard spending limits to each department.', effort: 'medium' },
    ],
    Medium: [
      { label: 'Categorize all expenses', description: 'Sort expenses into essential vs. discretionary. Target 10% cut in discretionary.', effort: 'quick' },
      { label: 'Negotiate vendor rates', description: 'Contact top 3 vendors to request better pricing.', effort: 'medium' },
    ],
    Low: [
      { label: 'Monthly expense review', description: 'Review expense trends monthly and flag >5% MoM increases.', effort: 'quick' },
    ],
  },
};

// ─── Generator ────────────────────────────────────────────────────────────────

export function generateActionSteps(
  recommendations: Recommendation[],
): ActionPlanData[] {
  return recommendations.map((rec, index) => {
    const templates = STEP_TEMPLATES[rec.metric_trigger]?.[rec.priority]
      ?? STEP_TEMPLATES[rec.metric_trigger]?.Medium
      ?? [
        { label: `Investigate ${rec.category.toLowerCase()} issue`, description: rec.text, effort: 'medium' as const },
        { label: `Create improvement plan`, description: `Set targets to move from ${rec.current_value} to ${rec.target_value}`, effort: 'medium' as const },
        { label: `Monitor progress`, description: 'Review this metric monthly and track improvement.', effort: 'quick' as const },
      ];

    const steps: ActionStep[] = templates.map((tmpl, i) => ({
      id: `${rec.metric_trigger}-${rec.priority}-${i}`,
      label: tmpl.label,
      description: tmpl.description,
      effort: tmpl.effort,
      recommendationIndex: index,
    }));

    const impactMatch = rec.estimated_impact.match(/(\d+)/);
    const estimatedImpactPoints = impactMatch ? parseInt(impactMatch[1], 10) : 5;

    return {
      steps,
      estimatedImpactPoints,
      category: rec.category,
      title: rec.title,
      timeframe: rec.timeframe,
    };
  });
}

// ─── localStorage Persistence ─────────────────────────────────────────────────

const STORAGE_KEY_PREFIX = 'firmyx_execution_';

export function getExecutionState(businessId: string): ExecutionState {
  if (typeof window === 'undefined') return { completedSteps: [], startedAt: null, lastUpdated: null };
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${businessId}`);
    if (!raw) return { completedSteps: [], startedAt: null, lastUpdated: null };
    return JSON.parse(raw);
  } catch {
    return { completedSteps: [], startedAt: null, lastUpdated: null };
  }
}

export function saveExecutionState(businessId: string, state: ExecutionState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${businessId}`, JSON.stringify(state));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

export function toggleStep(
  businessId: string,
  stepId: string,
): ExecutionState {
  const state = getExecutionState(businessId);
  const now = new Date().toISOString();

  if (state.completedSteps.includes(stepId)) {
    state.completedSteps = state.completedSteps.filter((s) => s !== stepId);
  } else {
    state.completedSteps.push(stepId);
  }

  if (!state.startedAt && state.completedSteps.length > 0) {
    state.startedAt = now;
  }
  state.lastUpdated = now;

  saveExecutionState(businessId, state);
  return state;
}

export function computeProgress(
  plans: ActionPlanData[],
  state: ExecutionState,
): {
  totalSteps: number;
  completedCount: number;
  percentage: number;
  estimatedRiskReduction: number;
} {
  const allSteps = plans.flatMap((p) => p.steps);
  const totalSteps = allSteps.length;
  const completedCount = allSteps.filter((s) => state.completedSteps.includes(s.id)).length;
  const percentage = totalSteps === 0 ? 0 : Math.round((completedCount / totalSteps) * 100);

  // Calculate cumulative risk reduction for completed items
  let estimatedRiskReduction = 0;
  for (const plan of plans) {
    const planTotal = plan.steps.length;
    const planDone = plan.steps.filter((s) => state.completedSteps.includes(s.id)).length;
    if (planTotal > 0) {
      estimatedRiskReduction += (planDone / planTotal) * plan.estimatedImpactPoints;
    }
  }

  return {
    totalSteps,
    completedCount,
    percentage,
    estimatedRiskReduction: Math.round(estimatedRiskReduction),
  };
}
