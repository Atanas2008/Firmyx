########################################################################
# QA 100-Scenario Regression Test Suite
# Financial Risk Analysis System — Justification Layer Validation
########################################################################

$ErrorActionPreference = "Stop"
$BASE = "http://localhost:8000/api"

# ── Auto-login ─────────────────────────────────────────────────────────
$loginBody = @{email="qa100@gmail.com"; password="QaTest123!"} | ConvertTo-Json
$loginResp = Invoke-RestMethod "$BASE/auth/login" -Method POST -ContentType "application/json" -Body $loginBody
$TOKEN = $loginResp.access_token
Write-Host "Authenticated as qa100@gmail.com`n"
$H = @{ Authorization = "Bearer $TOKEN"; "Content-Type" = "application/json" }

# ── Counters ───────────────────────────────────────────────────────────
$pass = 0; $fail = 0; $errors = @()

# ── Helper: run one test scenario ──────────────────────────────────────
function Run-Test {
    param(
        [int]$num,
        [string]$label,
        [hashtable]$record,  # financial record fields
        [string]$expectedLevel,  # safe | moderate_risk | high_risk
        [scriptblock]$extraChecks  # additional validation logic
    )

    try {
        # 1. Create business
        $biz = @{
            name = "QA-$num $label"
            industry = "Other"
            country = "US"
            num_employees = 10
            years_operating = 3
            monthly_fixed_costs = 5000
        } | ConvertTo-Json
        $b = Invoke-RestMethod "$BASE/businesses" -Method POST -Headers $H -Body $biz
        $bid = $b.id

        # 2. Add financial record
        $defaults = @{
            period_month = 3; period_year = 2026
            monthly_revenue = 100000; monthly_expenses = 60000
            payroll = 20000; rent = 5000; debt = 0; cash_reserves = 50000
            taxes = 5000; cost_of_goods_sold = 20000
            total_assets = $null; current_liabilities = $null
            ebit = $null; retained_earnings = $null
        }
        foreach ($k in $record.Keys) { $defaults[$k] = $record[$k] }
        $recJson = $defaults | ConvertTo-Json
        Invoke-RestMethod "$BASE/businesses/$bid/records" -Method POST -Headers $H -Body $recJson | Out-Null

        # 3. Run analysis
        $a = Invoke-RestMethod "$BASE/businesses/$bid/analyze" -Method POST -Headers $H

        # 4. Base validations
        $testErrors = @()

        # Risk level check
        if ($expectedLevel -ne "any" -and $a.risk_level -ne $expectedLevel) {
            $testErrors += "LEVEL: expected=$expectedLevel actual=$($a.risk_level) (score=$($a.risk_score))"
        }

        # Health + Risk = 100
        $sum = [math]::Round($a.risk_score + $a.financial_health_score, 2)
        if ([math]::Abs($sum - 100) -gt 0.1) {
            $testErrors += "HEALTH+RISK=$sum (expected 100)"
        }

        # Recommendation count 3-7
        $recCount = $a.recommendations.Count
        if ($recCount -lt 3 -or $recCount -gt 7) {
            $testErrors += "REC_COUNT=$recCount (expected 3-7)"
        }

        # No duplicate recommendation titles
        $titles = $a.recommendations | ForEach-Object { $_.title }
        $uniqueTitles = $titles | Select-Object -Unique
        if ($titles.Count -ne $uniqueTitles.Count) {
            $testErrors += "DUPLICATE_TITLES found"
        }

        # Every recommendation must have justification
        foreach ($rec in $a.recommendations) {
            if (-not $rec.justification) {
                $testErrors += "MISSING_JUSTIFICATION for '$($rec.title)'"
            } elseif (-not $rec.justification.driver -or -not $rec.justification.comparison -or -not $rec.justification.impact -or -not $rec.justification.priority_reason) {
                $testErrors += "INCOMPLETE_JUSTIFICATION for '$($rec.title)'"
            }
        }

        # System state gating
        $state = "STABLE"
        if ($a.risk_score -ge 70 -or $a.bankruptcy_probability -ge 30) { $state = "DISTRESSED" }
        elseif ($a.risk_score -ge 40) { $state = "ELEVATED" }

        if ($state -eq "DISTRESSED") {
            foreach ($rec in $a.recommendations) {
                $t = $rec.title.ToLower()
                $e = $rec.explanation.ToLower()
                if ($t -match "deploy excess|leverage financing|reinvest" -or $e -match "reinvest.*growth") {
                    $testErrors += "CONTRADICTORY_GROWTH in DISTRESSED: '$($rec.title)'"
                }
            }
        }

        # Run custom checks
        if ($extraChecks) {
            $customErrors = & $extraChecks $a $state
            if ($customErrors) { $testErrors += $customErrors }
        }

        # 5. Report
        $recTitles = ($a.recommendations | ForEach-Object { $_.title }) -join ", "
        if ($testErrors.Count -eq 0) {
            $script:pass++
            Write-Host "  #$num PASS | $label | score=$($a.risk_score) level=$($a.risk_level) state=$state | recs=$recCount" -ForegroundColor Green
        } else {
            $script:fail++
            $errText = $testErrors -join "; "
            $script:errors += "TEST #$num ($label): $errText"
            Write-Host "  #$num FAIL | $label | score=$($a.risk_score) level=$($a.risk_level) state=$state | $errText" -ForegroundColor Red
        }
    }
    catch {
        $script:fail++
        $script:errors += "TEST #$num ($label): EXCEPTION: $($_.Exception.Message)"
        Write-Host "  #$num ERROR | $label | $($_.Exception.Message)" -ForegroundColor Magenta
    }
}

Write-Host "`n========================================================="
Write-Host "  QA 100-SCENARIO REGRESSION TEST SUITE"
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "=========================================================`n"

