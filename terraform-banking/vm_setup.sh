#!/bin/bash
###############################################################################
# vm_setup.sh — Run on corebank-1 VM (10.0.4.4) to install and start the API
#
# Executed via:
#   az vm run-command invoke \
#     --resource-group mohdg-gulmaan-banking-rg-region1-dev \
#     --name mohdg-gulmaan-banking-ext-r1-corebank-1-dev \
#     --command-id RunShellScript \
#     --scripts @vm_setup.sh
###############################################################################

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏦 Azure Bank — corebank-1 API Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Install Node.js 20 LTS ────────────────────────────────────────────────
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

echo "  ✓ Node $(node -v) | npm $(npm -v)"

# ── 2. Clone / pull the backend code ─────────────────────────────────────────
# In production, replace with your actual git repo URL
APP_DIR="/opt/azure-banking-api"
if [ -d "$APP_DIR" ]; then
    echo "📥 Pulling latest code..."
    cd "$APP_DIR" && git pull
else
    echo "📥 Cloning repository..."
    sudo git clone https://github.com/YOUR_ORG/azure-banking-api.git "$APP_DIR"
fi
cd "$APP_DIR"
sudo npm install --production

# ── 3. Create .env with ONLY the Key Vault URL ────────────────────────────────
# All other secrets are fetched from Key Vault at startup using Managed Identity
# The VM's Managed Identity was granted read access by Terraform
echo "📝 Writing .env..."
sudo tee .env > /dev/null <<EOF
NODE_ENV=production
PORT=3001
KEY_VAULT_URL=$(curl -s -H Metadata:true "http://169.254.169.254/metadata/instance?api-version=2021-02-01" | python3 -c "
import sys, json
data = json.load(sys.stdin)
rg = data['compute']['resourceGroupName']
print(f'')
" || echo "")
EOF

# Fetch Key Vault URL from Azure metadata
KV_URL=$(az keyvault list --resource-group mohdg-gulmaan-banking-rg-region1-dev --query '[0].properties.vaultUri' -o tsv 2>/dev/null || echo "")
if [ -n "$KV_URL" ]; then
    echo "KEY_VAULT_URL=$KV_URL" | sudo tee -a .env > /dev/null
    echo "  ✓ Key Vault URL set: $KV_URL"
fi

# ── 4. Install PM2 process manager ───────────────────────────────────────────
echo "⚙️  Installing PM2..."
sudo npm install -g pm2
sudo pm2 start src/server.js --name "azure-banking-api" --time
sudo pm2 startup systemd -u root --hp /root
sudo pm2 save

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ API running on http://10.0.4.4:3001"
echo "   Check logs: pm2 logs azure-banking-api"
echo "   Health:     curl http://localhost:3001/api/health"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
