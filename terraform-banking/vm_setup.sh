
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏦 Azure Bank — corebank-1 API Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

echo "  ✓ Node $(node -v) | npm $(npm -v)"

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

KV_URL=$(az keyvault list --resource-group mohdg-gulmaan-banking-rg-region1-dev --query '[0].properties.vaultUri' -o tsv 2>/dev/null || echo "")
if [ -n "$KV_URL" ]; then
    echo "KEY_VAULT_URL=$KV_URL" | sudo tee -a .env > /dev/null
    echo "  ✓ Key Vault URL set: $KV_URL"
fi

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