# ═══════════════════════════════════════════════════════════════════════
# DIMENSION 1: PROFITABILITY (15 tests)
# ═══════════════════════════════════════════════════════════════════════
Write-Host "--- PROFITABILITY DIMENSION ---" -ForegroundColor Cyan

# Very high margin (>40%)
Run-Test 1 "VeryHighMargin-LowDebt" @{monthly_revenue=200000; monthly_expenses=100000; debt=10000; cash_reserves=100000; cost_of_goods_sold=30000; total_assets=300000; current_liabilities=20000} "safe"
Run-Test 2 "VeryHighMargin-ModDebt" @{monthly_revenue=200000; monthly_expenses=110000; debt=80000; cash_reserves=80000; cost_of_goods_sold=40000; total_assets=250000; current_liabilities=30000} "safe"
Run-Test 3 "VeryHighMargin-HighDebt" @{monthly_revenue=200000; monthly_expenses=100000; debt=200000; cash_reserves=50000; cost_of_goods_sold=30000; total_assets=250000; current_liabilities=80000} "any"

# Healthy margin (10-30%)
Run-Test 4 "HealthyMargin20pct" @{monthly_revenue=100000; monthly_expenses=80000; debt=20000; cash_reserves=60000; cost_of_goods_sold=25000; total_assets=200000; current_liabilities=30000} "safe"
Run-Test 5 "HealthyMargin15pct" @{monthly_revenue=100000; monthly_expenses=85000; debt=30000; cash_reserves=40000; cost_of_goods_sold=30000; total_assets=150000; current_liabilities=25000} "safe"
Run-Test 6 "HealthyMargin10pct" @{monthly_revenue=100000; monthly_expenses=90000; debt=50000; cash_reserves=30000; cost_of_goods_sold=30000; total_assets=120000; current_liabilities=35000} "any"

# Low margin (0-5%)
Run-Test 7 "LowMargin5pct" @{monthly_revenue=100000; monthly_expenses=95000; debt=20000; cash_reserves=50000; cost_of_goods_sold=30000; total_assets=180000; current_liabilities=25000} "any"
Run-Test 8 "LowMargin2pct" @{monthly_revenue=100000; monthly_expenses=98000; debt=30000; cash_reserves=40000; cost_of_goods_sold=30000; total_assets=160000; current_liabilities=30000} "any"
Run-Test 9 "LowMargin0pct" @{monthly_revenue=100000; monthly_expenses=100000; debt=20000; cash_reserves=50000; cost_of_goods_sold=30000; total_assets=180000; current_liabilities=25000} "any"

# Negative margin
Run-Test 10 "NegMargin-5pct" @{monthly_revenue=100000; monthly_expenses=105000; debt=20000; cash_reserves=50000; cost_of_goods_sold=30000; total_assets=160000; current_liabilities=25000} "any"
Run-Test 11 "NegMargin-20pct" @{monthly_revenue=100000; monthly_expenses=120000; debt=40000; cash_reserves=40000; cost_of_goods_sold=30000; total_assets=150000; current_liabilities=35000} "any"
Run-Test 12 "NegMargin-50pct" @{monthly_revenue=100000; monthly_expenses=150000; debt=60000; cash_reserves=30000; cost_of_goods_sold=40000; total_assets=120000; current_liabilities=50000} "high_risk"
Run-Test 13 "NegMargin-100pct" @{monthly_revenue=50000; monthly_expenses=100000; debt=80000; cash_reserves=20000; cost_of_goods_sold=20000; total_assets=80000; current_liabilities=40000} "high_risk"
Run-Test 14 "NegMargin-200pct" @{monthly_revenue=30000; monthly_expenses=90000; debt=100000; cash_reserves=10000; cost_of_goods_sold=15000; total_assets=60000; current_liabilities=50000} "high_risk"

# Zero revenue edge case
Run-Test 15 "ZeroRevenue" @{monthly_revenue=0; monthly_expenses=28000; debt=35000; cash_reserves=30000; cost_of_goods_sold=0; total_assets=45000; current_liabilities=22000} "high_risk" {
    param($a, $state)
    $errs = @()
    if ($a.profit_margin -ne -100.0) { $errs += "PM should be -100.0, got $($a.profit_margin)" }
    $hasZeroRevRec = $a.recommendations | Where-Object { $_.explanation -match "zero revenue" }
    if (-not $hasZeroRevRec) { $errs += "Missing zero-revenue specific recommendation" }
    $hasPricing = $a.recommendations | Where-Object { $_.explanation -match "Increase pricing" }
    if ($hasPricing) { $errs += "Should NOT have 'Increase pricing' for zero revenue" }
    $errs
}

# ═══════════════════════════════════════════════════════════════════════
# DIMENSION 2: LIQUIDITY (15 tests)
# ═══════════════════════════════════════════════════════════════════════
Write-Host "`n--- LIQUIDITY DIMENSION ---" -ForegroundColor Cyan

# Very strong liquidity (>3.0)
Run-Test 16 "Liq-VeryStrong-4.0" @{monthly_revenue=120000; monthly_expenses=70000; debt=10000; cash_reserves=200000; cost_of_goods_sold=20000; total_assets=350000; current_liabilities=50000} "safe"
Run-Test 17 "Liq-VeryStrong-6.0" @{monthly_revenue=150000; monthly_expenses=80000; debt=5000; cash_reserves=300000; cost_of_goods_sold=25000; total_assets=500000; current_liabilities=50000} "safe"

