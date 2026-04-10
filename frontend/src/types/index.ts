export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'owner' | 'accountant' | 'viewer';
  analyses_count: number;
  is_unlocked: boolean;
}

export interface Business {
  id: string;
  name: string;
  industry: string;
  country: string;
  num_employees: number;
  years_operating: number;
  monthly_fixed_costs: number;
  created_at: string;
}

export interface FinancialRecord {
  id: string;
  business_id: string;
  period_month: number;
  period_year: number;
  monthly_revenue: number;
  monthly_expenses: number;
  payroll: number;
  rent: number;
  debt: number;
  cash_reserves: number;
  taxes: number;
  cost_of_goods_sold: number;
  total_assets?: number | null;
  current_liabilities?: number | null;
  ebit?: number | null;
  retained_earnings?: number | null;
  created_at: string;
}

export interface RecommendationJustification {
  driver: string;
  comparison: string;
  impact: string;
  priority_reason: string;
}

export interface RecommendationItem {
  title: string;
  explanation: string;
  justification: RecommendationJustification;
  priority?: string | null;
  current_value?: string | null;
  target_value?: string | null;
  timeframe?: string | null;
  concrete_actions?: string[] | null;
}

export interface RiskAnalysis {
  id: string;
  business_id: string;
  financial_record_id: string;
  profit_margin: number;
  burn_rate: number;
  cash_runway_months: number | null;
  revenue_trend: number | null;
  expense_trend: number | null;
  debt_ratio: number;
  liquidity_ratio: number;
  altman_z_score: number;
  financial_health_score: number | null;
  bankruptcy_probability: number | null;
  risk_score: number;
  risk_level: 'safe' | 'moderate_risk' | 'high_risk' | 'low' | 'medium' | 'high' | 'critical';
  recommendations: RecommendationItem[] | string[];
  risk_explanation: string;
  calculation_sources?: Record<string, unknown>;
  analysis_scope: 'monthly' | 'combined';
  period_month?: number | null;
  period_year?: number | null;
  industry_model_applied?: string | null;
  // v4.0 explainability layer
  risk_score_breakdown?: Record<string, number> | null;
  confidence_level?: string | null;
  confidence_explanation?: string | null;
  revenue_trend_label?: string | null;
  runway_label?: string | null;
  bankruptcy_explanation?: string | null;
  // v5.0 deterministic scoring
  drivers?: string[] | null;
  explanation?: string | null;
  expense_ratio?: number | null;
  risk_level_display?: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  business_id: string;
  risk_analysis_id: string;
  report_type: string;
  file_path: string;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface RegisterData {
  full_name: string;
  email: string;
  password: string;
  role?: 'admin' | 'owner' | 'accountant' | 'viewer';
}

export interface CreateBusinessData {
  name: string;
  industry: string;
  country: string;
  num_employees: number;
  years_operating: number;
  monthly_fixed_costs: number;
}

export interface CreateRecordData {
  period_month: number;
  period_year: number;
  monthly_revenue: number;
  monthly_expenses: number;
  payroll: number;
  rent: number;
  debt: number;
  cash_reserves: number;
  taxes: number;
  cost_of_goods_sold: number;
  total_assets?: number | null;
  current_liabilities?: number | null;
  ebit?: number | null;
  retained_earnings?: number | null;
}

export interface ApiError {
  detail: string;
  status?: number;
}

// ─── Forecast types ──────────────────────────────────────────────────────────

export interface ForecastMonth {
  month: number;
  label: string;
  projected_revenue: number;
  projected_expenses: number;
  projected_profit: number;
  projected_cash_balance: number;
  projected_risk_score: number;
  burn_rate: number;
  runway_months: number | null;
}

export type ForecastScenario = 'baseline' | 'optimistic' | 'pessimistic';

export interface ForecastResult {
  business_id: string;
  months: number;
  scenario: ForecastScenario;
  projections: ForecastMonth[];
  projected_cash_runway: number | null;
  end_of_period_risk_score: number;
  end_cash_balance: number;
}

export interface MultiScenarioForecast {
  business_id: string;
  months: number;
  baseline: ForecastMonth[];
  optimistic: ForecastMonth[];
  pessimistic: ForecastMonth[];
}

// ─── Scenario types ──────────────────────────────────────────────────────────

export interface ScenarioAdjustments {
  preset?: string;
  revenue_change_pct: number;
  revenue_change_abs: number;
  expense_change_pct: number;
  expense_change_abs: number;
  debt_change_abs: number;
  cash_change_abs: number;
  cost_reduction_pct: number;
}

export interface ScenarioPreset {
  key: string;
  label: string;
  description: string;
}

export interface MetricComparison {
  original: number | null;
  adjusted: number | null;
  delta: number | null;
  direction: 'better' | 'worse' | 'neutral';
}

export interface ScenarioResult {
  business_id: string;
  original: Record<string, number | string | null>;
  adjusted: Record<string, number | string | null>;
  comparison: Record<string, MetricComparison>;
  summary: string;
  disclaimer?: string;
}
