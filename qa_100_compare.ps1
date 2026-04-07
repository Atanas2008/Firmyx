########################################################################
# QA 100-Scenario COMPARISON Test — Regression Detector
# Compares current run against baseline from previous run
########################################################################

$ErrorActionPreference = "Stop"
$BASE = "http://localhost:8000/api"

# ── Auto-login ─────────────────────────────────────────────────────────
$loginBody = @{email="qa100@gmail.com"; password="QaTest123!"} | ConvertTo-Json
$loginResp = Invoke-RestMethod "$BASE/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
$TOKEN = $loginResp.access_token
$H = @{ Authorization = "Bearer $TOKEN"; "Content-Type" = "application/json" }
Write-Host "Authenticated as qa100@gmail.com`n"

# ── Baseline from previous run (2026-04-07 19:03:54) ──────────────────
$baseline = @{}
$baseline[1]  = @{label="VeryHighMargin-LowDebt";       score=5.5;   level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[2]  = @{label="VeryHighMargin-ModDebt";       score=9.8;   level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[3]  = @{label="VeryHighMargin-HighDebt";      score=17.0;  level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[4]  = @{label="HealthyMargin20pct";           score=10.5;  level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[5]  = @{label="HealthyMargin15pct";           score=14.0;  level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[6]  = @{label="HealthyMargin10pct";           score=19.25; level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[7]  = @{label="LowMargin5pct";                score=16.67; level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[8]  = @{label="LowMargin2pct";                score=19.01; level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[9]  = @{label="LowMargin0pct";                score=19.12; level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[10] = @{label="NegMargin-5pct";               score=40.49; level="moderate_risk"; state="ELEVATED";   recs=3; titles=@()}
$baseline[11] = @{label="NegMargin-20pct";              score=96.47; level="high_risk";     state="DISTRESSED"; recs=5; titles=@()}
$baseline[12] = @{label="NegMargin-50pct";              score=100.0; level="high_risk";     state="DISTRESSED"; recs=5; titles=@()}
$baseline[13] = @{label="NegMargin-100pct";             score=100.0; level="high_risk";     state="DISTRESSED"; recs=5; titles=@()}
$baseline[14] = @{label="NegMargin-200pct";             score=100.0; level="high_risk";     state="DISTRESSED"; recs=5; titles=@()}
$baseline[15] = @{label="ZeroRevenue";                  score=100.0; level="high_risk";     state="DISTRESSED"; recs=5; titles=@()}
$baseline[16] = @{label="Liq-VeryStrong-4.0";           score=5.43;  level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[17] = @{label="Liq-VeryStrong-6.0";           score=5.15;  level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[18] = @{label="Liq-Healthy-2.5";              score=6.12;  level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[19] = @{label="Liq-Healthy-1.8";              score=8.67;  level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[20] = @{label="Liq-Healthy-1.5";              score=11.21; level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[21] = @{label="Liq-Borderline-1.3";           score=11.81; level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[22] = @{label="Liq-Borderline-1.1";           score=12.0;  level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[23] = @{label="Liq-Borderline-1.0";           score=14.75; level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[24] = @{label="Liq-Constrained-0.8";          score=16.0;  level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[25] = @{label="Liq-Constrained-0.6";          score=19.5;  level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[26] = @{label="Liq-Constrained-0.4";          score=24.5;  level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[27] = @{label="Liq-NearZero-0.15";            score=100.0; level="high_risk";     state="DISTRESSED"; recs=5; titles=@()}
$baseline[28] = @{label="Liq-NearZero-0.1";             score=100.0; level="high_risk";     state="DISTRESSED"; recs=5; titles=@()}
$baseline[29] = @{label="Liq-NearZero-0.05";            score=100.0; level="high_risk";     state="DISTRESSED"; recs=5; titles=@()}
$baseline[30] = @{label="Liq-Zero";                     score=100.0; level="high_risk";     state="DISTRESSED"; recs=5; titles=@()}
$baseline[31] = @{label="Lev-VeryLow-0.05";             score=5.75;  level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[32] = @{label="Lev-VeryLow-0.1";              score=6.25;  level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[33] = @{label="Lev-VeryLow-0.15";             score=7.21;  level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[34] = @{label="Lev-Moderate-0.3";              score=9.17;  level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[35] = @{label="Lev-Moderate-0.4";              score=13.18; level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[36] = @{label="Lev-Moderate-0.55";             score=16.64; level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[37] = @{label="Lev-High-0.65";                score=18.71; level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[38] = @{label="Lev-High-0.8";                 score=22.33; level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[39] = @{label="Lev-High-1.0";                 score=27.0;  level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[40] = @{label="Lev-Extreme-1.5";              score=29.14; level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[41] = @{label="Lev-Extreme-2.0";              score=31.17; level="moderate_risk"; state="STABLE";     recs=3; titles=@()}
$baseline[42] = @{label="Lev-Extreme-4.0";              score=100.0; level="high_risk";     state="DISTRESSED"; recs=5; titles=@()}
$baseline[43] = @{label="Runway-Infinite-Positive";     score=6.12;  level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[44] = @{label="Runway-9mo";                   score=48.91; level="moderate_risk"; state="ELEVATED";   recs=3; titles=@()}
$baseline[45] = @{label="Runway-7mo";                   score=76.11; level="high_risk";     state="DISTRESSED"; recs=4; titles=@()}
$baseline[46] = @{label="Runway-5mo";                   score=89.15; level="high_risk";     state="DISTRESSED"; recs=5; titles=@()}
$baseline[47] = @{label="Runway-4mo";                   score=98.62; level="high_risk";     state="DISTRESSED"; recs=5; titles=@()}
$baseline[48] = @{label="Runway-3.5mo";                 score=100.0; level="high_risk";     state="DISTRESSED"; recs=5; titles=@()}
$baseline[49] = @{label="Runway-2mo";                   score=100.0; level="high_risk";     state="DISTRESSED"; recs=5; titles=@()}
$baseline[50] = @{label="Runway-1.5mo";                 score=100.0; level="high_risk";     state="DISTRESSED"; recs=4; titles=@()}
$baseline[51] = @{label="Runway-1mo";                   score=100.0; level="high_risk";     state="DISTRESSED"; recs=5; titles=@()}
$baseline[52] = @{label="Runway-0.5mo";                 score=100.0; level="high_risk";     state="DISTRESSED"; recs=5; titles=@()}
$baseline[53] = @{label="Runway-0.1mo";                 score=100.0; level="high_risk";     state="DISTRESSED"; recs=5; titles=@()}
$baseline[54] = @{label="Runway-0mo-NoCash";            score=100.0; level="high_risk";     state="DISTRESSED"; recs=5; titles=@()}
$baseline[55] = @{label="Combo-HighMargin-HighLev";     score=17.0;  level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[56] = @{label="Combo-HighMargin-LowLiq";      score=7.5;   level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[57] = @{label="Combo-HighMargin-ShortRun";    score=54.09; level="moderate_risk"; state="ELEVATED";   recs=4; titles=@()}
$baseline[58] = @{label="Combo-LowMargin-HighLiq";      score=16.4;  level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[59] = @{label="Combo-LowMargin-LowLev";       score=16.52; level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[60] = @{label="Combo-LowMargin-ExtLev-LowLiq";score=31.79; level="moderate_risk"; state="STABLE";     recs=3; titles=@()}
$baseline[61] = @{label="Combo-NegMargin-StrongLiq";    score=72.28; level="high_risk";     state="DISTRESSED"; recs=4; titles=@()}
$baseline[62] = @{label="Combo-NegMargin-LowDebt-Startup";score=73.06;level="high_risk";   state="DISTRESSED"; recs=4; titles=@()}
$baseline[63] = @{label="Combo-WC-Constrained";         score=16.54; level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[64] = @{label="Combo-AllBad";                  score=100.0; level="high_risk";     state="DISTRESSED"; recs=5; titles=@()}
$baseline[65] = @{label="Combo-AllGood";                 score=5.25;  level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[66] = @{label="Combo-AllModerate";             score=17.0;  level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[67] = @{label="Combo-HighScale-ThinMargin";   score=16.34; level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[68] = @{label="Combo-MicroBiz";               score=5.75;  level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[69] = @{label="Combo-DebtEqualsAssets";        score=27.0;  level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[70] = @{label="Combo-NegativeEquity";          score=96.44; level="high_risk";     state="DISTRESSED"; recs=5; titles=@()}
$baseline[71] = @{label="Combo-HighCash-HighDebt";       score=25.54; level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[72] = @{label="Combo-ExactBreakeven";          score=21.14; level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[73] = @{label="Combo-HighCOGS";                score=23.03; level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[74] = @{label="Combo-ZeroCOGS-Service";        score=6.0;   level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[75] = @{label="Combo-HighMargin-Declining";    score=5.98;  level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[76] = @{label="Combo-NegMargin-Growing";       score=77.67; level="high_risk";     state="DISTRESSED"; recs=4; titles=@()}
$baseline[77] = @{label="Combo-NoDebt-NoCash";           score=12.0;  level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[78] = @{label="Combo-PreLaunch-CashOnly";      score=40.0;  level="moderate_risk"; state="ELEVATED";   recs=3; titles=@()}
$baseline[79] = @{label="Combo-TinyNumbers";             score=5.75;  level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[80] = @{label="Combo-LargeScale";              score=5.75;  level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[81] = @{label="State-Stable-GrowthAllowed";   score=5.34;  level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[82] = @{label="State-Elevated-NoGrowth";      score=16.5;  level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[83] = @{label="State-Distressed-SurvivalOnly";score=100.0; level="high_risk";     state="DISTRESSED"; recs=5; titles=@()}
$baseline[84] = @{label="State-Distressed-GoodLiq";     score=76.68; level="high_risk";     state="DISTRESSED"; recs=4; titles=@()}
$baseline[85] = @{label="State-Distressed-LowDebt";     score=100.0; level="high_risk";     state="DISTRESSED"; recs=5; titles=@()}
$baseline[86] = @{label="State-Boundary-70";            score=100.0; level="high_risk";     state="DISTRESSED"; recs=5; titles=@()}
$baseline[87] = @{label="State-Boundary-40";            score=18.45; level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[88] = @{label="State-BankruptcyTrigger";      score=26.29; level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[89] = @{label="State-JustBelowBankruptcy";    score=10.53; level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[90] = @{label="State-MaxHealth";              score=5.09;  level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[91] = @{label="Just-DriverPoints";            score=19.59; level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[92] = @{label="Just-ComparisonThresholds";    score=24.88; level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[93] = @{label="Just-ImpactQuantified";        score=100.0; level="high_risk";     state="DISTRESSED"; recs=5; titles=@()}
$baseline[94] = @{label="Just-PriorityRanking";         score=5.9;   level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[95] = @{label="Just-LargestContributor";      score=100.0; level="high_risk";     state="DISTRESSED"; recs=5; titles=@()}
$baseline[96] = @{label="Just-ImpactSorting";           score=100.0; level="high_risk";     state="DISTRESSED"; recs=5; titles=@()}
$baseline[97] = @{label="Just-TitleQuality";            score=19.13; level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[98] = @{label="Just-NoGenericLanguage";       score=11.5;  level="safe";          state="STABLE";     recs=3; titles=@()}
$baseline[99] = @{label="Just-DistressedTone";          score=100.0; level="high_risk";     state="DISTRESSED"; recs=5; titles=@()}
$baseline[100]= @{label="Just-HealthyPositive";         score=5.24;  level="safe";          state="STABLE";     recs=3; titles=@()}

# ── Test scenario definitions ─────────────────────────────────────────
$scenarios = @{}
$scenarios[1]  = @{monthly_revenue=200000; monthly_expenses=100000; debt=10000; cash_reserves=100000; cost_of_goods_sold=30000; total_assets=300000; current_liabilities=20000}
$scenarios[2]  = @{monthly_revenue=200000; monthly_expenses=110000; debt=80000; cash_reserves=80000; cost_of_goods_sold=40000; total_assets=250000; current_liabilities=30000}
$scenarios[3]  = @{monthly_revenue=200000; monthly_expenses=100000; debt=200000; cash_reserves=50000; cost_of_goods_sold=30000; total_assets=250000; current_liabilities=80000}
$scenarios[4]  = @{monthly_revenue=100000; monthly_expenses=80000; debt=20000; cash_reserves=60000; cost_of_goods_sold=25000; total_assets=200000; current_liabilities=30000}
$scenarios[5]  = @{monthly_revenue=100000; monthly_expenses=85000; debt=30000; cash_reserves=40000; cost_of_goods_sold=30000; total_assets=150000; current_liabilities=25000}
$scenarios[6]  = @{monthly_revenue=100000; monthly_expenses=90000; debt=50000; cash_reserves=30000; cost_of_goods_sold=30000; total_assets=120000; current_liabilities=35000}
$scenarios[7]  = @{monthly_revenue=100000; monthly_expenses=95000; debt=20000; cash_reserves=50000; cost_of_goods_sold=30000; total_assets=180000; current_liabilities=25000}
$scenarios[8]  = @{monthly_revenue=100000; monthly_expenses=98000; debt=30000; cash_reserves=40000; cost_of_goods_sold=30000; total_assets=160000; current_liabilities=30000}
$scenarios[9]  = @{monthly_revenue=100000; monthly_expenses=100000; debt=20000; cash_reserves=50000; cost_of_goods_sold=30000; total_assets=180000; current_liabilities=25000}
$scenarios[10] = @{monthly_revenue=100000; monthly_expenses=105000; debt=20000; cash_reserves=50000; cost_of_goods_sold=30000; total_assets=160000; current_liabilities=25000}
$scenarios[11] = @{monthly_revenue=100000; monthly_expenses=120000; debt=40000; cash_reserves=40000; cost_of_goods_sold=30000; total_assets=150000; current_liabilities=35000}
$scenarios[12] = @{monthly_revenue=100000; monthly_expenses=150000; debt=60000; cash_reserves=30000; cost_of_goods_sold=40000; total_assets=120000; current_liabilities=50000}
$scenarios[13] = @{monthly_revenue=50000; monthly_expenses=100000; debt=80000; cash_reserves=20000; cost_of_goods_sold=20000; total_assets=80000; current_liabilities=40000}
$scenarios[14] = @{monthly_revenue=30000; monthly_expenses=90000; debt=100000; cash_reserves=10000; cost_of_goods_sold=15000; total_assets=60000; current_liabilities=50000}
$scenarios[15] = @{monthly_revenue=0; monthly_expenses=28000; debt=35000; cash_reserves=30000; cost_of_goods_sold=0; total_assets=45000; current_liabilities=22000}
$scenarios[16] = @{monthly_revenue=120000; monthly_expenses=70000; debt=10000; cash_reserves=200000; cost_of_goods_sold=20000; total_assets=350000; current_liabilities=50000}
$scenarios[17] = @{monthly_revenue=150000; monthly_expenses=80000; debt=5000; cash_reserves=300000; cost_of_goods_sold=25000; total_assets=500000; current_liabilities=50000}
$scenarios[18] = @{monthly_revenue=100000; monthly_expenses=70000; debt=15000; cash_reserves=75000; cost_of_goods_sold=20000; total_assets=200000; current_liabilities=30000}
$scenarios[19] = @{monthly_revenue=100000; monthly_expenses=75000; debt=20000; cash_reserves=54000; cost_of_goods_sold=20000; total_assets=180000; current_liabilities=30000}
$scenarios[20] = @{monthly_revenue=100000; monthly_expenses=80000; debt=25000; cash_reserves=45000; cost_of_goods_sold=20000; total_assets=170000; current_liabilities=30000}
$scenarios[21] = @{monthly_revenue=100000; monthly_expenses=80000; debt=30000; cash_reserves=39000; cost_of_goods_sold=25000; total_assets=160000; current_liabilities=30000}
$scenarios[22] = @{monthly_revenue=100000; monthly_expenses=80000; debt=30000; cash_reserves=33000; cost_of_goods_sold=25000; total_assets=150000; current_liabilities=30000}
$scenarios[23] = @{monthly_revenue=100000; monthly_expenses=85000; debt=35000; cash_reserves=30000; cost_of_goods_sold=25000; total_assets=140000; current_liabilities=30000}
$scenarios[24] = @{monthly_revenue=100000; monthly_expenses=85000; debt=40000; cash_reserves=24000; cost_of_goods_sold=25000; total_assets=120000; current_liabilities=30000}
$scenarios[25] = @{monthly_revenue=80000; monthly_expenses=70000; debt=50000; cash_reserves=18000; cost_of_goods_sold=20000; total_assets=100000; current_liabilities=30000}
$scenarios[26] = @{monthly_revenue=80000; monthly_expenses=75000; debt=60000; cash_reserves=12000; cost_of_goods_sold=20000; total_assets=90000; current_liabilities=30000}
$scenarios[27] = @{monthly_revenue=60000; monthly_expenses=70000; debt=80000; cash_reserves=4500; cost_of_goods_sold=15000; total_assets=70000; current_liabilities=30000}
$scenarios[28] = @{monthly_revenue=50000; monthly_expenses=65000; debt=90000; cash_reserves=3000; cost_of_goods_sold=15000; total_assets=60000; current_liabilities=30000}
$scenarios[29] = @{monthly_revenue=40000; monthly_expenses=60000; debt=100000; cash_reserves=1500; cost_of_goods_sold=10000; total_assets=50000; current_liabilities=30000}
$scenarios[30] = @{monthly_revenue=40000; monthly_expenses=55000; debt=100000; cash_reserves=0; cost_of_goods_sold=10000; total_assets=45000; current_liabilities=30000}
$scenarios[31] = @{monthly_revenue=120000; monthly_expenses=70000; debt=10000; cash_reserves=100000; cost_of_goods_sold=20000; total_assets=200000; current_liabilities=20000}
$scenarios[32] = @{monthly_revenue=110000; monthly_expenses=65000; debt=15000; cash_reserves=90000; cost_of_goods_sold=18000; total_assets=180000; current_liabilities=18000}
$scenarios[33] = @{monthly_revenue=100000; monthly_expenses=60000; debt=25000; cash_reserves=80000; cost_of_goods_sold=15000; total_assets=170000; current_liabilities=20000}
$scenarios[34] = @{monthly_revenue=100000; monthly_expenses=70000; debt=50000; cash_reserves=60000; cost_of_goods_sold=20000; total_assets=180000; current_liabilities=25000}
$scenarios[35] = @{monthly_revenue=100000; monthly_expenses=75000; debt=70000; cash_reserves=50000; cost_of_goods_sold=22000; total_assets=170000; current_liabilities=28000}
$scenarios[36] = @{monthly_revenue=100000; monthly_expenses=78000; debt=90000; cash_reserves=45000; cost_of_goods_sold=25000; total_assets=160000; current_liabilities=30000}
$scenarios[37] = @{monthly_revenue=100000; monthly_expenses=80000; debt=110000; cash_reserves=40000; cost_of_goods_sold=25000; total_assets=170000; current_liabilities=35000}
$scenarios[38] = @{monthly_revenue=90000; monthly_expenses=75000; debt=120000; cash_reserves=30000; cost_of_goods_sold=22000; total_assets=150000; current_liabilities=35000}
$scenarios[39] = @{monthly_revenue=80000; monthly_expenses=70000; debt=140000; cash_reserves=25000; cost_of_goods_sold=20000; total_assets=140000; current_liabilities=40000}
$scenarios[40] = @{monthly_revenue=70000; monthly_expenses=65000; debt=180000; cash_reserves=20000; cost_of_goods_sold=18000; total_assets=120000; current_liabilities=45000}
$scenarios[41] = @{monthly_revenue=60000; monthly_expenses=55000; debt=200000; cash_reserves=15000; cost_of_goods_sold=15000; total_assets=100000; current_liabilities=50000}
$scenarios[42] = @{monthly_revenue=40000; monthly_expenses=55000; debt=300000; cash_reserves=5000; cost_of_goods_sold=10000; total_assets=75000; current_liabilities=60000}
$scenarios[43] = @{monthly_revenue=100000; monthly_expenses=70000; debt=15000; cash_reserves=80000; cost_of_goods_sold=20000; total_assets=200000; current_liabilities=25000}
$scenarios[44] = @{monthly_revenue=50000; monthly_expenses=55000; debt=20000; cash_reserves=45000; cost_of_goods_sold=15000; total_assets=150000; current_liabilities=25000}
$scenarios[45] = @{monthly_revenue=50000; monthly_expenses=58000; debt=25000; cash_reserves=56000; cost_of_goods_sold=15000; total_assets=140000; current_liabilities=28000}
$scenarios[46] = @{monthly_revenue=60000; monthly_expenses=70000; debt=30000; cash_reserves=50000; cost_of_goods_sold=18000; total_assets=130000; current_liabilities=30000}
$scenarios[47] = @{monthly_revenue=60000; monthly_expenses=75000; debt=35000; cash_reserves=60000; cost_of_goods_sold=18000; total_assets=120000; current_liabilities=35000}
$scenarios[48] = @{monthly_revenue=50000; monthly_expenses=65000; debt=40000; cash_reserves=52500; cost_of_goods_sold=15000; total_assets=110000; current_liabilities=35000}
$scenarios[49] = @{monthly_revenue=40000; monthly_expenses=60000; debt=50000; cash_reserves=40000; cost_of_goods_sold=12000; total_assets=90000; current_liabilities=40000}
$scenarios[50] = @{monthly_revenue=30000; monthly_expenses=50000; debt=60000; cash_reserves=30000; cost_of_goods_sold=10000; total_assets=80000; current_liabilities=45000}
$scenarios[51] = @{monthly_revenue=30000; monthly_expenses=55000; debt=70000; cash_reserves=25000; cost_of_goods_sold=10000; total_assets=70000; current_liabilities=50000}
$scenarios[52] = @{monthly_revenue=25000; monthly_expenses=55000; debt=80000; cash_reserves=15000; cost_of_goods_sold=8000; total_assets=60000; current_liabilities=50000}
$scenarios[53] = @{monthly_revenue=20000; monthly_expenses=50000; debt=90000; cash_reserves=3000; cost_of_goods_sold=8000; total_assets=50000; current_liabilities=50000}
$scenarios[54] = @{monthly_revenue=20000; monthly_expenses=60000; debt=100000; cash_reserves=0; cost_of_goods_sold=8000; total_assets=40000; current_liabilities=50000}
$scenarios[55] = @{monthly_revenue=200000; monthly_expenses=110000; debt=200000; cash_reserves=60000; cost_of_goods_sold=35000; total_assets=250000; current_liabilities=50000}
$scenarios[56] = @{monthly_revenue=180000; monthly_expenses=100000; debt=30000; cash_reserves=25000; cost_of_goods_sold=30000; total_assets=180000; current_liabilities=35000}
$scenarios[57] = @{monthly_revenue=50000; monthly_expenses=55000; debt=10000; cash_reserves=10000; cost_of_goods_sold=15000; total_assets=150000; current_liabilities=15000}
$scenarios[58] = @{monthly_revenue=100000; monthly_expenses=97000; debt=10000; cash_reserves=120000; cost_of_goods_sold=30000; total_assets=250000; current_liabilities=30000}
$scenarios[59] = @{monthly_revenue=100000; monthly_expenses=96000; debt=15000; cash_reserves=60000; cost_of_goods_sold=30000; total_assets=200000; current_liabilities=25000}
$scenarios[60] = @{monthly_revenue=80000; monthly_expenses=78000; debt=180000; cash_reserves=10000; cost_of_goods_sold=25000; total_assets=100000; current_liabilities=50000}
$scenarios[61] = @{monthly_revenue=80000; monthly_expenses=100000; debt=10000; cash_reserves=200000; cost_of_goods_sold=25000; total_assets=300000; current_liabilities=40000}
$scenarios[62] = @{monthly_revenue=30000; monthly_expenses=50000; debt=5000; cash_reserves=120000; cost_of_goods_sold=10000; total_assets=200000; current_liabilities=15000}
$scenarios[63] = @{monthly_revenue=120000; monthly_expenses=80000; debt=100000; cash_reserves=20000; cost_of_goods_sold=25000; total_assets=130000; current_liabilities=30000}
$scenarios[64] = @{monthly_revenue=10000; monthly_expenses=80000; debt=300000; cash_reserves=2000; cost_of_goods_sold=5000; total_assets=30000; current_liabilities=60000}
$scenarios[65] = @{monthly_revenue=250000; monthly_expenses=120000; debt=10000; cash_reserves=300000; cost_of_goods_sold=30000; total_assets=600000; current_liabilities=30000}
$scenarios[66] = @{monthly_revenue=100000; monthly_expenses=85000; debt=60000; cash_reserves=35000; cost_of_goods_sold=25000; total_assets=150000; current_liabilities=30000}
$scenarios[67] = @{monthly_revenue=500000; monthly_expenses=480000; debt=50000; cash_reserves=100000; cost_of_goods_sold=200000; total_assets=800000; current_liabilities=80000}
$scenarios[68] = @{monthly_revenue=5000; monthly_expenses=3000; debt=1000; cash_reserves=10000; cost_of_goods_sold=1000; total_assets=20000; current_liabilities=2000}
$scenarios[69] = @{monthly_revenue=80000; monthly_expenses=70000; debt=150000; cash_reserves=25000; cost_of_goods_sold=20000; total_assets=150000; current_liabilities=40000}
$scenarios[70] = @{monthly_revenue=60000; monthly_expenses=65000; debt=200000; cash_reserves=10000; cost_of_goods_sold=15000; total_assets=80000; current_liabilities=50000}
$scenarios[71] = @{monthly_revenue=100000; monthly_expenses=90000; debt=200000; cash_reserves=150000; cost_of_goods_sold=25000; total_assets=300000; current_liabilities=40000}
$scenarios[72] = @{monthly_revenue=100000; monthly_expenses=100000; debt=30000; cash_reserves=50000; cost_of_goods_sold=30000; total_assets=180000; current_liabilities=25000}
$scenarios[73] = @{monthly_revenue=100000; monthly_expenses=95000; debt=20000; cash_reserves=50000; cost_of_goods_sold=70000; total_assets=180000; current_liabilities=25000}
$scenarios[74] = @{monthly_revenue=80000; monthly_expenses=50000; debt=10000; cash_reserves=60000; cost_of_goods_sold=0; total_assets=150000; current_liabilities=20000}
$scenarios[75] = @{monthly_revenue=120000; monthly_expenses=70000; debt=15000; cash_reserves=80000; cost_of_goods_sold=20000; total_assets=230000; current_liabilities=25000}
$scenarios[76] = @{monthly_revenue=60000; monthly_expenses=75000; debt=20000; cash_reserves=90000; cost_of_goods_sold=15000; total_assets=180000; current_liabilities=25000}
$scenarios[77] = @{monthly_revenue=80000; monthly_expenses=70000; debt=0; cash_reserves=0; cost_of_goods_sold=20000; total_assets=100000; current_liabilities=25000}
$scenarios[78] = @{monthly_revenue=0; monthly_expenses=15000; debt=0; cash_reserves=200000; cost_of_goods_sold=0; total_assets=250000; current_liabilities=10000}
$scenarios[79] = @{monthly_revenue=100; monthly_expenses=60; debt=10; cash_reserves=50; cost_of_goods_sold=20; total_assets=200; current_liabilities=15}
$scenarios[80] = @{monthly_revenue=10000000; monthly_expenses=6000000; debt=1000000; cash_reserves=5000000; cost_of_goods_sold=2000000; total_assets=20000000; current_liabilities=1500000}
$scenarios[81] = @{monthly_revenue=150000; monthly_expenses=85000; debt=8000; cash_reserves=150000; cost_of_goods_sold=25000; total_assets=350000; current_liabilities=30000}
$scenarios[82] = @{monthly_revenue=100000; monthly_expenses=80000; debt=80000; cash_reserves=70000; cost_of_goods_sold=25000; total_assets=160000; current_liabilities=40000}
$scenarios[83] = @{monthly_revenue=30000; monthly_expenses=80000; debt=200000; cash_reserves=10000; cost_of_goods_sold=10000; total_assets=50000; current_liabilities=60000}
$scenarios[84] = @{monthly_revenue=40000; monthly_expenses=70000; debt=10000; cash_reserves=250000; cost_of_goods_sold=12000; total_assets=300000; current_liabilities=30000}
$scenarios[85] = @{monthly_revenue=20000; monthly_expenses=60000; debt=5000; cash_reserves=30000; cost_of_goods_sold=8000; total_assets=100000; current_liabilities=10000}
$scenarios[86] = @{monthly_revenue=50000; monthly_expenses=65000; debt=80000; cash_reserves=20000; cost_of_goods_sold=15000; total_assets=90000; current_liabilities=35000}
$scenarios[87] = @{monthly_revenue=90000; monthly_expenses=80000; debt=55000; cash_reserves=35000; cost_of_goods_sold=22000; total_assets=140000; current_liabilities=30000}
$scenarios[88] = @{monthly_revenue=70000; monthly_expenses=60000; debt=120000; cash_reserves=25000; cost_of_goods_sold=18000; total_assets=100000; current_liabilities=40000}
$scenarios[89] = @{monthly_revenue=100000; monthly_expenses=75000; debt=40000; cash_reserves=50000; cost_of_goods_sold=22000; total_assets=170000; current_liabilities=28000}
$scenarios[90] = @{monthly_revenue=300000; monthly_expenses=150000; debt=5000; cash_reserves=500000; cost_of_goods_sold=40000; total_assets=800000; current_liabilities=20000}
$scenarios[91] = @{monthly_revenue=100000; monthly_expenses=80000; debt=120000; cash_reserves=40000; cost_of_goods_sold=25000; total_assets=170000; current_liabilities=45000}
$scenarios[92] = @{monthly_revenue=80000; monthly_expenses=75000; debt=90000; cash_reserves=30000; cost_of_goods_sold=20000; total_assets=130000; current_liabilities=40000}
$scenarios[93] = @{monthly_revenue=60000; monthly_expenses=70000; debt=100000; cash_reserves=15000; cost_of_goods_sold=15000; total_assets=80000; current_liabilities=45000}
$scenarios[94] = @{monthly_revenue=110000; monthly_expenses=70000; debt=15000; cash_reserves=90000; cost_of_goods_sold=20000; total_assets=250000; current_liabilities=22000}
$scenarios[95] = @{monthly_revenue=50000; monthly_expenses=80000; debt=150000; cash_reserves=8000; cost_of_goods_sold=15000; total_assets=70000; current_liabilities=50000}
$scenarios[96] = @{monthly_revenue=70000; monthly_expenses=90000; debt=130000; cash_reserves=12000; cost_of_goods_sold=18000; total_assets=80000; current_liabilities=45000}
$scenarios[97] = @{monthly_revenue=90000; monthly_expenses=85000; debt=45000; cash_reserves=40000; cost_of_goods_sold=22000; total_assets=155000; current_liabilities=30000}
$scenarios[98] = @{monthly_revenue=120000; monthly_expenses=90000; debt=60000; cash_reserves=50000; cost_of_goods_sold=30000; total_assets=200000; current_liabilities=35000}
$scenarios[99] = @{monthly_revenue=15000; monthly_expenses=70000; debt=250000; cash_reserves=3000; cost_of_goods_sold=5000; total_assets=35000; current_liabilities=55000}
$scenarios[100]= @{monthly_revenue=200000; monthly_expenses=100000; debt=8000; cash_reserves=250000; cost_of_goods_sold=25000; total_assets=500000; current_liabilities=25000}

# ── Counters ───────────────────────────────────────────────────────────
$identical = 0; $scoreDiffs = 0; $levelDiffs = 0; $recDiffs = 0; $errors = 0
$regressions = @()

Write-Host "========================================================="
Write-Host "  QA 100-SCENARIO REGRESSION COMPARISON"
Write-Host "  Baseline: 2026-04-07 19:03:54   Current: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "=========================================================`n"

for ($num = 1; $num -le 100; $num++) {
    $label = $baseline[$num].label
    $record = $scenarios[$num]
    try {
        # 1. Create business
        $biz = @{name="CMP-$num $label"; industry="Other"; country="US"; num_employees=10; years_operating=3; monthly_fixed_costs=5000} | ConvertTo-Json
        $b = Invoke-RestMethod "$BASE/businesses" -Method POST -Headers $H -Body $biz
        $bid = $b.id

        # 2. Add financial record
        $defaults = @{
            period_month = 3; period_year = 2026
            payroll = 20000; rent = 5000; taxes = 5000
            ebit = $null; retained_earnings = $null
        }
        foreach ($k in $record.Keys) { $defaults[$k] = $record[$k] }
        # Remove nulls to avoid serialization issues
        $clean = @{}
        foreach ($k in $defaults.Keys) {
            if ($null -ne $defaults[$k]) { $clean[$k] = $defaults[$k] }
        }
        $recJson = $clean | ConvertTo-Json
        Invoke-RestMethod "$BASE/businesses/$bid/records" -Method POST -Headers $H -Body $recJson | Out-Null

        # 3. Run analysis
        $a = Invoke-RestMethod "$BASE/businesses/$bid/analyze" -Method POST -Headers $H

        # 4. Compute state
        $state = "STABLE"
        if ($a.risk_score -ge 70 -or $a.bankruptcy_probability -ge 30) { $state = "DISTRESSED" }
        elseif ($a.risk_score -ge 40) { $state = "ELEVATED" }

        # 5. Extract recommendation titles
        $curTitles = @($a.recommendations | ForEach-Object { $_.title })
        $curTitlesStr = ($curTitles | Sort-Object) -join ", "

        # 6. Compare with baseline
        $bl = $baseline[$num]
        $diffs = @()

        # Score comparison (tolerance 0.01)
        $scoreDelta = [math]::Round($a.risk_score - $bl.score, 2)
        if ([math]::Abs($scoreDelta) -gt 0.01) {
            $sign = if ($scoreDelta -gt 0) { "+" } else { "" }
            $diffs += "SCORE: $($bl.score) -> $($a.risk_score) (${sign}${scoreDelta})"
            $scoreDiffs++
        }

        # Level comparison
        if ($a.risk_level -ne $bl.level) {
            $diffs += "LEVEL: $($bl.level) -> $($a.risk_level)"
            $levelDiffs++
        }

        # State comparison
        if ($state -ne $bl.state) {
            $diffs += "STATE: $($bl.state) -> $state"
        }

        # Rec count comparison
        if ($a.recommendations.Count -ne $bl.recs) {
            $diffs += "REC_COUNT: $($bl.recs) -> $($a.recommendations.Count)"
            $recDiffs++
        }

        # Report
        if ($diffs.Count -eq 0) {
            $identical++
            Write-Host "  #$num IDENTICAL | $label | score=$($a.risk_score) level=$($a.risk_level) recs=$($a.recommendations.Count)" -ForegroundColor DarkGreen
        } else {
            $diffStr = $diffs -join " | "
            $regressions += @{num=$num; label=$label; diffs=$diffs; curScore=$a.risk_score; curLevel=$a.risk_level; curState=$state; curRecs=$curTitlesStr; curRecCount=$a.recommendations.Count}
            Write-Host "  #$num CHANGED | $label | $diffStr" -ForegroundColor Yellow
        }
    }
    catch {
        $errors++
        $regressions += @{num=$num; label=$label; diffs=@("ERROR: $($_.Exception.Message)")}
        Write-Host "  #$num ERROR | $label | $($_.Exception.Message)" -ForegroundColor Magenta
    }
}

# ═══════════════════════════════════════════════════════════════════════
# FINAL COMPARISON REPORT
# ═══════════════════════════════════════════════════════════════════════
Write-Host "`n========================================================="
Write-Host "  REGRESSION COMPARISON REPORT"
Write-Host "========================================================="
Write-Host "  Total scenarios:    100"
Write-Host "  Identical:          $identical" -ForegroundColor Green
Write-Host "  Score changes:      $scoreDiffs" -ForegroundColor $(if ($scoreDiffs -gt 0) { "Yellow" } else { "Green" })
Write-Host "  Level changes:      $levelDiffs" -ForegroundColor $(if ($levelDiffs -gt 0) { "Red" } else { "Green" })
Write-Host "  Rec count changes:  $recDiffs" -ForegroundColor $(if ($recDiffs -gt 0) { "Yellow" } else { "Green" })
Write-Host "  Errors:             $errors" -ForegroundColor $(if ($errors -gt 0) { "Red" } else { "Green" })

if ($regressions.Count -gt 0) {
    Write-Host "`n  ---- DETAILED CHANGES ----" -ForegroundColor Yellow
    foreach ($r in $regressions) {
        Write-Host "`n  TEST #$($r.num) ($($r.label)):" -ForegroundColor Yellow
        foreach ($d in $r.diffs) {
            Write-Host "    $d" -ForegroundColor Yellow
        }
        if ($r.curRecs) {
            Write-Host "    RECOMMENDATIONS: $($r.curRecs)" -ForegroundColor DarkGray
        }
    }
}

if ($identical -eq 100) {
    Write-Host "`n  ZERO REGRESSIONS - ALL 100 SCENARIOS IDENTICAL" -ForegroundColor Green
} elseif ($levelDiffs -eq 0 -and $errors -eq 0) {
    Write-Host "`n  NO CLASSIFICATION REGRESSIONS ($scoreDiffs minor score drifts)" -ForegroundColor Green
} else {
    Write-Host "`n  $($regressions.Count) SCENARIOS REQUIRE INVESTIGATION" -ForegroundColor Red
}
Write-Host "========================================================="