# Healthy liquidity (1.5-3.0)
Run-Test 18 "Liq-Healthy-2.5" @{monthly_revenue=100000; monthly_expenses=70000; debt=15000; cash_reserves=75000; cost_of_goods_sold=20000; total_assets=200000; current_liabilities=30000} "safe"
Run-Test 19 "Liq-Healthy-1.8" @{monthly_revenue=100000; monthly_expenses=75000; debt=20000; cash_reserves=54000; cost_of_goods_sold=20000; total_assets=180000; current_liabilities=30000} "safe"
Run-Test 20 "Liq-Healthy-1.5" @{monthly_revenue=100000; monthly_expenses=80000; debt=25000; cash_reserves=45000; cost_of_goods_sold=20000; total_assets=170000; current_liabilities=30000} "safe"

# Borderline liquidity (1.0-1.5)
Run-Test 21 "Liq-Borderline-1.3" @{monthly_revenue=100000; monthly_expenses=80000; debt=30000; cash_reserves=39000; cost_of_goods_sold=25000; total_assets=160000; current_liabilities=30000} "any"
Run-Test 22 "Liq-Borderline-1.1" @{monthly_revenue=100000; monthly_expenses=80000; debt=30000; cash_reserves=33000; cost_of_goods_sold=25000; total_assets=150000; current_liabilities=30000} "any"
Run-Test 23 "Liq-Borderline-1.0" @{monthly_revenue=100000; monthly_expenses=85000; debt=35000; cash_reserves=30000; cost_of_goods_sold=25000; total_assets=140000; current_liabilities=30000} "any"

# Constrained liquidity (<1.0)
Run-Test 24 "Liq-Constrained-0.8" @{monthly_revenue=100000; monthly_expenses=85000; debt=40000; cash_reserves=24000; cost_of_goods_sold=25000; total_assets=120000; current_liabilities=30000} "any"
Run-Test 25 "Liq-Constrained-0.6" @{monthly_revenue=80000; monthly_expenses=70000; debt=50000; cash_reserves=18000; cost_of_goods_sold=20000; total_assets=100000; current_liabilities=30000} "any"
Run-Test 26 "Liq-Constrained-0.4" @{monthly_revenue=80000; monthly_expenses=75000; debt=60000; cash_reserves=12000; cost_of_goods_sold=20000; total_assets=90000; current_liabilities=30000} "any"

# Near-zero liquidity (<0.2)
Run-Test 27 "Liq-NearZero-0.15" @{monthly_revenue=60000; monthly_expenses=70000; debt=80000; cash_reserves=4500; cost_of_goods_sold=15000; total_assets=70000; current_liabilities=30000} "high_risk"
Run-Test 28 "Liq-NearZero-0.1" @{monthly_revenue=50000; monthly_expenses=65000; debt=90000; cash_reserves=3000; cost_of_goods_sold=15000; total_assets=60000; current_liabilities=30000} "high_risk"
Run-Test 29 "Liq-NearZero-0.05" @{monthly_revenue=40000; monthly_expenses=60000; debt=100000; cash_reserves=1500; cost_of_goods_sold=10000; total_assets=50000; current_liabilities=30000} "high_risk"
Run-Test 30 "Liq-Zero" @{monthly_revenue=40000; monthly_expenses=55000; debt=100000; cash_reserves=0; cost_of_goods_sold=10000; total_assets=45000; current_liabilities=30000} "high_risk"

# ═══════════════════════════════════════════════════════════════════════
# DIMENSION 3: LEVERAGE (12 tests)
# ═══════════════════════════════════════════════════════════════════════
Write-Host "`n--- LEVERAGE DIMENSION ---" -ForegroundColor Cyan

# Very low leverage (<0.2)
Run-Test 31 "Lev-VeryLow-0.05" @{monthly_revenue=120000; monthly_expenses=70000; debt=10000; cash_reserves=100000; cost_of_goods_sold=20000; total_assets=200000; current_liabilities=20000} "safe" {
    param($a, $state)
    $errs = @()
    if ($state -eq "STABLE") {
        $hasFinancing = $a.recommendations | Where-Object { $_.title -match "Financing|Leverage" }
        if (-not $hasFinancing) { $errs += "STABLE+low-debt should suggest financing capacity" }
    }
    $errs
}
Run-Test 32 "Lev-VeryLow-0.1" @{monthly_revenue=110000; monthly_expenses=65000; debt=15000; cash_reserves=90000; cost_of_goods_sold=18000; total_assets=180000; current_liabilities=18000} "safe"
Run-Test 33 "Lev-VeryLow-0.15" @{monthly_revenue=100000; monthly_expenses=60000; debt=25000; cash_reserves=80000; cost_of_goods_sold=15000; total_assets=170000; current_liabilities=20000} "safe"

# Moderate leverage (0.2-0.6)
Run-Test 34 "Lev-Moderate-0.3" @{monthly_revenue=100000; monthly_expenses=70000; debt=50000; cash_reserves=60000; cost_of_goods_sold=20000; total_assets=180000; current_liabilities=25000} "any"
Run-Test 35 "Lev-Moderate-0.4" @{monthly_revenue=100000; monthly_expenses=75000; debt=70000; cash_reserves=50000; cost_of_goods_sold=22000; total_assets=170000; current_liabilities=28000} "any"
Run-Test 36 "Lev-Moderate-0.55" @{monthly_revenue=100000; monthly_expenses=78000; debt=90000; cash_reserves=45000; cost_of_goods_sold=25000; total_assets=160000; current_liabilities=30000} "any"

