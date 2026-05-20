/**
 * authConfig.js — MSAL Configuration for Azure Bank Portal
 *
 * HOW TO FILL THIS IN:
 * 1. Go to Azure Portal → Azure Active Directory → App Registrations
 * 2. Click "New Registration"
 *    - Name: "Azure Bank Portal"
 *    - Redirect URI: Single-page application → http://localhost:5173
 * 3. After creation, copy "Application (client) ID" → VITE_AZURE_CLIENT_ID
 * 4. Copy "Directory (tenant) ID" → VITE_AZURE_TENANT_ID
 * 5. Go to "API Permissions" → Add permission → "azure-bank-api" (your backend app)
 *    - Add: Customer.ReadWrite (for admins), Customer.Read (for auditors)
 * 6. Go to "Authentication" → enable "ID tokens" under Implicit grant
 */

const TENANT_ID = import.meta.env.VITE_AZURE_TENANT_ID || 'your-tenant-id';
const CLIENT_ID = import.meta.env.VITE_AZURE_CLIENT_ID || 'your-client-id';
const API_CLIENT_ID = import.meta.env.VITE_AZURE_API_CLIENT_ID || 'your-api-client-id';

export const msalConfig = {
  auth: {
    clientId:       CLIENT_ID,
    authority:      `https://login.microsoftonline.com/${TENANT_ID}`,
    redirectUri:    window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation:        'sessionStorage', // Safer than localStorage for banking apps
    storeAuthStateInCookie: false,
  },
};

// Scopes requested when the employee logs in
// These match the API permissions configured in App Registration
export const employeeLoginRequest = {
  scopes: [
    'openid',
    'profile',
    'email',
    `api://${API_CLIENT_ID}/Customer.ReadWrite`,
  ],
};

// Scopes for acquiring token silently before each API call
export const apiTokenRequest = {
  scopes: [`api://${API_CLIENT_ID}/Customer.ReadWrite`],
};

// Azure AD Group Object IDs — get these from:
// Azure Portal → Azure Active Directory → Groups → click group → copy "Object ID"
export const AD_GROUPS = {
  BANK_ADMINS:       import.meta.env.VITE_GROUP_BANK_ADMINS       || '',
  SECURITY_AUDITORS: import.meta.env.VITE_GROUP_SECURITY_AUDITORS || '',
  APP_DEVELOPERS:    import.meta.env.VITE_GROUP_APP_DEVELOPERS    || '',
  DATA_ENGINEERS:    import.meta.env.VITE_GROUP_DATA_ENGINEERS    || '',
};
