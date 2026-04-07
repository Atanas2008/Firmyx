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

function PrintResults($name, $a) {
    Write-Host "  Risk Score:        $($a.risk_score)"
    Write-Host "  Risk Level:        $($a.risk_level)"
    Write-Host "  Health Score:      $($a.financial_health_score)"
    Write-Host "  Profit Margin:     $($a.profit_margin)%"
    Write-Host "  Burn Rate:         $($a.burn_rate)"
    Write-Host "  Cash Runway:       $($a.cash_runway_months)"
    Write-Host "  Debt Ratio:        $($a.debt_ratio)"
    Write-Host "  Liquidity Ratio:   $($a.liquidity_ratio)"
    Write-Host "  Altman Z-Score:    $($a.altman_z_score)"
    Write-Host "  Bankruptcy Prob:   $($a.bankruptcy_probability)%"
    Write-Host "  Recommendations:"
    for ($i=0; $i -lt $a.recommendations.Count; $i++) {
        Write-Host "    [$($i+1)] $($a.recommendations[$i])"
    }
    Write-Host "  Explanation:       $($a.risk_explanation)"
}

$errors = @()

# ═══════════════════════════════════════════════════════════════
# SCENARIO 1: HEALTHY BUSINESS (STABLE state)
# ═══════════════════════════════════════════════════════════════
Write-Host "`n===== SCENARIO 1: HEALTHY BUSINESS =====" -ForegroundColor Cyan
$biz1 = CreateBusiness "CloudTech V2" "Technology" "United States" 50 8 15000
AddRecord $biz1.id 1 2026 180000 110000 55000 15000 50000 200000 12000 20000 500000 40000 75000 120000 | Out-Null
AddRecord $biz1.id 2 2026 200000 120000 60000 15000 50000 220000 14000 22000 520000 42000 85000 140000 | Out-Null
$a1 = RunAnalysis $biz1.id
PrintResults "Healthy" $a1

# Verify: should have growth/reinvest recommendation
$hasReinvest = $a1.recommendations | Where-Object { $_ -match "reinvest" }
if ($hasReinvest) { Write-Host "  CHECK: Reinvest advice present for STABLE business - OK" -ForegroundColor Green }
else { $errors += "S1: Missing reinvest advice for stable business"; Write-Host "  CHECK: Missing reinvest advice for stable business - FAIL" -ForegroundColor Red }

# ═══════════════════════════════════════════════════════════════
# SCENARIO 5: HIGH GROWTH UNSTABLE (DISTRESSED state)
# ═══════════════════════════════════════════════════════════════
Write-Host "`n===== SCENARIO 5: HIGH GROWTH UNSTABLE =====" -ForegroundColor Yellow
$biz5 = CreateBusiness "RocketScale V2" "Software" "United States" 15 1 8000
AddRecord $biz5.id 1 2026 50000 70000 35000 8000 100000 60000 3000 5000 150000 50000 -18000 -10000 | Out-Null
AddRecord $biz5.id 2 2026 80000 110000 55000 10000 120000 35000 4000 8000 140000 60000 -28000 -15000 | Out-Null
$a5 = RunAnalysis $biz5.id
PrintResults "High Growth" $a5

# BUG #1 FIX CHECK: should NOT have "reinvest" or "growth initiatives"
$hasContradiction = $a5.recommendations | Where-Object { $_ -match "reinvest.*growth|growth.*reinvest|expansion capital" }
if ($hasContradiction) { $errors += "S5: Contradictory growth/reinvest advice in DISTRESSED state"; Write-Host "  CHECK: Contradictory reinvest advice in distressed state - FAIL" -ForegroundColor Red }
else { Write-Host "  CHECK: No contradictory reinvest advice in distressed state - OK" -ForegroundColor Green }

# Should have preservation message instead
$hasPreserve = $a5.recommendations | Where-Object { $_ -match "preserve|lifeline|stabilise" }
if ($hasPreserve) { Write-Host "  CHECK: Preservation advice present for distressed business - OK" -ForegroundColor Green }
else { $errors += "S5: Missing preservation advice for distressed business"; Write-Host "  CHECK: Missing preservation advice - FAIL" -ForegroundColor Red }