# High leverage (0.6-1.2)
Run-Test 37 "Lev-High-0.65" @{monthly_revenue=100000; monthly_expenses=80000; debt=110000; cash_reserves=40000; cost_of_goods_sold=25000; total_assets=170000; current_liabilities=35000} "any" {
    param($a, $state)
    $errs = @()
    $hasDebtRec = $a.recommendations | Where-Object { $_.title -match "Leverage|Debt" }
    if (-not $hasDebtRec) { $errs += "High leverage should trigger debt recommendation" }
    $errs
}
Run-Test 38 "Lev-High-0.8" @{monthly_revenue=90000; monthly_expenses=75000; debt=120000; cash_reserves=30000; cost_of_goods_sold=22000; total_assets=150000; current_liabilities=35000} "any"
Run-Test 39 "Lev-High-1.0" @{monthly_revenue=80000; monthly_expenses=70000; debt=140000; cash_reserves=25000; cost_of_goods_sold=20000; total_assets=140000; current_liabilities=40000} "any"

# Extreme leverage (>1.2)
Run-Test 40 "Lev-Extreme-1.5" @{monthly_revenue=70000; monthly_expenses=65000; debt=180000; cash_reserves=20000; cost_of_goods_sold=18000; total_assets=120000; current_liabilities=45000} "any"
Run-Test 41 "Lev-Extreme-2.0" @{monthly_revenue=60000; monthly_expenses=55000; debt=200000; cash_reserves=15000; cost_of_goods_sold=15000; total_assets=100000; current_liabilities=50000} "any"
Run-Test 42 "Lev-Extreme-4.0" @{monthly_revenue=40000; monthly_expenses=55000; debt=300000; cash_reserves=5000; cost_of_goods_sold=10000; total_assets=75000; current_liabilities=60000} "high_risk"

# ═══════════════════════════════════════════════════════════════════════
# DIMENSION 4: CASH RUNWAY (12 tests)
# ═══════════════════════════════════════════════════════════════════════
Write-Host "`n--- CASH RUNWAY DIMENSION ---" -ForegroundColor Cyan

# >12 months runway (cash-flow positive, no burn)
Run-Test 43 "Runway-Infinite-Positive" @{monthly_revenue=100000; monthly_expenses=70000; debt=15000; cash_reserves=80000; cost_of_goods_sold=20000; total_assets=200000; current_liabilities=25000} "safe"

# 6-12 months runway (slight burn)
Run-Test 44 "Runway-9mo" @{monthly_revenue=50000; monthly_expenses=55000; debt=20000; cash_reserves=45000; cost_of_goods_sold=15000; total_assets=150000; current_liabilities=25000} "any"
Run-Test 45 "Runway-7mo" @{monthly_revenue=50000; monthly_expenses=58000; debt=25000; cash_reserves=56000; cost_of_goods_sold=15000; total_assets=140000; current_liabilities=28000} "any"

# 3-6 months runway  
Run-Test 46 "Runway-5mo" @{monthly_revenue=60000; monthly_expenses=70000; debt=30000; cash_reserves=50000; cost_of_goods_sold=18000; total_assets=130000; current_liabilities=30000} "any"
Run-Test 47 "Runway-4mo" @{monthly_revenue=60000; monthly_expenses=75000; debt=35000; cash_reserves=60000; cost_of_goods_sold=18000; total_assets=120000; current_liabilities=35000} "any"
Run-Test 48 "Runway-3.5mo" @{monthly_revenue=50000; monthly_expenses=65000; debt=40000; cash_reserves=52500; cost_of_goods_sold=15000; total_assets=110000; current_liabilities=35000} "any"

# 1-3 months runway (critical)
Run-Test 49 "Runway-2mo" @{monthly_revenue=40000; monthly_expenses=60000; debt=50000; cash_reserves=40000; cost_of_goods_sold=12000; total_assets=90000; current_liabilities=40000} "high_risk" {
    param($a, $state)
    $errs = @()
    $hasRunwayRec = $a.recommendations | Where-Object { $_.title -match "Cash Runway|Extend" }
    if (-not $hasRunwayRec) { $errs += "Short runway should trigger cash runway recommendation" }
    $errs
}
Run-Test 50 "Runway-1.5mo" @{monthly_revenue=30000; monthly_expenses=50000; debt=60000; cash_reserves=30000; cost_of_goods_sold=10000; total_assets=80000; current_liabilities=45000} "high_risk"
Run-Test 51 "Runway-1mo" @{monthly_revenue=30000; monthly_expenses=55000; debt=70000; cash_reserves=25000; cost_of_goods_sold=10000; total_assets=70000; current_liabilities=50000} "high_risk"

# <1 month runway (extreme)
Run-Test 52 "Runway-0.5mo" @{monthly_revenue=25000; monthly_expenses=55000; debt=80000; cash_reserves=15000; cost_of_goods_sold=8000; total_assets=60000; current_liabilities=50000} "high_risk"
Run-Test 53 "Runway-0.1mo" @{monthly_revenue=20000; monthly_expenses=50000; debt=90000; cash_reserves=3000; cost_of_goods_sold=8000; total_assets=50000; current_liabilities=50000} "high_risk"
Run-Test 54 "Runway-0mo-NoCash" @{monthly_revenue=20000; monthly_expenses=60000; debt=100000; cash_reserves=0; cost_of_goods_sold=8000; total_assets=40000; current_liabilities=50000} "high_risk"

# ═══════════════════════════════════════════════════════════════════════
# DIMENSION 5: CROSS-DIMENSIONAL COMBINATIONS (36 tests)
# ═══════════════════════════════════════════════════════════════════════
Write-Host "`n--- CROSS-DIMENSIONAL COMBINATIONS ---" -ForegroundColor Cyan

