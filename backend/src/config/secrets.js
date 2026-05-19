/**
 * secrets.js — Azure Key Vault Secret Loader
 *
 * HOW IT WORKS (Production — on corebank-1 VM):
 *   1. The VM has a System-Assigned Managed Identity (enabled via Terraform)
 *   2. DefaultAzureCredential picks that up automatically — NO password needed
 *   3. At startup, this module fetches all secrets from Key Vault
 *   4. Merges them into process.env so the rest of the app works normally
 *
 * HOW IT WORKS (Local Dev):
 *   - KEY_VAULT_URL is not set → falls back to .env values, nothing fetched
 *   - No Azure credentials needed on developer machines
 *
 * Secret Name → env var mapping:
 *   db-server          → DB_SERVER
 *   db-name            → DB_NAME
 *   db-user            → DB_USER
 *   db-password        → DB_PASSWORD
 *   azure-tenant-id    → AZURE_TENANT_ID
 *   azure-api-client-id→ AZURE_CLIENT_ID
 *   storage-account-name→ STORAGE_ACCOUNT_NAME
 *   frontend-url       → FRONTEND_URL
 */

import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';

// Map of Key Vault secret names → process.env variable names
const SECRET_MAP = {
  'db-server':            'DB_SERVER',
  'db-name':              'DB_NAME',
  'db-user':              'DB_USER',
  'db-password':          'DB_PASSWORD',
  'azure-tenant-id':      'AZURE_TENANT_ID',
  'azure-api-client-id':  'AZURE_CLIENT_ID',
  'storage-account-name': 'STORAGE_ACCOUNT_NAME',
  'frontend-url':         'FRONTEND_URL',
  'signalr-connection-string': 'SIGNALR_CONNECTION_STRING',
  'log-ingestion-endpoint':    'LOG_INGESTION_ENDPOINT',
  'log-dcr-immutable-id':      'LOG_DCR_IMMUTABLE_ID',
  'log-workspace-id':          'LOG_WORKSPACE_ID',
};

export const loadSecretsFromKeyVault = async () => {
  const kvUrl = process.env.KEY_VAULT_URL;

  if (!kvUrl) {
    console.log('ℹ️  KEY_VAULT_URL not set — using .env values (local dev mode)');
    return;
  }

  console.log(`🔐 Loading secrets from Key Vault: ${kvUrl}`);

  try {
    // DefaultAzureCredential automatically uses:
    //   - VM Managed Identity (on Azure)
    //   - Azure CLI credentials (local dev with `az login`)
    //   - Environment variables AZURE_CLIENT_ID / AZURE_CLIENT_SECRET (CI/CD)
    const credential = new DefaultAzureCredential();
    const client     = new SecretClient(kvUrl, credential);

    const results = await Promise.allSettled(
      Object.entries(SECRET_MAP).map(async ([secretName, envKey]) => {
        const secret = await client.getSecret(secretName);
        process.env[envKey] = secret.value;
        return secretName;
      })
    );

    const loaded  = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    const failed  = results.filter(r => r.status === 'rejected');

    console.log(`✅ Loaded ${loaded.length} secrets: ${loaded.join(', ')}`);

    if (failed.length > 0) {
      console.warn(`⚠️  ${failed.length} secret(s) failed to load:`);
      failed.forEach((f, i) => console.warn(`   ${i + 1}. ${f.reason?.message}`));
    }

  } catch (err) {
    console.error('❌ Key Vault connection failed:', err.message);
    console.error('   Falling back to .env values. Ensure Managed Identity is enabled on the VM.');
    // Do NOT throw — fall back to .env so the service still starts
  }
};
