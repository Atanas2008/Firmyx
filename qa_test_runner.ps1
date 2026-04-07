$ErrorActionPreference = "Continue"
$BASE = "http://localhost:8000/api"
$H = @{ "Authorization" = "Bearer $env:QA_TOKEN"; "Content-Type" = "application/json" }

function Api($method, $path, $body = $null) {
    $params = @{ Uri = "$BASE$path"; Method = $method; Headers = $H; ContentType = "application/json" }
    if ($body) { $params["Body"] = ($body | ConvertTo-Json -Depth 10) }
    Invoke-RestMethod @params
}

function CreateBusiness($name, $industry, $country, $employees, $years, $fixedCosts) {
    Api "POST" "/businesses" @{ name=$name; industry=$industry; country=$country; num_employees=$employees; years_operating=$years; monthly_fixed_costs=$fixedCosts }
}

function AddRecord($bizId, $month, $year, $rev, $exp, $payroll, $rent, $debt, $cash, $taxes, $cogs, $totalAssets=$null, $currLiab=$null, $ebit=$null, $retainedEarnings=$null) {
    $body = @{
        period_month=$month; period_year=$year
        monthly_revenue=$rev; monthly_expenses=$exp
        payroll=$payroll; rent=$rent; debt=$debt
        cash_reserves=$cash; taxes=$taxes; cost_of_goods_sold=$cogs
    }
    if ($null -ne $totalAssets) { $body["total_assets"] = $totalAssets }
    if ($null -ne $currLiab) { $body["current_liabilities"] = $currLiab }
    if ($null -ne $ebit) { $body["ebit"] = $ebit }
    if ($null -ne $retainedEarnings) { $body["retained_earnings"] = $retainedEarnings }
    Api "POST" "/businesses/$bizId/records" $body
}

function RunAnalysis($bizId) {
    Api "POST" "/businesses/$bizId/analyze"
}