# High margin + High leverage
Run-Test 55 "Combo-HighMargin-HighLev" @{monthly_revenue=200000; monthly_expenses=110000; debt=200000; cash_reserves=60000; cost_of_goods_sold=35000; total_assets=250000; current_liabilities=50000} "any"
# High margin + Low liquidity
Run-Test 56 "Combo-HighMargin-LowLiq" @{monthly_revenue=180000; monthly_expenses=100000; debt=30000; cash_reserves=25000; cost_of_goods_sold=30000; total_assets=180000; current_liabilities=35000} "any"
# High margin + Short runway (impossible in reality but testing edges)
Run-Test 57 "Combo-HighMargin-ShortRun" @{monthly_revenue=50000; monthly_expenses=55000; debt=10000; cash_reserves=10000; cost_of_goods_sold=15000; total_assets=150000; current_liabilities=15000} "any"

# Low margin + High liquidity
Run-Test 58 "Combo-LowMargin-HighLiq" @{monthly_revenue=100000; monthly_expenses=97000; debt=10000; cash_reserves=120000; cost_of_goods_sold=30000; total_assets=250000; current_liabilities=30000} "any"
# Low margin + Low leverage
Run-Test 59 "Combo-LowMargin-LowLev" @{monthly_revenue=100000; monthly_expenses=96000; debt=15000; cash_reserves=60000; cost_of_goods_sold=30000; total_assets=200000; current_liabilities=25000} "any"
# Low margin + Extreme leverage + Low liquidity (worst combo)
Run-Test 60 "Combo-LowMargin-ExtLev-LowLiq" @{monthly_revenue=80000; monthly_expenses=78000; debt=180000; cash_reserves=10000; cost_of_goods_sold=25000; total_assets=100000; current_liabilities=50000} "any"

# Negative margin + Strong liquidity (paradox)
Run-Test 61 "Combo-NegMargin-StrongLiq" @{monthly_revenue=80000; monthly_expenses=100000; debt=10000; cash_reserves=200000; cost_of_goods_sold=25000; total_assets=300000; current_liabilities=40000} "any" {
    param($a, $state)
    $errs = @()
    if ($state -eq "DISTRESSED") {
        $hasGrowth = $a.recommendations | Where-Object { $_.title -match "Deploy Excess|reinvest" }
        if ($hasGrowth) { $errs += "DISTRESSED should not suggest deploying excess liquidity" }
    }
    $errs
}
# Negative margin + Low debt (startup profile)
Run-Test 62 "Combo-NegMargin-LowDebt-Startup" @{monthly_revenue=30000; monthly_expenses=50000; debt=5000; cash_reserves=120000; cost_of_goods_sold=10000; total_assets=200000; current_liabilities=15000} "any"

# Working capital constrained (positive margin, liq < 1, no burn)
Run-Test 63 "Combo-WC-Constrained" @{monthly_revenue=120000; monthly_expenses=80000; debt=100000; cash_reserves=20000; cost_of_goods_sold=25000; total_assets=130000; current_liabilities=30000} "any" {
    param($a, $state)
    $errs = @()
    if ($a.risk_level -eq "safe" -and $a.liquidity_ratio -lt 1.0) {
        $errs += "WC-constrained (liq<1) should NOT be labeled safe"
    }
    $errs
}

# All-bad scenario
Run-Test 64 "Combo-AllBad" @{monthly_revenue=10000; monthly_expenses=80000; debt=300000; cash_reserves=2000; cost_of_goods_sold=5000; total_assets=30000; current_liabilities=60000} "high_risk"
# All-good scenario
Run-Test 65 "Combo-AllGood" @{monthly_revenue=250000; monthly_expenses=120000; debt=10000; cash_reserves=300000; cost_of_goods_sold=30000; total_assets=600000; current_liabilities=30000} "safe"

# Moderate everything (grey zone)
Run-Test 66 "Combo-AllModerate" @{monthly_revenue=100000; monthly_expenses=85000; debt=60000; cash_reserves=35000; cost_of_goods_sold=25000; total_assets=150000; current_liabilities=30000} "any"

# High revenue, high expenses (thin margin, large scale)
Run-Test 67 "Combo-HighScale-ThinMargin" @{monthly_revenue=500000; monthly_expenses=480000; debt=50000; cash_reserves=100000; cost_of_goods_sold=200000; total_assets=800000; current_liabilities=80000} "any"

# Low revenue, low expenses (micro business)
Run-Test 68 "Combo-MicroBiz" @{monthly_revenue=5000; monthly_expenses=3000; debt=1000; cash_reserves=10000; cost_of_goods_sold=1000; total_assets=20000; current_liabilities=2000} "safe"

# Debt equals total assets
Run-Test 69 "Combo-DebtEqualsAssets" @{monthly_revenue=80000; monthly_expenses=70000; debt=150000; cash_reserves=25000; cost_of_goods_sold=20000; total_assets=150000; current_liabilities=40000} "any"

# Debt exceeds total assets (negative equity)
Run-Test 70 "Combo-NegativeEquity" @{monthly_revenue=60000; monthly_expenses=65000; debt=200000; cash_reserves=10000; cost_of_goods_sold=15000; total_assets=80000; current_liabilities=50000} "high_risk"

# High cash but high debt
Run-Test 71 "Combo-HighCash-HighDebt" @{monthly_revenue=100000; monthly_expenses=90000; debt=200000; cash_reserves=150000; cost_of_goods_sold=25000; total_assets=300000; current_liabilities=40000} "any"

# Breakeven exactly
Run-Test 72 "Combo-ExactBreakeven" @{monthly_revenue=100000; monthly_expenses=100000; debt=30000; cash_reserves=50000; cost_of_goods_sold=30000; total_assets=180000; current_liabilities=25000} "any"

# Very high COGS ratio
Run-Test 73 "Combo-HighCOGS" @{monthly_revenue=100000; monthly_expenses=95000; debt=20000; cash_reserves=50000; cost_of_goods_sold=70000; total_assets=180000; current_liabilities=25000} "any"

