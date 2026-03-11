export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'owner' | 'accountant' | 'viewer';
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
  risk_level: 'safe' | 'moderate_risk' | 'high_risk';
  recommendations: string[];
  risk_explanation: string;
  calculation_sources?: Record<string, string>;
  analysis_scope: 'monthly' | 'combined';
  period_month?: number | null;
  period_year?: number | null;
  industry_model_applied?: string | null;
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
  role?: 'owner' | 'accountant' | 'viewer';
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
