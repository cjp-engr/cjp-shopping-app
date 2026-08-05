# TokoMart Mobile Regression Suite
# Runs all Patrol tests sequentially in logical order.
#
# Usage:
#   .\scripts\run_regression.ps1
#   .\scripts\run_regression.ps1 -Device "emulator-5554"
#   .\scripts\run_regression.ps1 -Tags "smoke"

param(
    [string]$Device = "emulator-5554",
    [string]$Tags = "",
    [string]$BuyerEmail = "buyer@test.com",
    [string]$SellerEmail = "seller@test.com",
    [string]$Password = "Test750!!"
)

$ErrorActionPreference = "Stop"

$baseArgs = @(
    "--device", $Device,
    "--dart-define=BUYER_EMAIL=$BuyerEmail",
    "--dart-define=SELLER_EMAIL=$SellerEmail",
    "--dart-define=PASSWORD=$Password"
)

if ($Tags) {
    $baseArgs += "--tags", $Tags
}

# Ordered test list — logical regression sequence
$tests = @(
    @{ file = "patrol_test/0_auth/login_test.dart";                      label = "TC-067  Login smoke" },
    @{ file = "patrol_test/1_seller/add_product_simple_test.dart";         label = "TC-090  Seller: simple product" },
    @{ file = "patrol_test/2_buyer/cod_checkout_test.dart";               label = "TC-095  COD checkout" },
    @{ file = "patrol_test/2_buyer/new_credit_checkout_test.dart";        label = "TC-097  New credit card checkout" },
    @{ file = "patrol_test/2_buyer/saved_credit_checkout_test.dart";      label = "TC-096  Saved credit card checkout" },
    @{ file = "patrol_test/1_seller/add_product_variant_test.dart";        label = "TC-091  Seller: variant product" },
    @{ file = "patrol_test/2_buyer/cod_variant_checkout_test.dart";       label = "TC-101  COD checkout — variant" },
    @{ file = "patrol_test/2_buyer/new_credit_variant_checkout_test.dart";   label = "TC-103  New credit — variant" },
    @{ file = "patrol_test/2_buyer/saved_credit_variant_checkout_test.dart"; label = "TC-104  Saved credit — variant" }
)

$passed  = @()
$failed  = @()
$skipped = @()
$total   = $tests.Count
$index   = 0

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TokoMart Mobile Regression Suite" -ForegroundColor Cyan
Write-Host "  Device : $Device" -ForegroundColor Cyan
Write-Host "  Tests  : $total" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

foreach ($t in $tests) {
    $index++
    $file  = $t.file
    $label = $t.label

    # Skip if file does not exist yet
    if (-not (Test-Path $file)) {
        Write-Host "[$index/$total] SKIP  $label  (file not found)" -ForegroundColor DarkGray
        $skipped += $label
        continue
    }

    Write-Host "[$index/$total] RUN   $label" -ForegroundColor Yellow

    $patrolArgs = @("test", "--target", $file) + $baseArgs
    patrol @patrolArgs

    if ($LASTEXITCODE -eq 0) {
        Write-Host "[$index/$total] PASS  $label" -ForegroundColor Green
        $passed += $label
    } else {
        Write-Host "[$index/$total] FAIL  $label" -ForegroundColor Red
        $failed += $label
    }

    Write-Host ""
}

# ── Summary ──────────────────────────────────────────────────────────────────
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Results" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PASS   : $($passed.Count)" -ForegroundColor Green
Write-Host "  FAIL   : $($failed.Count)" -ForegroundColor Red
Write-Host "  SKIP   : $($skipped.Count)" -ForegroundColor DarkGray
Write-Host ""

if ($failed.Count -gt 0) {
    Write-Host "Failed tests:" -ForegroundColor Red
    $failed | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    Write-Host ""
    exit 1
}

exit 0