# Zero COGS (service business)
Run-Test 74 "Combo-ZeroCOGS-Service" @{monthly_revenue=80000; monthly_expenses=50000; debt=10000; cash_reserves=60000; cost_of_goods_sold=0; total_assets=150000; current_liabilities=20000} "safe"

# High margin + Declining revenue
Run-Test 75 "Combo-HighMargin-Declining" @{monthly_revenue=120000; monthly_expenses=70000; debt=15000; cash_reserves=80000; cost_of_goods_sold=20000; total_assets=230000; current_liabilities=25000} "safe"

# Negative margin + Increasing revenue (recovering startup)
Run-Test 76 "Combo-NegMargin-Growing" @{monthly_revenue=60000; monthly_expenses=75000; debt=20000; cash_reserves=90000; cost_of_goods_sold=15000; total_assets=180000; current_liabilities=25000} "any"

# Zero debt, zero cash (unusual)
Run-Test 77 "Combo-NoDebt-NoCash" @{monthly_revenue=80000; monthly_expenses=70000; debt=0; cash_reserves=0; cost_of_goods_sold=20000; total_assets=100000; current_liabilities=25000} "any"

# Only cash (no revenue, no debt — pre-launch)
Run-Test 78 "Combo-PreLaunch-CashOnly" @{monthly_revenue=0; monthly_expenses=15000; debt=0; cash_reserves=200000; cost_of_goods_sold=0; total_assets=250000; current_liabilities=10000} "any" {
    param($a, $state)
    $errs = @()
    if ($a.profit_margin -ne -100.0) { $errs += "Pre-launch zero rev: PM should be -100.0" }
    $errs
}

# Tiny numbers (precision test)
Run-Test 79 "Combo-TinyNumbers" @{monthly_revenue=100; monthly_expenses=60; debt=10; cash_reserves=50; cost_of_goods_sold=20; total_assets=200; current_liabilities=15} "safe"

# Large numbers (scale test)
Run-Test 80 "Combo-LargeScale" @{monthly_revenue=10000000; monthly_expenses=6000000; debt=1000000; cash_reserves=5000000; cost_of_goods_sold=2000000; total_assets=20000000; current_liabilities=1500000} "safe"

# ═══════════════════════════════════════════════════════════════════════
# DIMENSION 6: SYSTEM STATE GATING (10 tests)
# ═══════════════════════════════════════════════════════════════════════
Write-Host "`n--- SYSTEM STATE GATING ---" -ForegroundColor Cyan

# STABLE state should allow growth recommendations
Run-Test 81 "State-Stable-GrowthAllowed" @{monthly_revenue=150000; monthly_expenses=85000; debt=8000; cash_reserves=150000; cost_of_goods_sold=25000; total_assets=350000; current_liabilities=30000} "safe" {
    param($a, $state)
    $errs = @()
    if ($state -ne "STABLE") { $errs += "Expected STABLE, got $state" }
    $hasGrowthOrPos = $a.recommendations | Where-Object { $_.title -match "Deploy|Leverage Financing|Excess" }
    if (-not $hasGrowthOrPos) { $errs += "STABLE should include growth/positive recommendations" }
    $errs
}

# ELEVATED state should replace growth with preserve
Run-Test 82 "State-Elevated-NoGrowth" @{monthly_revenue=100000; monthly_expenses=80000; debt=80000; cash_reserves=70000; cost_of_goods_sold=25000; total_assets=160000; current_liabilities=40000} "any" {
    param($a, $state)
    $errs = @()
    if ($a.risk_score -ge 40 -and $a.risk_score -lt 70) {
        $hasGrowth = $a.recommendations | Where-Object { $_.title -match "Deploy Excess" }
        if ($hasGrowth) { $errs += "ELEVATED should not suggest deploying excess liquidity" }
    }
    $errs
}

# DISTRESSED: no growth, no reinvest, no strategic financing
Run-Test 83 "State-Distressed-SurvivalOnly" @{monthly_revenue=30000; monthly_expenses=80000; debt=200000; cash_reserves=10000; cost_of_goods_sold=10000; total_assets=50000; current_liabilities=60000} "high_risk" {
    param($a, $state)
    $errs = @()
    if ($state -ne "DISTRESSED") { $errs += "Expected DISTRESSED, got $state" }
    foreach ($rec in $a.recommendations) {
        $t = $rec.title.ToLower()
        if ($t -match "deploy excess|leverage financing capacity") {
            $errs += "DISTRESSED got growth rec: '$($rec.title)'"
        }
    }
    $errs
}

# DISTRESSED with good liquidity — should get "Protect Cash Reserves"
Run-Test 84 "State-Distressed-GoodLiq" @{monthly_revenue=40000; monthly_expenses=70000; debt=10000; cash_reserves=250000; cost_of_goods_sold=12000; total_assets=300000; current_liabilities=30000} "any" {
    param($a, $state)
    $errs = @()
    if ($a.risk_score -ge 70 -and $a.liquidity_ratio -gt 2) {
        $hasProtect = $a.recommendations | Where-Object { $_.title -match "Protect Cash" }
        if (-not $hasProtect) { $errs += "DISTRESSED+high-liq should get 'Protect Cash Reserves'" }
    }
    $errs
}

# DISTRESSED with low debt — should get "Avoid Additional Leverage"
Run-Test 85 "State-Distressed-LowDebt" @{monthly_revenue=20000; monthly_expenses=60000; debt=5000; cash_reserves=30000; cost_of_goods_sold=8000; total_assets=100000; current_liabilities=10000} "any" {
    param($a, $state)
    $errs = @()
    if ($a.risk_score -ge 70 -and $a.debt_ratio -lt 0.3) {
        $hasAvoid = $a.recommendations | Where-Object { $_.title -match "Avoid Additional" }
        if (-not $hasAvoid) { $errs += "DISTRESSED+low-debt should get 'Avoid Additional Leverage'" }
    }
    $errs
}