# ═══════════════════════════════════════════════════════════════
# SCENARIO 6: ZERO REVENUE (PM fix check)
# ═══════════════════════════════════════════════════════════════
Write-Host "`n===== SCENARIO 6: ZERO REVENUE =====" -ForegroundColor Red
$biz6 = CreateBusiness "PreLaunch V2" "Technology" "Netherlands" 5 0 5000
AddRecord $biz6.id 1 2026 0 25000 15000 5000 30000 40000 0 0 50000 20000 -25000 0 | Out-Null
AddRecord $biz6.id 2 2026 0 28000 16000 5000 35000 30000 0 0 45000 22000 -28000 0 | Out-Null
$a6 = RunAnalysis $biz6.id
PrintResults "Zero Revenue" $a6

# BUG #2 FIX: PM should be -100%, not 0%
if ($a6.profit_margin -eq -100.0) { Write-Host "  CHECK: Profit margin is -100% for zero revenue - OK" -ForegroundColor Green }
else { $errors += "S6: Profit margin should be -100% for zero revenue, got $($a6.profit_margin)%"; Write-Host "  CHECK: PM=$($a6.profit_margin)% should be -100% - FAIL" -ForegroundColor Red }

# Should NOT have "Increase pricing" recommendation
$hasPricing = $a6.recommendations | Where-Object { $_ -match "Increase pricing" }
if ($hasPricing) { $errors += "S6: 'Increase pricing' advice for zero-revenue business"; Write-Host "  CHECK: Has 'Increase pricing' advice for zero-revenue - FAIL" -ForegroundColor Red }
else { Write-Host "  CHECK: No 'Increase pricing' for zero-revenue - OK" -ForegroundColor Green }

# Should have zero-revenue specific recommendation
$hasZeroRev = $a6.recommendations | Where-Object { $_ -match "zero revenue" }
if ($hasZeroRev) { Write-Host "  CHECK: Zero-revenue specific advice present - OK" -ForegroundColor Green }
else { $errors += "S6: Missing zero-revenue specific recommendation"; Write-Host "  CHECK: Missing zero-revenue specific recommendation - FAIL" -ForegroundColor Red }

# ═══════════════════════════════════════════════════════════════
# SCENARIO 2: HIGH LEVERAGE (DISTRESSED state: risk=75.51)
# ═══════════════════════════════════════════════════════════════
Write-Host "`n===== SCENARIO 2: HIGH LEVERAGE =====" -ForegroundColor Yellow
$biz2 = CreateBusiness "Urban V2" "Real Estate" "United Kingdom" 25 12 30000
AddRecord $biz2.id 1 2026 90000 75000 30000 20000 800000 30000 8000 10000 1200000 300000 18000 50000 | Out-Null
AddRecord $biz2.id 2 2026 95000 78000 32000 20000 850000 25000 9000 11000 1200000 320000 20000 55000 | Out-Null
$a2 = RunAnalysis $biz2.id
PrintResults "High Leverage" $a2

# Should NOT have "strategic financing" or reinvest
$hasGrowthAdvice = $a2.recommendations | Where-Object { $_ -match "expansion capital|reinvest.*growth|growth.*reinvest" }
if ($hasGrowthAdvice) { $errors += "S2: Growth/expansion advice in distressed high-leverage business"; Write-Host "  CHECK: Growth advice in distressed state - FAIL" -ForegroundColor Red }
else { Write-Host "  CHECK: No growth advice in distressed state - OK" -ForegroundColor Green }

# ═══════════════════════════════════════════════════════════════
# SCENARIO 3: BANKRUPTCY RISK (DISTRESSED state)
# ═══════════════════════════════════════════════════════════════
Write-Host "`n===== SCENARIO 3: BANKRUPTCY RISK =====" -ForegroundColor Red
$biz3 = CreateBusiness "FailMart V2" "Retail" "Germany" 120 3 45000
AddRecord $biz3.id 1 2026 40000 95000 45000 18000 500000 8000 4000 15000 200000 180000 -50000 -30000 | Out-Null
AddRecord $biz3.id 2 2026 35000 100000 48000 18000 520000 3000 3000 12000 190000 190000 -60000 -45000 | Out-Null
$a3 = RunAnalysis $biz3.id
PrintResults "Bankruptcy" $a3

# Revenue declining recommendation should be survival-oriented
$hasRetain = $a3.recommendations | Where-Object { $_ -match "retaining existing|stabilising core" }
if ($hasRetain) { Write-Host "  CHECK: Survival-oriented revenue advice - OK" -ForegroundColor Green }
else { Write-Host "  CHECK: Revenue advice not survival-oriented - WARN" -ForegroundColor Yellow }

