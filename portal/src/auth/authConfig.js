














const rawTenantId = import.meta.env.VITE_AZURE_TENANT_ID || '';
const rawClientId = import.meta.env.VITE_AZURE_CLIENT_ID || '';
const rawApiClientId = import.meta.env.VITE_AZURE_API_CLIENT_ID || '';

const rawCustomerClientId = import.meta.env.VITE_AZURE_CUSTOMER_CLIENT_ID || rawClientId;


const isGuid = (val) => {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
};

const isPlaceholder = (val) => {
  if (!val) return true;
  const lower = val.toLowerCase();
  return lower.includes('placeholder') || lower.includes('your-') || lower.includes('here');
};

const missingVars = [];
const invalidFormatVars = [];


if (!rawTenantId) {
  missingVars.push('VITE_AZURE_TENANT_ID');
} else if (isPlaceholder(rawTenantId)) {
  missingVars.push('VITE_AZURE_TENANT_ID (contains placeholder)');
} else if (!isGuid(rawTenantId)) {
  invalidFormatVars.push('VITE_AZURE_TENANT_ID (must be a valid UUID)');
}


if (!rawClientId) {
  missingVars.push('VITE_AZURE_CLIENT_ID');
} else if (isPlaceholder(rawClientId)) {
  missingVars.push('VITE_AZURE_CLIENT_ID (contains placeholder)');
} else if (!isGuid(rawClientId)) {
  invalidFormatVars.push('VITE_AZURE_CLIENT_ID (must be a valid UUID)');
}


if (!rawApiClientId) {
  missingVars.push('VITE_AZURE_API_CLIENT_ID');
} else if (isPlaceholder(rawApiClientId)) {
  missingVars.push('VITE_AZURE_API_CLIENT_ID (contains placeholder)');
} else if (!isGuid(rawApiClientId)) {
  invalidFormatVars.push('VITE_AZURE_API_CLIENT_ID (must be a valid UUID)');
}


const rawGroups = {
  BANK_ADMINS:       import.meta.env.VITE_GROUP_BANK_ADMINS       || '',
  SECURITY_AUDITORS: import.meta.env.VITE_GROUP_SECURITY_AUDITORS || '',
  APP_DEVELOPERS:    import.meta.env.VITE_GROUP_APP_DEVELOPERS    || '',
  DATA_ENGINEERS:    import.meta.env.VITE_GROUP_DATA_ENGINEERS    || '',
};

const missingOptionalVars = [];
const invalidOptionalVars = [];

Object.entries(rawGroups).forEach(([key, val]) => {
  const envName = `VITE_GROUP_${key}`;
  if (!val) {
    missingOptionalVars.push(envName);
  } else if (isPlaceholder(val)) {
    missingOptionalVars.push(`${envName} (contains placeholder)`);
  } else if (!isGuid(val)) {
    invalidOptionalVars.push(`${envName} (must be a valid UUID)`);
  }
});

export const isAuthConfigValid = missingVars.length === 0 && invalidFormatVars.length === 0;
export const isOptionalConfigValid = missingOptionalVars.length === 0 && invalidOptionalVars.length === 0;


let authConfigErrorMsg = '';
if (!isAuthConfigValid) {
  const messages = [];
  if (missingVars.length > 0) {
    messages.push(`Missing or placeholder environment variables: ${missingVars.join(', ')}`);
  }
  if (invalidFormatVars.length > 0) {
    messages.push(`Invalid UUID format: ${invalidFormatVars.join(', ')}`);
  }
  authConfigErrorMsg = messages.join('. ') + '.';
}
export { authConfigErrorMsg };


let optionalConfigWarningMsg = '';
if (!isOptionalConfigValid) {
  const messages = [];
  if (missingOptionalVars.length > 0) {
    messages.push(`Missing optional group variables: ${missingOptionalVars.join(', ')}`);
  }
  if (invalidOptionalVars.length > 0) {
    messages.push(`Invalid optional group UUID format: ${invalidOptionalVars.join(', ')}`);
  }
  optionalConfigWarningMsg = messages.join('. ') + '.';
}
export { optionalConfigWarningMsg };


const safeTenantId = (isGuid(rawTenantId) && !isPlaceholder(rawTenantId)) ? rawTenantId.trim() : '00000000-0000-0000-0000-000000000000';
const safeClientId = (isGuid(rawClientId) && !isPlaceholder(rawClientId)) ? rawClientId.trim() : '00000000-0000-0000-0000-000000000000';
const safeApiClientId = (isGuid(rawApiClientId) && !isPlaceholder(rawApiClientId)) ? rawApiClientId.trim() : '00000000-0000-0000-0000-000000000000';

export const msalConfig = {
  auth: {
    clientId:       safeClientId,
    authority:      `https://login.microsoftonline.com/${safeTenantId}`,
    redirectUri:    window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation:        'sessionStorage', 
    storeAuthStateInCookie: false,
  },
};


export const employeeLoginRequest = {
  scopes: [
    'openid',
    'profile',
    'email',
    `api://${safeApiClientId}/Customer.ReadWrite`,
  ],
};


export const apiTokenRequest = {
  scopes: [`api://${safeApiClientId}/Customer.ReadWrite`],
};


const safeCustomerClientId = (isGuid(rawCustomerClientId) && !isPlaceholder(rawCustomerClientId))
  ? rawCustomerClientId.trim()
  : safeClientId;


export const customerLoginRequest = {
  scopes: [
    'openid',
    'profile',
    'email',
    `api://${safeApiClientId}/Customer.Read`,
  ],
};


export const customerApiTokenRequest = {
  scopes: [`api://${safeApiClientId}/Customer.Read`],
};

export const CUSTOMER_CLIENT_ID = safeCustomerClientId;

export const AD_GROUPS = {
  BANK_ADMINS:       rawGroups.BANK_ADMINS,
  SECURITY_AUDITORS: rawGroups.SECURITY_AUDITORS,
  APP_DEVELOPERS:    rawGroups.APP_DEVELOPERS,
  DATA_ENGINEERS:    rawGroups.DATA_ENGINEERS,
};