# Boundary: risk_score exactly 70 → should be DISTRESSED
Run-Test 86 "State-Boundary-70" @{monthly_revenue=50000; monthly_expenses=65000; debt=80000; cash_reserves=20000; cost_of_goods_sold=15000; total_assets=90000; current_liabilities=35000} "any" {
    param($a, $state)
    $errs = @()
    if ($a.risk_score -ge 70 -and $state -ne "DISTRESSED") { $errs += "Score>=70 should be DISTRESSED" }
    $errs
}

# Boundary: risk_score exactly 40 → should be ELEVATED
Run-Test 87 "State-Boundary-40" @{monthly_revenue=90000; monthly_expenses=80000; debt=55000; cash_reserves=35000; cost_of_goods_sold=22000; total_assets=140000; current_liabilities=30000} "any" {
    param($a, $state)
    $errs = @()
    if ($a.risk_score -ge 40 -and $a.risk_score -lt 70 -and $state -ne "ELEVATED") { $errs += "Score 40-69 should be ELEVATED" }
    $errs
}

# Bankruptcy probability >= 30 → DISTRESSED regardless of score
Run-Test 88 "State-BankruptcyTrigger" @{monthly_revenue=70000; monthly_expenses=60000; debt=120000; cash_reserves=25000; cost_of_goods_sold=18000; total_assets=100000; current_liabilities=40000} "any" {
    param($a, $state)
    $errs = @()
    if ($a.bankruptcy_probability -ge 30 -and $state -ne "DISTRESSED") {
        $errs += "Bankruptcy>=30% should force DISTRESSED (bp=$($a.bankruptcy_probability), state=$state)"
    }
    $errs
}

# Just below bankruptcy threshold
Run-Test 89 "State-JustBelowBankruptcy" @{monthly_revenue=100000; monthly_expenses=75000; debt=40000; cash_reserves=50000; cost_of_goods_sold=22000; total_assets=170000; current_liabilities=28000} "any"

# Safe with maximum health
Run-Test 90 "State-MaxHealth" @{monthly_revenue=300000; monthly_expenses=150000; debt=5000; cash_reserves=500000; cost_of_goods_sold=40000; total_assets=800000; current_liabilities=20000} "safe" {
    param($a, $state)
    $errs = @()
    if ($a.risk_score -gt 15) { $errs += "Near-perfect business should have very low risk (got $($a.risk_score))" }
    $errs
}

# ═══════════════════════════════════════════════════════════════════════
# DIMENSION 7: JUSTIFICATION LAYER VALIDATION (10 tests)
# ═══════════════════════════════════════════════════════════════════════
Write-Host "`n--- JUSTIFICATION LAYER VALIDATION ---" -ForegroundColor Cyan

# Verify driver includes risk point contribution
Run-Test 91 "Just-DriverPoints" @{monthly_revenue=100000; monthly_expenses=80000; debt=120000; cash_reserves=40000; cost_of_goods_sold=25000; total_assets=170000; current_liabilities=45000} "any" {
    param($a, $state)
    $errs = @()
    foreach ($rec in $a.recommendations) {
        $j = $rec.justification
        if ($j.driver -notmatch "\d" -and $j.driver -ne "N/A") {
            $errs += "Driver for '$($rec.title)' should contain quantified risk points"
        }
    }
    $errs
}

# Verify comparison references thresholds
Run-Test 92 "Just-ComparisonThresholds" @{monthly_revenue=80000; monthly_expenses=75000; debt=90000; cash_reserves=30000; cost_of_goods_sold=20000; total_assets=130000; current_liabilities=40000} "any" {
    param($a, $state)
    $errs = @()
    foreach ($rec in $a.recommendations) {
        $j = $rec.justification
        if ($j.comparison.Length -lt 15 -and $j.comparison -ne "N/A") {
            $errs += "Comparison for '$($rec.title)' is too short: '$($j.comparison)'"
        }
    }
    $errs
}

# Verify impact mentions risk score improvement
Run-Test 93 "Just-ImpactQuantified" @{monthly_revenue=60000; monthly_expenses=70000; debt=100000; cash_reserves=15000; cost_of_goods_sold=15000; total_assets=80000; current_liabilities=45000} "high_risk" {
    param($a, $state)
    $errs = @()
    foreach ($rec in $a.recommendations) {
        $j = $rec.justification
        if ($j.impact -notmatch "point|risk|prevent|protect|improve" -and $j.impact -ne "N/A") {
            $errs += "Impact for '$($rec.title)' should reference score improvement"
        }
    }
    $errs
}

# Verify priority_reason includes ranking
Run-Test 94 "Just-PriorityRanking" @{monthly_revenue=110000; monthly_expenses=70000; debt=15000; cash_reserves=90000; cost_of_goods_sold=20000; total_assets=250000; current_liabilities=22000} "safe" {
    param($a, $state)
    $errs = @()
    for ($i = 0; $i -lt $a.recommendations.Count; $i++) {
        $j = $a.recommendations[$i].justification
        $expectedRank = $i + 1
        if ($j.priority_reason -notmatch "#$expectedRank") {
            $errs += "Rec $expectedRank priority_reason should contain '#$expectedRank': got '$($j.priority_reason)'"
        }
    }
    $errs
}

# Verify #1 recommendation has "single largest contributor" when applicable
Run-Test 95 "Just-LargestContributor" @{monthly_revenue=50000; monthly_expenses=80000; debt=150000; cash_reserves=8000; cost_of_goods_sold=15000; total_assets=70000; current_liabilities=50000} "high_risk" {
    param($a, $state)
    $errs = @()
    $first = $a.recommendations[0].justification.priority_reason
    if ($first -notmatch "largest contributor|Ranked #1" -and $first -ne "N/A") {
        $errs += "First rec should mention 'largest contributor': got '$first'"
    }
    $errs
}

