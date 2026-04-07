########################################################################
# PRE-DEPLOY GATE — Run before ANY deployment
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File qa_predeploy_gate.ps1
#
# Exit codes:
#   0  = PASS  — safe to deploy
#   1  = FAIL  — regressions detected, deployment blocked
#
# This script:
#   1. Authenticates with the backend
#   2. Runs all 100 test scenarios
#   3. Compares every result against the frozen baseline
#   4. Reports any regression in score, level, state, or rec count
#   5. Blocks deployment if any regression is found
########################################################################

param(
    [string]$Email    = "qa100@gmail.com",
    [string]$Password = "QaTest123!",
    [string]$BaseUrl  = "http://localhost:8000/api",
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

# ══════════════════════════════════════════════════════════════════════
# FROZEN BASELINE — v2.0  (2026-04-07)
# DO NOT EDIT unless a CRITICAL change is approved and documented.
# If you must update, increment SCORING_MODEL_VERSION in
# backend/app/services/financial_analysis.py first.
# ══════════════════════════════════════════════════════════════════════
$frozen = @(
    # num, label,                           score,  level,            recs
    @(1,  "VeryHighMargin-LowDebt",          5.5,   "safe",           3),
    @(2,  "VeryHighMargin-ModDebt",          9.8,   "safe",           3),
    @(3,  "VeryHighMargin-HighDebt",        17.0,   "safe",           3),
    @(4,  "HealthyMargin20pct",             10.5,   "safe",           3),
    @(5,  "HealthyMargin15pct",             14.0,   "safe",           3),
    @(6,  "HealthyMargin10pct",             19.25,  "safe",           3),
    @(7,  "LowMargin5pct",                  16.67,  "safe",           3),
    @(8,  "LowMargin2pct",                  19.01,  "safe",           3),
    @(9,  "LowMargin0pct",                  19.12,  "safe",           3),
    @(10, "NegMargin-5pct",                 40.49,  "moderate_risk",  3),
    @(11, "NegMargin-20pct",                96.47,  "high_risk",      5),
    @(12, "NegMargin-50pct",               100.0,   "high_risk",      5),
    @(13, "NegMargin-100pct",              100.0,   "high_risk",      5),
    @(14, "NegMargin-200pct",              100.0,   "high_risk",      5),
    @(15, "ZeroRevenue",                   100.0,   "high_risk",      5),
    @(16, "Liq-VeryStrong-4.0",              5.43,  "safe",           3),
    @(17, "Liq-VeryStrong-6.0",              5.15,  "safe",           3),
    @(18, "Liq-Healthy-2.5",                6.12,   "safe",           3),
    @(19, "Liq-Healthy-1.8",                8.67,   "safe",           3),
    @(20, "Liq-Healthy-1.5",               11.21,   "safe",           3),
    @(21, "Liq-Borderline-1.3",            11.81,   "safe",           3),
    @(22, "Liq-Borderline-1.1",            12.0,    "safe",           3),
    @(23, "Liq-Borderline-1.0",            14.75,   "safe",           3),
    @(24, "Liq-Constrained-0.8",           16.0,    "safe",           3),
    @(25, "Liq-Constrained-0.6",           19.5,    "safe",           3),
    @(26, "Liq-Constrained-0.4",           24.5,    "safe",           3),
    @(27, "Liq-NearZero-0.15",            100.0,    "high_risk",      5),
    @(28, "Liq-NearZero-0.1",             100.0,    "high_risk",      5),
    @(29, "Liq-NearZero-0.05",            100.0,    "high_risk",      5),
    @(30, "Liq-Zero",                      100.0,   "high_risk",      5),
    @(31, "Lev-VeryLow-0.05",               5.75,  "safe",           3),
    @(32, "Lev-VeryLow-0.1",                6.25,  "safe",           3),
    @(33, "Lev-VeryLow-0.15",               7.21,  "safe",           3),
    @(34, "Lev-Moderate-0.3",               9.17,  "safe",           3),
    @(35, "Lev-Moderate-0.4",              13.18,   "safe",           3),
    @(36, "Lev-Moderate-0.55",             16.64,   "safe",           3),
    @(37, "Lev-High-0.65",                18.71,   "safe",           3),
    @(38, "Lev-High-0.8",                 22.33,   "safe",           3),
    @(39, "Lev-High-1.0",                 27.0,    "safe",           3),
    @(40, "Lev-Extreme-1.5",              29.14,   "safe",           3),
    @(41, "Lev-Extreme-2.0",              31.17,   "moderate_risk",  3),
    @(42, "Lev-Extreme-4.0",             100.0,    "high_risk",      5),
    @(43, "Runway-Infinite-Positive",       6.12,  "safe",           3),
    @(44, "Runway-9mo",                    48.91,  "moderate_risk",  3),
    @(45, "Runway-7mo",                    76.11,  "high_risk",      4),
    @(46, "Runway-5mo",                    89.15,  "high_risk",      5),
    @(47, "Runway-4mo",                    98.62,  "high_risk",      5),
    @(48, "Runway-3.5mo",                 100.0,   "high_risk",      5),
    @(49, "Runway-2mo",                   100.0,   "high_risk",      5),
    @(50, "Runway-1.5mo",                 100.0,   "high_risk",      4),
    @(51, "Runway-1mo",                   100.0,   "high_risk",      5),
    @(52, "Runway-0.5mo",                 100.0,   "high_risk",      5),
    @(53, "Runway-0.1mo",                 100.0,   "high_risk",      5),
    @(54, "Runway-0mo-NoCash",            100.0,   "high_risk",      5),
    @(55, "Combo-HighMargin-HighLev",      17.0,   "safe",           3),
    @(56, "Combo-HighMargin-LowLiq",        7.5,  "safe",           3),
    @(57, "Combo-HighMargin-ShortRun",     54.09,  "moderate_risk",  4),
    @(58, "Combo-LowMargin-HighLiq",       16.4,  "safe",           3),
    @(59, "Combo-LowMargin-LowLev",        16.52, "safe",           3),
    @(60, "Combo-LowMargin-ExtLev-LowLiq", 31.79, "moderate_risk",  3),
    @(61, "Combo-NegMargin-StrongLiq",     72.28,  "high_risk",      4),
    @(62, "Combo-NegMargin-LowDebt-Startup",73.06,"high_risk",      4),
    @(63, "Combo-WC-Constrained",          16.54,  "safe",           3),
    @(64, "Combo-AllBad",                 100.0,   "high_risk",      5),
    @(65, "Combo-AllGood",                   5.25, "safe",           3),
    @(66, "Combo-AllModerate",              17.0,  "safe",           3),
    @(67, "Combo-HighScale-ThinMargin",    16.34,  "safe",           3),
    @(68, "Combo-MicroBiz",                 5.75,  "safe",           3),
    @(69, "Combo-DebtEqualsAssets",         27.0,  "safe",           3),
    @(70, "Combo-NegativeEquity",          96.44,  "high_risk",      5),
    @(71, "Combo-HighCash-HighDebt",       25.54,  "safe",           3),
    @(72, "Combo-ExactBreakeven",          21.14,  "safe",           3),
    @(73, "Combo-HighCOGS",               23.03,   "safe",           3),
    @(74, "Combo-ZeroCOGS-Service",         6.0,   "safe",           3),
    @(75, "Combo-HighMargin-Declining",     5.98,  "safe",           3),
    @(76, "Combo-NegMargin-Growing",       77.67,  "high_risk",      4),
    @(77, "Combo-NoDebt-NoCash",           12.0,   "safe",           3),
    @(78, "Combo-PreLaunch-CashOnly",      40.0,   "moderate_risk",  3),
    @(79, "Combo-TinyNumbers",              5.75,  "safe",           3),
    @(80, "Combo-LargeScale",               5.75,  "safe",           3),
    @(81, "State-Stable-GrowthAllowed",     5.34,  "safe",           3),
    @(82, "State-Elevated-NoGrowth",       16.5,   "safe",           3),
    @(83, "State-Distressed-SurvivalOnly",100.0,   "high_risk",      5),
    @(84, "State-Distressed-GoodLiq",      76.68,  "high_risk",      4),
    @(85, "State-Distressed-LowDebt",     100.0,   "high_risk",      5),
    @(86, "State-Boundary-70",            100.0,   "high_risk",      5),
    @(87, "State-Boundary-40",             18.45,  "safe",           3),
    @(88, "State-BankruptcyTrigger",       26.29,  "safe",           3),
    @(89, "State-JustBelowBankruptcy",     10.53,  "safe",           3),
    @(90, "State-MaxHealth",                5.09,  "safe",           3),
    @(91, "Just-DriverPoints",             19.59,  "safe",           3),
    @(92, "Just-ComparisonThresholds",     24.88,  "safe",           3),
    @(93, "Just-ImpactQuantified",        100.0,   "high_risk",      5),
    @(94, "Just-PriorityRanking",           5.9,   "safe",           3),
    @(95, "Just-LargestContributor",      100.0,   "high_risk",      5),
    @(96, "Just-ImpactSorting",           100.0,   "high_risk",      5),
    @(97, "Just-TitleQuality",             19.13,  "safe",           3),
    @(98, "Just-NoGenericLanguage",        11.5,   "safe",           3),
    @(99, "Just-DistressedTone",          100.0,   "high_risk",      5),
    @(100,"Just-HealthyPositive",           5.24,  "safe",           3)
)

# ══════════════════════════════════════════════════════════════════════
# SCENARIO DEFINITIONS (financial record inputs)
# ══════════════════════════════════════════════════════════════════════
$inputs = @{
    1  = @{monthly_revenue=200000; monthly_expenses=100000; debt=10000; cash_reserves=100000; cost_of_goods_sold=30000; total_assets=300000; current_liabilities=20000}
    2  = @{monthly_revenue=200000; monthly_expenses=110000; debt=80000; cash_reserves=80000; cost_of_goods_sold=40000; total_assets=250000; current_liabilities=30000}
    3  = @{monthly_revenue=200000; monthly_expenses=100000; debt=200000; cash_reserves=50000; cost_of_goods_sold=30000; total_assets=250000; current_liabilities=80000}
    4  = @{monthly_revenue=100000; monthly_expenses=80000; debt=20000; cash_reserves=60000; cost_of_goods_sold=25000; total_assets=200000; current_liabilities=30000}
    5  = @{monthly_revenue=100000; monthly_expenses=85000; debt=30000; cash_reserves=40000; cost_of_goods_sold=30000; total_assets=150000; current_liabilities=25000}
    6  = @{monthly_revenue=100000; monthly_expenses=90000; debt=50000; cash_reserves=30000; cost_of_goods_sold=30000; total_assets=120000; current_liabilities=35000}
    7  = @{monthly_revenue=100000; monthly_expenses=95000; debt=20000; cash_reserves=50000; cost_of_goods_sold=30000; total_assets=180000; current_liabilities=25000}
    8  = @{monthly_revenue=100000; monthly_expenses=98000; debt=30000; cash_reserves=40000; cost_of_goods_sold=30000; total_assets=160000; current_liabilities=30000}
    9  = @{monthly_revenue=100000; monthly_expenses=100000; debt=20000; cash_reserves=50000; cost_of_goods_sold=30000; total_assets=180000; current_liabilities=25000}
    10 = @{monthly_revenue=100000; monthly_expenses=105000; debt=20000; cash_reserves=50000; cost_of_goods_sold=30000; total_assets=160000; current_liabilities=25000}
    11 = @{monthly_revenue=100000; monthly_expenses=120000; debt=40000; cash_reserves=40000; cost_of_goods_sold=30000; total_assets=150000; current_liabilities=35000}
    12 = @{monthly_revenue=100000; monthly_expenses=150000; debt=60000; cash_reserves=30000; cost_of_goods_sold=40000; total_assets=120000; current_liabilities=50000}
    13 = @{monthly_revenue=50000; monthly_expenses=100000; debt=80000; cash_reserves=20000; cost_of_goods_sold=20000; total_assets=80000; current_liabilities=40000}
    14 = @{monthly_revenue=30000; monthly_expenses=90000; debt=100000; cash_reserves=10000; cost_of_goods_sold=15000; total_assets=60000; current_liabilities=50000}
    15 = @{monthly_revenue=0; monthly_expenses=28000; debt=35000; cash_reserves=30000; cost_of_goods_sold=0; total_assets=45000; current_liabilities=22000}
    16 = @{monthly_revenue=120000; monthly_expenses=70000; debt=10000; cash_reserves=200000; cost_of_goods_sold=20000; total_assets=350000; current_liabilities=50000}
    17 = @{monthly_revenue=150000; monthly_expenses=80000; debt=5000; cash_reserves=300000; cost_of_goods_sold=25000; total_assets=500000; current_liabilities=50000}
    18 = @{monthly_revenue=100000; monthly_expenses=70000; debt=15000; cash_reserves=75000; cost_of_goods_sold=20000; total_assets=200000; current_liabilities=30000}
    19 = @{monthly_revenue=100000; monthly_expenses=75000; debt=20000; cash_reserves=54000; cost_of_goods_sold=20000; total_assets=180000; current_liabilities=30000}
    20 = @{monthly_revenue=100000; monthly_expenses=80000; debt=25000; cash_reserves=45000; cost_of_goods_sold=20000; total_assets=170000; current_liabilities=30000}
    21 = @{monthly_revenue=100000; monthly_expenses=80000; debt=30000; cash_reserves=39000; cost_of_goods_sold=25000; total_assets=160000; current_liabilities=30000}
    22 = @{monthly_revenue=100000; monthly_expenses=80000; debt=30000; cash_reserves=33000; cost_of_goods_sold=25000; total_assets=150000; current_liabilities=30000}
    23 = @{monthly_revenue=100000; monthly_expenses=85000; debt=35000; cash_reserves=30000; cost_of_goods_sold=25000; total_assets=140000; current_liabilities=30000}
    24 = @{monthly_revenue=100000; monthly_expenses=85000; debt=40000; cash_reserves=24000; cost_of_goods_sold=25000; total_assets=120000; current_liabilities=30000}
    25 = @{monthly_revenue=80000; monthly_expenses=70000; debt=50000; cash_reserves=18000; cost_of_goods_sold=20000; total_assets=100000; current_liabilities=30000}
    26 = @{monthly_revenue=80000; monthly_expenses=75000; debt=60000; cash_reserves=12000; cost_of_goods_sold=20000; total_assets=90000; current_liabilities=30000}
    27 = @{monthly_revenue=60000; monthly_expenses=70000; debt=80000; cash_reserves=4500; cost_of_goods_sold=15000; total_assets=70000; current_liabilities=30000}
    28 = @{monthly_revenue=50000; monthly_expenses=65000; debt=90000; cash_reserves=3000; cost_of_goods_sold=15000; total_assets=60000; current_liabilities=30000}
    29 = @{monthly_revenue=40000; monthly_expenses=60000; debt=100000; cash_reserves=1500; cost_of_goods_sold=10000; total_assets=50000; current_liabilities=30000}
    30 = @{monthly_revenue=40000; monthly_expenses=55000; debt=100000; cash_reserves=0; cost_of_goods_sold=10000; total_assets=45000; current_liabilities=30000}
    31 = @{monthly_revenue=120000; monthly_expenses=70000; debt=10000; cash_reserves=100000; cost_of_goods_sold=20000; total_assets=200000; current_liabilities=20000}
    32 = @{monthly_revenue=110000; monthly_expenses=65000; debt=15000; cash_reserves=90000; cost_of_goods_sold=18000; total_assets=180000; current_liabilities=18000}
    33 = @{monthly_revenue=100000; monthly_expenses=60000; debt=25000; cash_reserves=80000; cost_of_goods_sold=15000; total_assets=170000; current_liabilities=20000}
    34 = @{monthly_revenue=100000; monthly_expenses=70000; debt=50000; cash_reserves=60000; cost_of_goods_sold=20000; total_assets=180000; current_liabilities=25000}
    35 = @{monthly_revenue=100000; monthly_expenses=75000; debt=70000; cash_reserves=50000; cost_of_goods_sold=22000; total_assets=170000; current_liabilities=28000}
    36 = @{monthly_revenue=100000; monthly_expenses=78000; debt=90000; cash_reserves=45000; cost_of_goods_sold=25000; total_assets=160000; current_liabilities=30000}
    37 = @{monthly_revenue=100000; monthly_expenses=80000; debt=110000; cash_reserves=40000; cost_of_goods_sold=25000; total_assets=170000; current_liabilities=35000}
    38 = @{monthly_revenue=90000; monthly_expenses=75000; debt=120000; cash_reserves=30000; cost_of_goods_sold=22000; total_assets=150000; current_liabilities=35000}
    39 = @{monthly_revenue=80000; monthly_expenses=70000; debt=140000; cash_reserves=25000; cost_of_goods_sold=20000; total_assets=140000; current_liabilities=40000}
    40 = @{monthly_revenue=70000; monthly_expenses=65000; debt=180000; cash_reserves=20000; cost_of_goods_sold=18000; total_assets=120000; current_liabilities=45000}
    41 = @{monthly_revenue=60000; monthly_expenses=55000; debt=200000; cash_reserves=15000; cost_of_goods_sold=15000; total_assets=100000; current_liabilities=50000}
    42 = @{monthly_revenue=40000; monthly_expenses=55000; debt=300000; cash_reserves=5000; cost_of_goods_sold=10000; total_assets=75000; current_liabilities=60000}
    43 = @{monthly_revenue=100000; monthly_expenses=70000; debt=15000; cash_reserves=80000; cost_of_goods_sold=20000; total_assets=200000; current_liabilities=25000}
    44 = @{monthly_revenue=50000; monthly_expenses=55000; debt=20000; cash_reserves=45000; cost_of_goods_sold=15000; total_assets=150000; current_liabilities=25000}
    45 = @{monthly_revenue=50000; monthly_expenses=58000; debt=25000; cash_reserves=56000; cost_of_goods_sold=15000; total_assets=140000; current_liabilities=28000}
    46 = @{monthly_revenue=60000; monthly_expenses=70000; debt=30000; cash_reserves=50000; cost_of_goods_sold=18000; total_assets=130000; current_liabilities=30000}
    47 = @{monthly_revenue=60000; monthly_expenses=75000; debt=35000; cash_reserves=60000; cost_of_goods_sold=18000; total_assets=120000; current_liabilities=35000}
    48 = @{monthly_revenue=50000; monthly_expenses=65000; debt=40000; cash_reserves=52500; cost_of_goods_sold=15000; total_assets=110000; current_liabilities=35000}
    49 = @{monthly_revenue=40000; monthly_expenses=60000; debt=50000; cash_reserves=40000; cost_of_goods_sold=12000; total_assets=90000; current_liabilities=40000}
    50 = @{monthly_revenue=30000; monthly_expenses=50000; debt=60000; cash_reserves=30000; cost_of_goods_sold=10000; total_assets=80000; current_liabilities=45000}
    51 = @{monthly_revenue=30000; monthly_expenses=55000; debt=70000; cash_reserves=25000; cost_of_goods_sold=10000; total_assets=70000; current_liabilities=50000}
    52 = @{monthly_revenue=25000; monthly_expenses=55000; debt=80000; cash_reserves=15000; cost_of_goods_sold=8000; total_assets=60000; current_liabilities=50000}
    53 = @{monthly_revenue=20000; monthly_expenses=50000; debt=90000; cash_reserves=3000; cost_of_goods_sold=8000; total_assets=50000; current_liabilities=50000}
    54 = @{monthly_revenue=20000; monthly_expenses=60000; debt=100000; cash_reserves=0; cost_of_goods_sold=8000; total_assets=40000; current_liabilities=50000}
    55 = @{monthly_revenue=200000; monthly_expenses=110000; debt=200000; cash_reserves=60000; cost_of_goods_sold=35000; total_assets=250000; current_liabilities=50000}
    56 = @{monthly_revenue=180000; monthly_expenses=100000; debt=30000; cash_reserves=25000; cost_of_goods_sold=30000; total_assets=180000; current_liabilities=35000}
    57 = @{monthly_revenue=50000; monthly_expenses=55000; debt=10000; cash_reserves=10000; cost_of_goods_sold=15000; total_assets=150000; current_liabilities=15000}
    58 = @{monthly_revenue=100000; monthly_expenses=97000; debt=10000; cash_reserves=120000; cost_of_goods_sold=30000; total_assets=250000; current_liabilities=30000}
    59 = @{monthly_revenue=100000; monthly_expenses=96000; debt=15000; cash_reserves=60000; cost_of_goods_sold=30000; total_assets=200000; current_liabilities=25000}
    60 = @{monthly_revenue=80000; monthly_expenses=78000; debt=180000; cash_reserves=10000; cost_of_goods_sold=25000; total_assets=100000; current_liabilities=50000}
    61 = @{monthly_revenue=80000; monthly_expenses=100000; debt=10000; cash_reserves=200000; cost_of_goods_sold=25000; total_assets=300000; current_liabilities=40000}
    62 = @{monthly_revenue=30000; monthly_expenses=50000; debt=5000; cash_reserves=120000; cost_of_goods_sold=10000; total_assets=200000; current_liabilities=15000}
    63 = @{monthly_revenue=120000; monthly_expenses=80000; debt=100000; cash_reserves=20000; cost_of_goods_sold=25000; total_assets=130000; current_liabilities=30000}
    64 = @{monthly_revenue=10000; monthly_expenses=80000; debt=300000; cash_reserves=2000; cost_of_goods_sold=5000; total_assets=30000; current_liabilities=60000}
    65 = @{monthly_revenue=250000; monthly_expenses=120000; debt=10000; cash_reserves=300000; cost_of_goods_sold=30000; total_assets=600000; current_liabilities=30000}
    66 = @{monthly_revenue=100000; monthly_expenses=85000; debt=60000; cash_reserves=35000; cost_of_goods_sold=25000; total_assets=150000; current_liabilities=30000}
    67 = @{monthly_revenue=500000; monthly_expenses=480000; debt=50000; cash_reserves=100000; cost_of_goods_sold=200000; total_assets=800000; current_liabilities=80000}
    68 = @{monthly_revenue=5000; monthly_expenses=3000; debt=1000; cash_reserves=10000; cost_of_goods_sold=1000; total_assets=20000; current_liabilities=2000}
    69 = @{monthly_revenue=80000; monthly_expenses=70000; debt=150000; cash_reserves=25000; cost_of_goods_sold=20000; total_assets=150000; current_liabilities=40000}
    70 = @{monthly_revenue=60000; monthly_expenses=65000; debt=200000; cash_reserves=10000; cost_of_goods_sold=15000; total_assets=80000; current_liabilities=50000}
    71 = @{monthly_revenue=100000; monthly_expenses=90000; debt=200000; cash_reserves=150000; cost_of_goods_sold=25000; total_assets=300000; current_liabilities=40000}
    72 = @{monthly_revenue=100000; monthly_expenses=100000; debt=30000; cash_reserves=50000; cost_of_goods_sold=30000; total_assets=180000; current_liabilities=25000}
    73 = @{monthly_revenue=100000; monthly_expenses=95000; debt=20000; cash_reserves=50000; cost_of_goods_sold=70000; total_assets=180000; current_liabilities=25000}
    74 = @{monthly_revenue=80000; monthly_expenses=50000; debt=10000; cash_reserves=60000; cost_of_goods_sold=0; total_assets=150000; current_liabilities=20000}
    75 = @{monthly_revenue=120000; monthly_expenses=70000; debt=15000; cash_reserves=80000; cost_of_goods_sold=20000; total_assets=230000; current_liabilities=25000}
    76 = @{monthly_revenue=60000; monthly_expenses=75000; debt=20000; cash_reserves=90000; cost_of_goods_sold=15000; total_assets=180000; current_liabilities=25000}
    77 = @{monthly_revenue=80000; monthly_expenses=70000; debt=0; cash_reserves=0; cost_of_goods_sold=20000; total_assets=100000; current_liabilities=25000}
    78 = @{monthly_revenue=0; monthly_expenses=15000; debt=0; cash_reserves=200000; cost_of_goods_sold=0; total_assets=250000; current_liabilities=10000}
    79 = @{monthly_revenue=100; monthly_expenses=60; debt=10; cash_reserves=50; cost_of_goods_sold=20; total_assets=200; current_liabilities=15}
    80 = @{monthly_revenue=10000000; monthly_expenses=6000000; debt=1000000; cash_reserves=5000000; cost_of_goods_sold=2000000; total_assets=20000000; current_liabilities=1500000}
    81 = @{monthly_revenue=150000; monthly_expenses=85000; debt=8000; cash_reserves=150000; cost_of_goods_sold=25000; total_assets=350000; current_liabilities=30000}
    82 = @{monthly_revenue=100000; monthly_expenses=80000; debt=80000; cash_reserves=70000; cost_of_goods_sold=25000; total_assets=160000; current_liabilities=40000}
    83 = @{monthly_revenue=30000; monthly_expenses=80000; debt=200000; cash_reserves=10000; cost_of_goods_sold=10000; total_assets=50000; current_liabilities=60000}
    84 = @{monthly_revenue=40000; monthly_expenses=70000; debt=10000; cash_reserves=250000; cost_of_goods_sold=12000; total_assets=300000; current_liabilities=30000}
    85 = @{monthly_revenue=20000; monthly_expenses=60000; debt=5000; cash_reserves=30000; cost_of_goods_sold=8000; total_assets=100000; current_liabilities=10000}
    86 = @{monthly_revenue=50000; monthly_expenses=65000; debt=80000; cash_reserves=20000; cost_of_goods_sold=15000; total_assets=90000; current_liabilities=35000}
    87 = @{monthly_revenue=90000; monthly_expenses=80000; debt=55000; cash_reserves=35000; cost_of_goods_sold=22000; total_assets=140000; current_liabilities=30000}
    88 = @{monthly_revenue=70000; monthly_expenses=60000; debt=120000; cash_reserves=25000; cost_of_goods_sold=18000; total_assets=100000; current_liabilities=40000}
    89 = @{monthly_revenue=100000; monthly_expenses=75000; debt=40000; cash_reserves=50000; cost_of_goods_sold=22000; total_assets=170000; current_liabilities=28000}
    90 = @{monthly_revenue=300000; monthly_expenses=150000; debt=5000; cash_reserves=500000; cost_of_goods_sold=40000; total_assets=800000; current_liabilities=20000}
    91 = @{monthly_revenue=100000; monthly_expenses=80000; debt=120000; cash_reserves=40000; cost_of_goods_sold=25000; total_assets=170000; current_liabilities=45000}
    92 = @{monthly_revenue=80000; monthly_expenses=75000; debt=90000; cash_reserves=30000; cost_of_goods_sold=20000; total_assets=130000; current_liabilities=40000}
    93 = @{monthly_revenue=60000; monthly_expenses=70000; debt=100000; cash_reserves=15000; cost_of_goods_sold=15000; total_assets=80000; current_liabilities=45000}
    94 = @{monthly_revenue=110000; monthly_expenses=70000; debt=15000; cash_reserves=90000; cost_of_goods_sold=20000; total_assets=250000; current_liabilities=22000}
    95 = @{monthly_revenue=50000; monthly_expenses=80000; debt=150000; cash_reserves=8000; cost_of_goods_sold=15000; total_assets=70000; current_liabilities=50000}
    96 = @{monthly_revenue=70000; monthly_expenses=90000; debt=130000; cash_reserves=12000; cost_of_goods_sold=18000; total_assets=80000; current_liabilities=45000}
    97 = @{monthly_revenue=90000; monthly_expenses=85000; debt=45000; cash_reserves=40000; cost_of_goods_sold=22000; total_assets=155000; current_liabilities=30000}
    98 = @{monthly_revenue=120000; monthly_expenses=90000; debt=60000; cash_reserves=50000; cost_of_goods_sold=30000; total_assets=200000; current_liabilities=35000}
    99 = @{monthly_revenue=15000; monthly_expenses=70000; debt=250000; cash_reserves=3000; cost_of_goods_sold=5000; total_assets=35000; current_liabilities=55000}
    100= @{monthly_revenue=200000; monthly_expenses=100000; debt=8000; cash_reserves=250000; cost_of_goods_sold=25000; total_assets=500000; current_liabilities=25000}
}

# ══════════════════════════════════════════════════════════════════════
# EXECUTION
# ══════════════════════════════════════════════════════════════════════

# Auth
$loginBody = @{email=$Email; password=$Password} | ConvertTo-Json
$loginResp = Invoke-RestMethod "$BaseUrl/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
$TOKEN = $loginResp.access_token
$H = @{ Authorization = "Bearer $TOKEN"; "Content-Type" = "application/json" }

$identical = 0; $regressions = @(); $errors = 0

Write-Host "`n================================================================="
Write-Host "  PRE-DEPLOY GATE  |  Scoring Model v2.0  |  100 scenarios"
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "=================================================================`n"

for ($i = 0; $i -lt $frozen.Count; $i++) {
    $num   = $frozen[$i][0]
    $label = $frozen[$i][1]
    $expScore = $frozen[$i][2]
    $expLevel = $frozen[$i][3]
    $expRecs  = $frozen[$i][4]
    $record = $inputs[$num]

    try {
        # Create business
        $biz = @{name="GATE-$num $label"; industry="Other"; country="US"; num_employees=10; years_operating=3; monthly_fixed_costs=5000} | ConvertTo-Json
        $b = Invoke-RestMethod "$BaseUrl/businesses" -Method POST -Headers $H -Body $biz
        $bid = $b.id

        # Add financial record (strip nulls)
        $defaults = @{period_month=3; period_year=2026; payroll=20000; rent=5000; taxes=5000}
        foreach ($k in $record.Keys) { $defaults[$k] = $record[$k] }
        $clean = @{}
        foreach ($k in $defaults.Keys) { if ($null -ne $defaults[$k]) { $clean[$k] = $defaults[$k] } }
        Invoke-RestMethod "$BaseUrl/businesses/$bid/records" -Method POST -Headers $H -Body ($clean | ConvertTo-Json) | Out-Null

        # Run analysis
        $a = Invoke-RestMethod "$BaseUrl/businesses/$bid/analyze" -Method POST -Headers $H

        # Compare
        $diffs = @()
        $scoreDelta = [math]::Round($a.risk_score - $expScore, 2)
        if ([math]::Abs($scoreDelta) -gt 0.01) {
            $sign = if ($scoreDelta -gt 0) { "+" } else { "" }
            $diffs += "SCORE: $expScore -> $($a.risk_score) (${sign}${scoreDelta})"
        }
        if ($a.risk_level -ne $expLevel) {
            $diffs += "LEVEL: $expLevel -> $($a.risk_level)"
        }
        if ($a.recommendations.Count -ne $expRecs) {
            $diffs += "REC_COUNT: $expRecs -> $($a.recommendations.Count)"
        }

        # Justification integrity check
        foreach ($rec in $a.recommendations) {
            if (-not $rec.justification -or -not $rec.justification.driver -or -not $rec.justification.comparison -or -not $rec.justification.impact -or -not $rec.justification.priority_reason) {
                $diffs += "JUSTIFICATION_MISSING: '$($rec.title)'"
            }
        }

        if ($diffs.Count -eq 0) {
            $identical++
            if ($Verbose) { Write-Host "  #$num PASS | $label" -ForegroundColor DarkGreen }
        } else {
            $regressions += @{num=$num; label=$label; diffs=$diffs}
            Write-Host "  #$num REGRESSION | $label | $($diffs -join ' | ')" -ForegroundColor Red
        }
    }
    catch {
        $errors++
        $regressions += @{num=$num; label=$label; diffs=@("ERROR: $($_.Exception.Message)")}
        Write-Host "  #$num ERROR | $label | $($_.Exception.Message)" -ForegroundColor Magenta
    }
}

# ══════════════════════════════════════════════════════════════════════
# VERDICT
# ══════════════════════════════════════════════════════════════════════
Write-Host "`n================================================================="
Write-Host "  GATE RESULT"
Write-Host "================================================================="
Write-Host "  Passed:      $identical / 100"
Write-Host "  Regressions: $($regressions.Count)" -ForegroundColor $(if ($regressions.Count -gt 0) { "Red" } else { "Green" })
Write-Host "  Errors:      $errors" -ForegroundColor $(if ($errors -gt 0) { "Red" } else { "Green" })

if ($regressions.Count -gt 0) {
    Write-Host "`n  DEPLOYMENT BLOCKED" -ForegroundColor Red
    Write-Host "  The following scenarios regressed:`n" -ForegroundColor Red
    foreach ($r in $regressions) {
        Write-Host "    #$($r.num) $($r.label)" -ForegroundColor Red
        foreach ($d in $r.diffs) { Write-Host "      $d" -ForegroundColor Yellow }
    }
    Write-Host "`n  To unblock:"
    Write-Host "    1. Revert the change, OR"
    Write-Host "    2. Classify as CRITICAL, update baseline, increment model version"
    Write-Host "================================================================="
    exit 1
} else {
    Write-Host "`n  DEPLOYMENT APPROVED" -ForegroundColor Green
    Write-Host "  All 100 scenarios match baseline v2.0"
    Write-Host "================================================================="
    exit 0
}
