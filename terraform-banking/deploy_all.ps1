param (
    [Parameter(Mandatory=$true)]
    [string]$PublicIp,

    [Parameter(Mandatory=$true)]
    [string]$StorageAccount,

    [Parameter(Mandatory=$true)]
    [string]$ResourceGroup,

    [Parameter(Mandatory=$true)]
    [string]$VmName
)

$ErrorActionPreference = "Stop"

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "🚀 STARTING INTEGRATED POST-APPLY AUTOMATION" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "VM Public IP:      $PublicIp" -ForegroundColor DarkCyan
Write-Host "Storage Account:   $StorageAccount" -ForegroundColor DarkCyan
Write-Host "Resource Group:    $ResourceGroup" -ForegroundColor DarkCyan
Write-Host "VM Name:           $VmName" -ForegroundColor DarkCyan

# -----------------------------------------------------------------------------
# 1. Update Portal environment variables (.env)
# -----------------------------------------------------------------------------
Write-Host "`nStep 1: Writing portal configuration (.env)..." -ForegroundColor Yellow
$portalDir = Resolve-Path "../portal"
$envPath = Join-Path $portalDir ".env"
$envContent = @"
VITE_API_URL=http://$PublicIp:3001/api
"@
Set-Content -Path $envPath -Value $envContent
Write-Host "  ✓ Wrote: VITE_API_URL=http://$PublicIp:3001/api to $envPath" -ForegroundColor Green

# -----------------------------------------------------------------------------
# 2. Compile React portal bundle
# -----------------------------------------------------------------------------
Write-Host "`nStep 2: Installing packages and building React portal..." -ForegroundColor Yellow
Push-Location $portalDir
try {
    Write-Host "  Running 'npm install'..."
    npm install
    Write-Host "  Running 'npm run build'..."
    npm run build
} finally {
    Pop-Location
}
Write-Host "  ✓ React build compiled successfully." -ForegroundColor Green

# -----------------------------------------------------------------------------
# 3. Deploy portal to Azure Static Website ($web)
# -----------------------------------------------------------------------------
Write-Host "`nStep 3: Deploying React bundle to storage account static site '$web'..." -ForegroundColor Yellow
$distDir = Join-Path $portalDir "dist"

# Clean old static files first
Write-Host "  Purging existing files in `$web container..."
az storage blob delete-batch --account-name $StorageAccount --source '$web' --auth-mode key

# Upload batch
Write-Host "  Uploading new build..."
az storage blob upload-batch --account-name $StorageAccount -s "$distDir" -d '$web' --overwrite --auth-mode key

# Set strict Cache-Control on index.html
Write-Host "  Configuring Cache-Control headers on index.html..."
az storage blob upload --account-name $StorageAccount -c '$web' -f (Join-Path $distDir "index.html") -n index.html --content-cache-control "no-cache, no-store, must-revalidate" --overwrite --auth-mode key

Write-Host "  ✓ Static website deployed! URL: https://$StorageAccount.z7.web.core.windows.net" -ForegroundColor Green

# -----------------------------------------------------------------------------
# 4. Bootstrap Node.js backend API on VM corebank-1
# -----------------------------------------------------------------------------
Write-Host "`nStep 4: Bootstrapping and starting backend Node.js API on VM $VmName..." -ForegroundColor Yellow

# Create the VM setup script inline
$vmScriptContent = @"
#!/bin/bash
set -e

echo "============================================="
echo "⚙️ VM Bootstrapping: corebank-1"
echo "============================================="

# 1. Install Node.js 20 & Git
if ! command -v node &>/dev/null; then
  echo "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs git
fi
echo "Node version: \$(node -v)"
echo "NPM version:  \$(npm -v)"

# 2. Deploy application codebase
APP_DIR="/opt/azure-banking-api"
sudo mkdir -p "\$APP_DIR"
sudo chown -R azureadmin:azureadmin "\$APP_DIR"