function RunAllMonths($bizId) {
    Api "POST" "/businesses/$bizId/analyze/all-months"
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  SCENARIO 1: HEALTHY BUSINESS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$biz1 = CreateBusiness "CloudTech Solutions" "Technology" "United States" 50 8 15000
Write-Host "Business created: $($biz1.id)"

# Month 1 (previous - for trend)
AddRecord $biz1.id 1 2026 180000 110000 55000 15000 50000 200000 12000 20000 500000 40000 75000 120000 | Out-Null
# Month 2 (current - slightly better)
AddRecord $biz1.id 2 2026 200000 120000 60000 15000 50000 220000 14000 22000 520000 42000 85000 140000 | Out-Null

$a1 = RunAnalysis $biz1.id
Write-Host "`nRESULTS:"
Write-Host "  Risk Score:        $($a1.risk_score)"
Write-Host "  Risk Level:        $($a1.risk_level)"
Write-Host "  Health Score:      $($a1.financial_health_score)"
Write-Host "  Profit Margin:     $($a1.profit_margin)%"
Write-Host "  Debt Ratio:        $($a1.debt_ratio)"
Write-Host "  Liquidity Ratio:   $($a1.liquidity_ratio)"
Write-Host "  Altman Z-Score:    $($a1.altman_z_score)"
Write-Host "  Bankruptcy Prob:   $($a1.bankruptcy_probability)%"
Write-Host "  Burn Rate:         $($a1.burn_rate)"
Write-Host "  Cash Runway:       $($a1.cash_runway_months)"
Write-Host "  Revenue Trend:     $($a1.revenue_trend)"
Write-Host "  Expense Trend:     $($a1.expense_trend)"
Write-Host "  Industry Model:    $($a1.industry_model_applied)"
Write-Host "  Scope:             $($a1.analysis_scope)"
Write-Host "  Recommendations:   $($a1.recommendations | ConvertTo-Json -Compress)"
Write-Host "  Explanation:       $($a1.risk_explanation)"
Write-Host "  Calc Sources:      $($a1.calculation_sources | ConvertTo-Json -Compress)"


Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "  SCENARIO 2: HIGH LEVERAGE" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

$biz2 = CreateBusiness "Urban Property Group" "Real Estate" "United Kingdom" 25 12 30000
Write-Host "Business created: $($biz2.id)"

# High debt, low cash, moderate revenue
AddRecord $biz2.id 1 2026 90000 75000 30000 20000 800000 30000 8000 10000 1200000 300000 18000 50000 | Out-Null
AddRecord $biz2.id 2 2026 95000 78000 32000 20000 850000 25000 9000 11000 1200000 320000 20000 55000 | Out-Null

$a2 = RunAnalysis $biz2.id
Write-Host "`nRESULTS:"
Write-Host "  Risk Score:        $($a2.risk_score)"
Write-Host "  Risk Level:        $($a2.risk_level)"
Write-Host "  Health Score:      $($a2.financial_health_score)"
Write-Host "  Profit Margin:     $($a2.profit_margin)%"
Write-Host "  Debt Ratio:        $($a2.debt_ratio)"
Write-Host "  Liquidity Ratio:   $($a2.liquidity_ratio)"
Write-Host "  Altman Z-Score:    $($a2.altman_z_score)"
Write-Host "  Bankruptcy Prob:   $($a2.bankruptcy_probability)%"
Write-Host "  Burn Rate:         $($a2.burn_rate)"
Write-Host "  Cash Runway:       $($a2.cash_runway_months)"
Write-Host "  Revenue Trend:     $($a2.revenue_trend)"
Write-Host "  Expense Trend:     $($a2.expense_trend)"
Write-Host "  Industry Model:    $($a2.industry_model_applied)"
Write-Host "  Recommendations:   $($a2.recommendations | ConvertTo-Json -Compress)"
Write-Host "  Explanation:       $($a2.risk_explanation)"
Write-Host "  Calc Sources:      $($a2.calculation_sources | ConvertTo-Json -Compress)"


Write-Host "`n========================================" -ForegroundColor Red
Write-Host "  SCENARIO 3: BANKRUPTCY RISK" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red

$biz3 = CreateBusiness "FailMart Retail" "Retail" "Germany" 120 3 45000
Write-Host "Business created: $($biz3.id)"

# Hemorrhaging money, high debt, almost no cash
AddRecord $biz3.id 1 2026 40000 95000 45000 18000 500000 8000 4000 15000 200000 180000 -50000 -30000 | Out-Null
AddRecord $biz3.id 2 2026 35000 100000 48000 18000 520000 3000 3000 12000 190000 190000 -60000 -45000 | Out-Null

$a3 = RunAnalysis $biz3.id
Write-Host "`nRESULTS:"
Write-Host "  Risk Score:        $($a3.risk_score)"
Write-Host "  Risk Level:        $($a3.risk_level)"
Write-Host "  Health Score:      $($a3.financial_health_score)"
Write-Host "  Profit Margin:     $($a3.profit_margin)%"
Write-Host "  Debt Ratio:        $($a3.debt_ratio)"
Write-Host "  Liquidity Ratio:   $($a3.liquidity_ratio)"
Write-Host "  Altman Z-Score:    $($a3.altman_z_score)"
Write-Host "  Bankruptcy Prob:   $($a3.bankruptcy_probability)%"
Write-Host "  Burn Rate:         $($a3.burn_rate)"
Write-Host "  Cash Runway:       $($a3.cash_runway_months)"
Write-Host "  Revenue Trend:     $($a3.revenue_trend)"
Write-Host "  Expense Trend:     $($a3.expense_trend)"
Write-Host "  Recommendations:   $($a3.recommendations | ConvertTo-Json -Compress)"
Write-Host "  Explanation:       $($a3.risk_explanation)"


Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "  SCENARIO 4: WORKING CAPITAL CONSTRAINED" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta

$biz4 = CreateBusiness "QuickBite Restaurants" "Restaurants" "Bulgaria" 35 5 12000
Write-Host "Business created: $($biz4.id)"

# Profitable BUT very low liquidity — should NOT be classified as "safe"
AddRecord $biz4.id 1 2026 120000 95000 50000 18000 200000 5000 8000 25000 300000 250000 28000 40000 | Out-Null
AddRecord $biz4.id 2 2026 125000 98000 52000 18000 210000 4000 9000 27000 300000 260000 30000 45000 | Out-Null

$a4 = RunAnalysis $biz4.id
Write-Host "`nRESULTS:"
Write-Host "  Risk Score:        $($a4.risk_score)"
Write-Host "  Risk Level:        $($a4.risk_level)"
Write-Host "  Health Score:      $($a4.financial_health_score)"
Write-Host "  Profit Margin:     $($a4.profit_margin)%"
Write-Host "  Debt Ratio:        $($a4.debt_ratio)"
Write-Host "  Liquidity Ratio:   $($a4.liquidity_ratio)"
Write-Host "  Altman Z-Score:    $($a4.altman_z_score)"
Write-Host "  Bankruptcy Prob:   $($a4.bankruptcy_probability)%"
Write-Host "  Burn Rate:         $($a4.burn_rate)"
Write-Host "  Cash Runway:       $($a4.cash_runway_months)"
Write-Host "  Revenue Trend:     $($a4.revenue_trend)"
Write-Host "  Expense Trend:     $($a4.expense_trend)"
Write-Host "  Recommendations:   $($a4.recommendations | ConvertTo-Json -Compress)"
Write-Host "  Explanation:       $($a4.risk_explanation)"


Write-Host "`n========================================" -ForegroundColor DarkYellow
Write-Host "  SCENARIO 5: HIGH GROWTH UNSTABLE" -ForegroundColor DarkYellow
Write-Host "========================================" -ForegroundColor DarkYellow

$biz5 = CreateBusiness "RocketScale AI" "Software" "United States" 15 1 8000
Write-Host "Business created: $($biz5.id)"

# Huge revenue growth but expenses outpacing, cash draining
AddRecord $biz5.id 1 2026 50000 70000 35000 8000 100000 60000 3000 5000 150000 50000 -18000 -10000 | Out-Null
AddRecord $biz5.id 2 2026 80000 110000 55000 10000 120000 35000 4000 8000 140000 60000 -28000 -15000 | Out-Null

$a5 = RunAnalysis $biz5.id
Write-Host "`nRESULTS:"
Write-Host "  Risk Score:        $($a5.risk_score)"
Write-Host "  Risk Level:        $($a5.risk_level)"
Write-Host "  Health Score:      $($a5.financial_health_score)"
Write-Host "  Profit Margin:     $($a5.profit_margin)%"
Write-Host "  Debt Ratio:        $($a5.debt_ratio)"
Write-Host "  Liquidity Ratio:   $($a5.liquidity_ratio)"
Write-Host "  Altman Z-Score:    $($a5.altman_z_score)"
Write-Host "  Bankruptcy Prob:   $($a5.bankruptcy_probability)%"
Write-Host "  Burn Rate:         $($a5.burn_rate)"
Write-Host "  Cash Runway:       $($a5.cash_runway_months)"
Write-Host "  Revenue Trend:     $($a5.revenue_trend)"
Write-Host "  Expense Trend:     $($a5.expense_trend)"
Write-Host "  Recommendations:   $($a5.recommendations | ConvertTo-Json -Compress)"
Write-Host "  Explanation:       $($a5.risk_explanation)"


Write-Host "`n========================================" -ForegroundColor DarkRed
Write-Host "  SCENARIO 6: ZERO REVENUE EDGE CASE" -ForegroundColor DarkRed
Write-Host "========================================" -ForegroundColor DarkRed

$biz6 = CreateBusiness "PreLaunch Labs" "Technology" "Netherlands" 5 0 5000
Write-Host "Business created: $($biz6.id)"

# Zero revenue, only expenses — pre-revenue startup
AddRecord $biz6.id 1 2026 0 25000 15000 5000 30000 40000 0 0 50000 20000 -25000 0 | Out-Null
AddRecord $biz6.id 2 2026 0 28000 16000 5000 35000 30000 0 0 45000 22000 -28000 0 | Out-Null

$a6 = RunAnalysis $biz6.id
Write-Host "`nRESULTS:"
Write-Host "  Risk Score:        $($a6.risk_score)"
Write-Host "  Risk Level:        $($a6.risk_level)"
Write-Host "  Health Score:      $($a6.financial_health_score)"
Write-Host "  Profit Margin:     $($a6.profit_margin)%"
Write-Host "  Debt Ratio:        $($a6.debt_ratio)"
Write-Host "  Liquidity Ratio:   $($a6.liquidity_ratio)"
Write-Host "  Altman Z-Score:    $($a6.altman_z_score)"
Write-Host "  Bankruptcy Prob:   $($a6.bankruptcy_probability)%"
Write-Host "  Burn Rate:         $($a6.burn_rate)"
Write-Host "  Cash Runway:       $($a6.cash_runway_months)"
Write-Host "  Revenue Trend:     $($a6.revenue_trend)"
Write-Host "  Expense Trend:     $($a6.expense_trend)"
Write-Host "  Recommendations:   $($a6.recommendations | ConvertTo-Json -Compress)"
Write-Host "  Explanation:       $($a6.risk_explanation)"


Write-Host "`n========================================" -ForegroundColor DarkMagenta
Write-Host "  SCENARIO 7: EXTREME STRESS" -ForegroundColor DarkMagenta
Write-Host "========================================" -ForegroundColor DarkMagenta

$biz7 = CreateBusiness "DebtCrush Manufacturing" "Manufacturing" "Brazil" 200 15 80000
Write-Host "Business created: $($biz7.id)"

# Massive debt, collapsing revenue, near-zero cash
AddRecord $biz7.id 1 2026 60000 150000 70000 25000 3000000 2000 15000 20000 800000 600000 -85000 -200000 | Out-Null
AddRecord $biz7.id 2 2026 45000 160000 75000 25000 3200000 500 12000 15000 750000 650000 -110000 -250000 | Out-Null

$a7 = RunAnalysis $biz7.id
Write-Host "`nRESULTS:"
Write-Host "  Risk Score:        $($a7.risk_score)"
Write-Host "  Risk Level:        $($a7.risk_level)"
Write-Host "  Health Score:      $($a7.financial_health_score)"
Write-Host "  Profit Margin:     $($a7.profit_margin)%"
Write-Host "  Debt Ratio:        $($a7.debt_ratio)"
Write-Host "  Liquidity Ratio:   $($a7.liquidity_ratio)"
Write-Host "  Altman Z-Score:    $($a7.altman_z_score)"
Write-Host "  Bankruptcy Prob:   $($a7.bankruptcy_probability)%"
Write-Host "  Burn Rate:         $($a7.burn_rate)"
Write-Host "  Cash Runway:       $($a7.cash_runway_months)"
Write-Host "  Revenue Trend:     $($a7.revenue_trend)"
Write-Host "  Expense Trend:     $($a7.expense_trend)"
Write-Host "  Recommendations:   $($a7.recommendations | ConvertTo-Json -Compress)"
Write-Host "  Explanation:       $($a7.risk_explanation)"

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  ALL SCENARIOS COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