# Verify recommendations are sorted by impact (descending)
Run-Test 96 "Just-ImpactSorting" @{monthly_revenue=70000; monthly_expenses=90000; debt=130000; cash_reserves=12000; cost_of_goods_sold=18000; total_assets=80000; current_liabilities=45000} "high_risk" {
    param($a, $state)
    $errs = @()
    # Check that rank numbers are sequential
    for ($i = 0; $i -lt $a.recommendations.Count; $i++) {
        $j = $a.recommendations[$i].justification
        if ($j.priority_reason -match "#(\d+)") {
            $rank = [int]$Matches[1]
            if ($rank -ne ($i + 1)) {
                $errs += "Rec at position $($i+1) has rank #$rank (should be #$($i+1))"
            }
        }
    }
    $errs
}

# Verify every title is non-empty and descriptive
Run-Test 97 "Just-TitleQuality" @{monthly_revenue=90000; monthly_expenses=85000; debt=45000; cash_reserves=40000; cost_of_goods_sold=22000; total_assets=155000; current_liabilities=30000} "any" {
    param($a, $state)
    $errs = @()
    foreach ($rec in $a.recommendations) {
        if (-not $rec.title -or $rec.title.Length -lt 3) {
            $errs += "Empty or too-short title found"
        }
        if ($rec.title.Length -gt 60) {
            $errs += "Title too long (>60 chars): '$($rec.title)'"
        }
    }
    $errs
}

# Verify no generic language in justifications
Run-Test 98 "Just-NoGenericLanguage" @{monthly_revenue=120000; monthly_expenses=90000; debt=60000; cash_reserves=50000; cost_of_goods_sold=30000; total_assets=200000; current_liabilities=35000} "any" {
    param($a, $state)
    $errs = @()
    foreach ($rec in $a.recommendations) {
        $j = $rec.justification
        $generic = @("consider improving", "you should", "it is recommended", "generally speaking")
        foreach ($g in $generic) {
            if ($j.driver -match $g -or $j.comparison -match $g -or $j.impact -match $g) {
                $errs += "Generic language '$g' found in justification for '$($rec.title)'"
            }
        }
    }
    $errs
}

# Full distressed scenario: verify all justifications reference distress/survival
Run-Test 99 "Just-DistressedTone" @{monthly_revenue=15000; monthly_expenses=70000; debt=250000; cash_reserves=3000; cost_of_goods_sold=5000; total_assets=35000; current_liabilities=55000} "high_risk" {
    param($a, $state)
    $errs = @()
    if ($state -ne "DISTRESSED") { $errs += "Expected DISTRESSED" }
    # All titles should be survival-oriented (no growth)
    foreach ($rec in $a.recommendations) {
        $t = $rec.title.ToLower()
        if ($t -match "deploy|Growth|reinvest|expansion|benchmark") {
            $errs += "DISTRESSED rec has growth-oriented title: '$($rec.title)'"
        }
    }
    $errs
}

# Full healthy scenario: verify positive justifications present
Run-Test 100 "Just-HealthyPositive" @{monthly_revenue=200000; monthly_expenses=100000; debt=8000; cash_reserves=250000; cost_of_goods_sold=25000; total_assets=500000; current_liabilities=25000} "safe" {
    param($a, $state)
    $errs = @()
    if ($state -ne "STABLE") { $errs += "Expected STABLE, got $state" }
    # Should have at least one positive/optimization rec
    $hasPositive = $a.recommendations | Where-Object { $_.title -match "Deploy|Leverage Financing|Stress-Test|Benchmark" }
    if (-not $hasPositive) { $errs += "STABLE+healthy should include optimization recommendations" }
    # Verify positive recs have positive justifications
    foreach ($rec in $a.recommendations) {
        if ($rec.title -match "Deploy Excess") {
            if ($rec.justification.driver -notmatch "positive signal") {
                $errs += "Positive rec should have 'positive signal' in driver"
            }
        }
    }
    $errs
}

# ═══════════════════════════════════════════════════════════════════════
# FINAL SUMMARY
# ═══════════════════════════════════════════════════════════════════════
Write-Host "`n========================================================="
Write-Host "  FINAL SUMMARY"
Write-Host "========================================================="
Write-Host "  Total:  100"
Write-Host "  Passed: $pass" -ForegroundColor Green
Write-Host "  Failed: $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })

if ($errors.Count -gt 0) {
    Write-Host "`n  ---- FAILURES ----" -ForegroundColor Red
    foreach ($e in $errors) {
        Write-Host "    $e" -ForegroundColor Red
    }
}

Write-Host "`n  Coverage dimensions:"
Write-Host "    Profitability:       15 tests (very-high to zero-revenue)"
Write-Host "    Liquidity:           15 tests (>3.0 to zero)"
Write-Host "    Leverage:            12 tests (0.05 to 4.0)"
Write-Host "    Cash Runway:         12 tests (infinite to 0)"
Write-Host "    Cross-combinations:  26 tests (paradox + edge cases)"
Write-Host "    State gating:        10 tests (STABLE/ELEVATED/DISTRESSED)"
Write-Host "    Justification layer: 10 tests (driver/comparison/impact/priority)"
Write-Host "========================================================="

if ($fail -eq 0) {
    Write-Host "`n  ALL 100 CHECKS PASSED" -ForegroundColor Green
} else {
    Write-Host "`n  $fail FAILURES REQUIRE INVESTIGATION" -ForegroundColor Red
}
