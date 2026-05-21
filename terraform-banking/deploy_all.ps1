param (
    [Parameter(Mandatory=$true)]
    [string]$PublicIp,

    [Parameter(Mandatory=$true)]
    [string]$StorageAccount,

    [Parameter(Mandatory=$true)]
    [string]$ResourceGroup,

    [Parameter(Mandatory=$true)]
    [string]$VmName,

    [Parameter(Mandatory=$true)]
    [string]$Fqdn
)

$ErrorActionPreference = "Stop"

# Trim potential single/double quotes from arguments passed via command-line
$PublicIp      = $PublicIp.Trim("'`"")
$StorageAccount = $StorageAccount.Trim("'`"")
$ResourceGroup  = $ResourceGroup.Trim("'`"")
$VmName         = $VmName.Trim("'`"")
$Fqdn           = $Fqdn.Trim("'`"")

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "STARTING INTEGRATED POST-APPLY AUTOMATION"    -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "VM Public IP:      $PublicIp"    -ForegroundColor DarkCyan
Write-Host "VM FQDN:           $Fqdn"        -ForegroundColor DarkCyan
Write-Host "Storage Account:   $StorageAccount" -ForegroundColor DarkCyan
Write-Host "Resource Group:    $ResourceGroup"  -ForegroundColor DarkCyan
Write-Host "VM Name:           $VmName"         -ForegroundColor DarkCyan

# -----------------------------------------------------------------------------
# 1. Update Portal environment variables (.env)
# -----------------------------------------------------------------------------
Write-Host "`nStep 1: Writing portal configuration (.env)..." -ForegroundColor Yellow
$portalDir = Resolve-Path "../portal"
$envPath   = Join-Path $portalDir ".env"
$envContent = @"
VITE_API_URL=https://${Fqdn}/api
VITE_AZURE_TENANT_ID=5a6205a1-31ef-47e2-968b-d4d2a777c03b
VITE_AZURE_CLIENT_ID=b7584ac0-b79a-4586-a600-f436bf855072
VITE_AZURE_API_CLIENT_ID=c79c2b57-0a57-41d8-9f7e-7197413e8b9e
VITE_GROUP_BANK_ADMINS=a234dfb0-cce9-4f21-a0b0-f2c0fb31fcd6
VITE_GROUP_SECURITY_AUDITORS=8a1e788c-65f3-4f51-b5dd-94493ac9d3df
VITE_GROUP_APP_DEVELOPERS=78812755-ba74-45d7-bce5-d0ef17ea490e
VITE_GROUP_DATA_ENGINEERS=9cfb8266-6413-4d05-aaa2-884f9843135f
"@
Set-Content -Path $envPath -Value $envContent
Write-Host "  Wrote portal .env configuration successfully to $envPath" -ForegroundColor Green

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
Write-Host "  React build compiled successfully." -ForegroundColor Green

# -----------------------------------------------------------------------------
# 3. Deploy portal to Azure Static Website ($web)
# -----------------------------------------------------------------------------
Write-Host "`nStep 3: Deploying React bundle to storage account static site..." -ForegroundColor Yellow
$distDir = Join-Path $portalDir "dist"

Write-Host "  Enabling static website hosting on storage account '$StorageAccount'..."

az storage blob service-properties update `
    --account-name $StorageAccount `
    --static-website true `
    --index-document index.html `
    --404-document index.html `
    --auth-mode key

Write-Host "  Purging existing files in web container..."
az storage blob delete-batch --account-name $StorageAccount --source '$web' --auth-mode key

Write-Host "  Uploading new build..."
az storage blob upload-batch --account-name $StorageAccount -s "$distDir" -d '$web' --overwrite --auth-mode key

Write-Host "  Configuring Cache-Control headers on index.html..."
az storage blob upload `
    --account-name $StorageAccount `
    -c '$web' `
    -f (Join-Path $distDir "index.html") `
    -n index.html `
    --content-cache-control "no-cache, no-store, must-revalidate" `
    --overwrite `
    --auth-mode key

Write-Host "  Static website deployed! URL: https://$StorageAccount.z7.web.core.windows.net" -ForegroundColor Green

# -----------------------------------------------------------------------------
# 4. Bootstrap Node.js backend API on VM corebank-1
# -----------------------------------------------------------------------------
Write-Host "`nStep 4: Bootstrapping and starting backend Node.js API on VM $VmName..." -ForegroundColor Yellow

$serverJsContent = Get-Content -Raw -Path (Join-Path $portalDir "../backend/src/server.js")

# Build the bash script, injecting PowerShell variables where needed.
# We use a double-quoted here-string (@"..."@) so PowerShell expands $StorageAccount
# and $Fqdn. Bash variables inside (like $APP_DIR) are escaped with backtick.
$bashScript = @"
#!/bin/bash
set -e

echo "============================================="
echo "VM Bootstrapping: corebank-1"
echo "============================================="

if ! command -v node &>/dev/null; then
  echo "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs git nginx python3-certbot-nginx certbot
fi

APP_DIR="/opt/azure-banking-api"
sudo mkdir -p "`$APP_DIR"
sudo chown -R azureadmin:azureadmin "`$APP_DIR"

if [ -d "`$APP_DIR/.git" ]; then
  echo "Repository exists, pulling latest codebase..."
  cd "`$APP_DIR"
  git pull origin master
else
  echo "Cloning codebase..."
  sudo rm -rf /tmp/repo
  git clone https://github.com/gulmaan87/Azure-banking-system.git /tmp/repo
  cp -r /tmp/repo/backend/* "`$APP_DIR"
  rm -rf /tmp/repo
fi

echo "Applying local server.js modifications..."
cat <<'SERVEREOF' > "`$APP_DIR/src/server.js"
$serverJsContent
SERVEREOF

cd "`$APP_DIR"
echo "Installing dependencies..."
npm install --omit=dev

echo "Writing environment config..."
cat > .env <<'ENVEOF'
NODE_ENV=production
PORT=3001
AZURE_TENANT_ID=5a6205a1-31ef-47e2-968b-d4d2a777c03b
AZURE_CLIENT_ID=c79c2b57-0a57-41d8-9f7e-7197413e8b9e
AZURE_GROUP_BANK_ADMINS=a234dfb0-cce9-4f21-a0b0-f2c0fb31fcd6
AZURE_GROUP_SECURITY_AUDITORS=8a1e788c-65f3-4f51-b5dd-94493ac9d3df
AZURE_GROUP_APP_DEVELOPERS=78812755-ba74-45d7-bce5-d0ef17ea490e
AZURE_GROUP_DATA_ENGINEERS=9cfb8266-6413-4d05-aaa2-884f9843135f
DB_SERVER=10.0.6.4
DB_PORT=1433
DB_NAME=BankingDB
DB_USER=bankapp
DB_PASSWORD=YourStrong@Passw0rd
STORAGE_ACCOUNT_NAME=$StorageAccount
STORAGE_CONTAINER_KYC=kyc-documents
UPLOAD_MAX_SIZE_MB=10
SIGNALR_CONNECTION_STRING=Endpoint=https://mohdg-gulmaan-banking-signalr-dev.service.signalr.net;AccessKey=FpyEpftHIIrvvMrAHM87rgAROrfNrUxjzmJ7rxcYHPxwdZ3rTyr5JQQJ99CEAC3pKaRXJ3w3AAAAASRSbpaD;Version=1.0;
LOG_WORKSPACE_ID=mohdg-gulmaan-banking-law-dev
FRONTEND_URLS=https://$StorageAccount.z7.web.core.windows.net,http://localhost:5173
ENVEOF

if ! command -v pm2 &>/dev/null; then
  echo "Installing PM2 globally..."
  sudo npm install -g pm2
fi

echo "Registering application with PM2..."
pm2 delete azure-banking-api 2>/dev/null || true
pm2 start src/server.js --name "azure-banking-api" --time --restart-delay 3000 --max-restarts 5
pm2 save

echo "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/default > /dev/null <<'NGINXEOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name $Fqdn;

    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade `$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host `$host;
        proxy_cache_bypass `$http_upgrade;
    }
}
NGINXEOF

sudo nginx -t && sudo systemctl restart nginx

echo "Issuing Let's Encrypt certificate..."
sudo certbot --nginx -d $Fqdn --non-interactive --agree-tos -m admin@$Fqdn --redirect

echo "============================================="
echo "VM Setup Complete. API running behind Nginx HTTPS."
echo "============================================="
"@

$tempScriptPath = [System.IO.Path]::GetTempFileName() + ".sh"
[System.IO.File]::WriteAllText($tempScriptPath, $bashScript, [System.Text.Encoding]::UTF8)

Write-Host "  Invoking setup script on VM '$VmName' via Azure RunShellScript..."
az vm run-command invoke `
    --resource-group $ResourceGroup `
    --name $VmName `
    --command-id RunShellScript `
    --scripts "@$tempScriptPath"

Remove-Item -Path $tempScriptPath -Force

Write-Host "  Backend API deployed and started successfully." -ForegroundColor Green

Write-Host "`n=============================================" -ForegroundColor Green
Write-Host "ALL DEPLOYMENTS COMPLETED SUCCESSFULLY!"       -ForegroundColor Green
Write-Host "Portal  : https://$StorageAccount.z7.web.core.windows.net" -ForegroundColor Green
Write-Host "Backend : https://${Fqdn}/api"                 -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
