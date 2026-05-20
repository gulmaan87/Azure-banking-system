###############################################################################
# deploy_secrets.ps1
# Pushes all banking API secrets to Azure Key Vault via Azure CLI.
#
# Run ONCE after:
#   1. `terraform apply` completes (Key Vault is created)
#   2. App Registrations exist in Azure Portal
#
# Usage:
#   .\deploy_secrets.ps1 `
#     -KeyVaultName "mohdggulmaanbankkv" `
#     -DbPassword "YourDbPass123!" `
#     -ApiClientId "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
#
# Optional: Pass Sentinel / Storage values or let Terraform auto-populate them
###############################################################################

param(
    [Parameter(Mandatory=$true)]
    [string]$KeyVaultName,

    [Parameter(Mandatory=$true)]
    [string]$DbPassword,

    [Parameter(Mandatory=$false)]
    [string]$ApiClientId = "",

    [Parameter(Mandatory=$false)]
    [string]$FrontendUrl = "http://localhost:5173",

    [Parameter(Mandatory=$false)]
    [string]$StorageAccountName = "mohdggulmaanbankr1",

    [Parameter(Mandatory=$false)]
    [string]$StorageConnectionString = "",

    # Phase 6 — Sentinel (auto-populated by Terraform if left blank)
    [Parameter(Mandatory=$false)]
    [string]$LogIngestionEndpoint = "",

    [Parameter(Mandatory=$false)]
    [string]$LogDcrImmutableId = "",

    [Parameter(Mandatory=$false)]
    [string]$SignalRConnectionString = ""
)

Write-Host "🔐 Azure Bank — Deploying secrets to Key Vault: $KeyVaultName" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

# Ensure logged in
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "❌ Not logged in. Run: az login" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Logged in as: $($account.user.name) | Tenant: $($account.tenantId)" -ForegroundColor Green

# ── Helper ────────────────────────────────────────────────────────────────────
function Set-KvSecret {
    param([string]$Name, [string]$Value, [string]$ContentType = "text/plain")
    if ([string]::IsNullOrEmpty($Value)) {
        Write-Host "  ⚠  Skipping '$Name' (empty — set manually or via Terraform output)" -ForegroundColor Yellow
        return
    }
    $result = az keyvault secret set `
        --vault-name $KeyVaultName `
        --name $Name `
        --value $Value `
        --content-type $ContentType `
        --output none 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ $Name" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $Name — $result" -ForegroundColor Red
    }
}

# ── Database ──────────────────────────────────────────────────────────────────
Write-Host "`n📦 Database secrets..." -ForegroundColor Magenta
Set-KvSecret -Name "db-server"   -Value "10.0.6.4"
Set-KvSecret -Name "db-name"     -Value "BankingDB"
Set-KvSecret -Name "db-user"     -Value "bankapp"
Set-KvSecret -Name "db-password" -Value $DbPassword -ContentType "password"

# ── Azure AD ──────────────────────────────────────────────────────────────────
Write-Host "`n📦 Azure AD secrets..." -ForegroundColor Magenta
Set-KvSecret -Name "azure-tenant-id"     -Value $account.tenantId
Set-KvSecret -Name "azure-api-client-id" -Value $ApiClientId

# ── Storage (Phase 7 — KYC documents) ────────────────────────────────────────
Write-Host "`n📦 Storage secrets (Phase 7)..." -ForegroundColor Magenta
Set-KvSecret -Name "storage-account-name"     -Value $StorageAccountName
Set-KvSecret -Name "storage-connection-string" -Value $StorageConnectionString -ContentType "connection-string"

# ── SignalR (Phase 5) ─────────────────────────────────────────────────────────
Write-Host "`n📦 SignalR secrets (Phase 5)..." -ForegroundColor Magenta
Set-KvSecret -Name "signalr-connection-string" -Value $SignalRConnectionString -ContentType "connection-string"

# ── Sentinel / Log Analytics (Phase 6) ───────────────────────────────────────
Write-Host "`n📦 Sentinel secrets (Phase 6)..." -ForegroundColor Magenta
Write-Host "   (These are auto-created by Terraform — only set if overriding)" -ForegroundColor DarkGray
Set-KvSecret -Name "log-ingestion-endpoint" -Value $LogIngestionEndpoint
Set-KvSecret -Name "log-dcr-immutable-id"   -Value $LogDcrImmutableId

# ── App settings ──────────────────────────────────────────────────────────────
Write-Host "`n📦 Application settings..." -ForegroundColor Magenta
Set-KvSecret -Name "frontend-url" -Value $FrontendUrl

# ── Terraform auto-populated secrets (informational) ─────────────────────────
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "ℹ  The following secrets are auto-created by Terraform (no action needed):" -ForegroundColor Cyan
Write-Host "   • log-ingestion-endpoint   (from azurerm_monitor_data_collection_endpoint)" -ForegroundColor Gray
Write-Host "   • log-dcr-immutable-id     (from azurerm_monitor_data_collection_rule)" -ForegroundColor Gray
Write-Host "   • log-workspace-id         (from azurerm_log_analytics_workspace)" -ForegroundColor Gray
Write-Host "   • storage-connection-string (from data.azurerm_storage_account)" -ForegroundColor Gray

# ── Verify ────────────────────────────────────────────────────────────────────
Write-Host "`n✅ Done. List all secrets:" -ForegroundColor Cyan
Write-Host "   az keyvault secret list --vault-name $KeyVaultName --query '[].name' -o table" -ForegroundColor White

$kvUrl = az keyvault show --name $KeyVaultName --query 'properties.vaultUri' -o tsv 2>$null
Write-Host "`n📋 Set this on corebank-1 VM:" -ForegroundColor Yellow
Write-Host "   KEY_VAULT_URL=$kvUrl" -ForegroundColor White
Write-Host "`n📋 Then on the VM run:" -ForegroundColor Yellow
Write-Host "   pm2 restart banking-api" -ForegroundColor White