if [ -d "\$APP_DIR/.git" ]; then
  echo "Repository exists, pulling latest codebase..."
  cd "\$APP_DIR"
  git pull origin master
else
  echo "Cloning codebase..."
  sudo rm -rf /tmp/repo
  git clone https://github.com/gulmaan87/Azure-banking-system.git /tmp/repo
  cp -r /tmp/repo/backend/* "\$APP_DIR"
  rm -rf /tmp/repo
fi

cd "\$APP_DIR"
echo "Installing dependencies..."
npm install --omit=dev

# 3. Create .env configuration
echo "Writing environment config..."
cat <<ENVEOF > .env
NODE_ENV=production
PORT=3001

# Azure AD Tenant & Client Settings
AZURE_TENANT_ID=5a6205a1-31ef-47e2-968b-d4d2a777c03b
AZURE_CLIENT_ID=c79c2b57-0a57-41d8-9f7e-7197413e8b9e
AZURE_GROUP_BANK_ADMINS=de49039f-bf12-4b54-a94b-4674dc75e852
AZURE_GROUP_SECURITY_AUDITORS=3fd673b9-61f7-47bd-8a8e-abcd160b2791
AZURE_GROUP_APP_DEVELOPERS=5eb9bdcd-e141-41b1-80a3-2b1c657eb301
AZURE_GROUP_DATA_ENGINEERS=cc6b1a1d-6e18-4a2f-ba7b-715898770f3a

# Database Configuration (Skipped per user directions)
DB_SERVER=10.0.6.4
DB_PORT=1433
DB_NAME=BankingDB
DB_USER=bankapp
DB_PASSWORD=YourStrong@Passw0rd

# Azure Storage Integration
STORAGE_ACCOUNT_NAME=$StorageAccount
STORAGE_CONTAINER_KYC=kyc-documents
UPLOAD_MAX_SIZE_MB=10

# SignalR Hub Settings
SIGNALR_CONNECTION_STRING=Endpoint=https://mohdg-gulmaan-banking-signalr-dev.service.signalr.net;AccessKey=tzZ2hJ1BU9RjDuRNtIAECileTTHJRwHO7W4gtWwiupkiMM5ENCWhJQQJ99CEAC3pKaRXJ3w3AAAAASRSp2Xg;Version=1.0;

# Log Analytics Configuration
LOG_WORKSPACE_ID=mohdg-gulmaan-banking-law-dev

# CORS Allowed Origin
FRONTEND_URL=https://$StorageAccount.z7.web.core.windows.net
ENVEOF

# 4. Process Manager (PM2) Installation & Application Start
if ! command -v pm2 &>/dev/null; then
  echo "Installing PM2 globally..."
  sudo npm install -g pm2
fi

echo "Registering application with PM2..."
pm2 delete azure-banking-api 2>/dev/null || true
pm2 start src/server.js \
  --name "azure-banking-api" \
  --time \
  --restart-delay 3000 \
  --max-restarts 5

pm2 save
echo "============================================="
echo "✅ VM Setup Complete. API running on port 3001."
echo "============================================="
"@

# Save setup script temporarily
$tempScriptPath = [System.IO.Path]::GetTempFileName()
$vmScriptContent | Set-Content -Path $tempScriptPath

Write-Host "  Invoking setup script on VM '$VmName' via Azure RunShellScript..."
az vm run-command invoke `
    --resource-group $ResourceGroup `
    --name $VmName `
    --command-id RunShellScript `
    --scripts "@$tempScriptPath"

Remove-Item -Path $tempScriptPath -Force
Write-Host "  ✓ Backend API deployed and started successfully." -ForegroundColor Green

Write-Host "`n=============================================" -ForegroundColor Green
Write-Host "🎉 ALL DEPLOYMENTS AUTOMATICALLY COMPLETED!" -ForegroundColor Green
Write-Host "👉 Portal is at: https://$StorageAccount.z7.web.core.windows.net" -ForegroundColor Green
Write-Host "👉 Backend is at: http://$PublicIp:3001" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