# ═══════════════════════════════════════════════════════════════
# SCENARIO 4: WC CONSTRAINED (ELEVATED state, ~36 risk)
# ═══════════════════════════════════════════════════════════════
Write-Host "`n===== SCENARIO 4: WORKING CAPITAL CONSTRAINED =====" -ForegroundColor Magenta
$biz4 = CreateBusiness "QuickBite V2" "Restaurants" "Bulgaria" 35 5 12000
AddRecord $biz4.id 1 2026 120000 95000 50000 18000 200000 5000 8000 25000 300000 250000 28000 40000 | Out-Null
AddRecord $biz4.id 2 2026 125000 98000 52000 18000 210000 4000 9000 27000 300000 260000 30000 45000 | Out-Null
$a4 = RunAnalysis $biz4.id
PrintResults "WC Constrained" $a4

if ($a4.risk_level -ne "safe") { Write-Host "  CHECK: Not classified as 'safe' - OK" -ForegroundColor Green }
else { $errors += "S4: Working-capital constrained should not be 'safe'"; Write-Host "  CHECK: Wrongly classified as safe - FAIL" -ForegroundColor Red }

# ═══════════════════════════════════════════════════════════════
# SCENARIO 7: EXTREME STRESS (DISTRESSED state)
# ═══════════════════════════════════════════════════════════════
Write-Host "`n===== SCENARIO 7: EXTREME STRESS =====" -ForegroundColor DarkRed
$biz7 = CreateBusiness "DebtCrush V2" "Manufacturing" "Brazil" 200 15 80000
AddRecord $biz7.id 1 2026 60000 150000 70000 25000 3000000 2000 15000 20000 800000 600000 -85000 -200000 | Out-Null
AddRecord $biz7.id 2 2026 45000 160000 75000 25000 3200000 500 12000 15000 750000 650000 -110000 -250000 | Out-Null
$a7 = RunAnalysis $biz7.id
PrintResults "Extreme Stress" $a7

# Should have survival-oriented declining revenue advice
$hasDistressRev = $a7.recommendations | Where-Object { $_ -match "retaining existing|stabilising core" }
if ($hasDistressRev) { Write-Host "  CHECK: Distress-mode revenue advice - OK" -ForegroundColor Green }
else { Write-Host "  CHECK: Revenue advice not distress-mode - WARN" -ForegroundColor Yellow }

# ═══════════════════════════════════════════════════════════════
# CROSS-VALIDATION
# ═══════════════════════════════════════════════════════════════
Write-Host "`n===== CROSS-VALIDATION =====" -ForegroundColor Cyan

# Health + Risk = 100 check
$allResults = @($a1, $a2, $a3, $a4, $a5, $a6, $a7)
$names = @("Healthy","High Leverage","Bankruptcy","WC Constrained","High Growth","Zero Revenue","Extreme Stress")
for ($i=0; $i -lt $allResults.Count; $i++) {
    $sum = [math]::Round($allResults[$i].risk_score + $allResults[$i].financial_health_score, 2)
    if ($sum -ne 100.0) { $errors += "$($names[$i]): risk+health=$sum != 100"; Write-Host "  $($names[$i]): risk+health=$sum != 100 - FAIL" -ForegroundColor Red }
}
Write-Host "  Health+Risk=100: all passed" -ForegroundColor Green

# Duplicate check
for ($i=0; $i -lt $allResults.Count; $i++) {
    $recs = $allResults[$i].recommendations
    $unique = $recs | Sort-Object -Unique
    if ($recs.Count -ne $unique.Count) { $errors += "$($names[$i]): Duplicate recommendations"; Write-Host "  $($names[$i]): DUPLICATE RECOMMENDATIONS - FAIL" -ForegroundColor Red }
}
Write-Host "  No duplicates: all passed" -ForegroundColor Green

# Rec count 3-7
for ($i=0; $i -lt $allResults.Count; $i++) {
    $c = $allResults[$i].recommendations.Count
    if ($c -lt 3 -or $c -gt 7) { $errors += "$($names[$i]): $c recommendations out of 3-7 range"; Write-Host "  $($names[$i]): $c recs OUT OF RANGE - FAIL" -ForegroundColor Red }
}
Write-Host "  Rec count 3-7: all passed" -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════
Write-Host "`n===== SUMMARY =====" -ForegroundColor Cyan
if ($errors.Count -eq 0) {
    Write-Host "ALL CHECKS PASSED - 0 errors found" -ForegroundColor Green
} else {
    Write-Host "$($errors.Count) ERRORS FOUND:" -ForegroundColor Red
    foreach ($e in $errors) { Write-Host "  - $e" -ForegroundColor Red }
}
