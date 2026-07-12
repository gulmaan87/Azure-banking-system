










import { useMsal } from '@azure/msal-react';
import { jwtDecode } from 'jwt-decode';
import {
  apiTokenRequest,
  employeeLoginRequest,
  customerLoginRequest,
  customerApiTokenRequest,
  AD_GROUPS,
} from './authConfig.js';
import { useCallback, useState } from 'react';

const isDev = import.meta.env.DEV;


const resolveRole = (groups = []) => {
  if (AD_GROUPS.BANK_ADMINS       && groups.includes(AD_GROUPS.BANK_ADMINS))       return 'ADMIN';
  if (AD_GROUPS.SECURITY_AUDITORS && groups.includes(AD_GROUPS.SECURITY_AUDITORS)) return 'AUDITOR';
  if (AD_GROUPS.APP_DEVELOPERS    && groups.includes(AD_GROUPS.APP_DEVELOPERS))    return 'DEVELOPER';
  if (AD_GROUPS.DATA_ENGINEERS    && groups.includes(AD_GROUPS.DATA_ENGINEERS))    return 'DATA';
  return null;
};


const clearMsalKeys = () => {
  [sessionStorage, localStorage].forEach(storage => {
    try {
      const keys = Object.keys(storage);
      keys.forEach(key => {
        if (key && (key.includes('interaction.status') || key.includes('msal.interaction.status'))) {
          storage.removeItem(key);
        }
      });
    } catch {
      void 0;
    }
  });
};


export const useEmployeeAuth = () => {
  const { instance, accounts } = useMsal();
  const account = accounts[0];

  
  const employee = account ? (() => {
    const decoded = jwtDecode(account.idToken || '{}');
    const groups  = decoded.groups || [];
    return {
      name:  account.name,
      email: account.username,
      upn:   account.username,
      role:  resolveRole(groups),
      groups,
    };
  })() : null;

  
  const getToken = useCallback(async () => {
    if (isDev) return 'dev-mock-token-admin';
    try {
      const result = await instance.acquireTokenSilent({
        ...apiTokenRequest,
        account,
      });
      return result.accessToken;
    } catch (silentErr) {
      console.error('Silent token acquisition failed:', silentErr);
      clearMsalKeys();
      throw silentErr;
    }
  }, [instance, account]);

  const login = useCallback(async () => {
    clearMsalKeys();
    await instance.loginRedirect(employeeLoginRequest);
  }, [instance]);

  const logout = useCallback(async () => {
    sessionStorage.removeItem('emp_token');
    clearMsalKeys();
    await instance.logoutRedirect({ account });
  }, [instance, account]);

  
  if (isDev && !account) {
    return {
      isAuthenticated: false,
      employee: {
        name: 'Walter White',
        email: 'walter@cook.com',
        role: 'ADMIN',
      },
      role: 'ADMIN',
      login:    async () => {},   
      logout:   async () => {},
      getToken: async () => 'dev-mock-token-admin',
    };
  }

  return {
    isAuthenticated: !!account,
    employee,
    role: employee?.role || null,
    login,
    logout,
    getToken,
  };
};


export const MOCK_CUSTOMERS = [
  { id: 'CUS-1001', name: 'Walter White',   email: 'walter@mohdgulman87outlook.onmicrosoft.com' },
  { id: 'CUS-1002', name: 'Jesse Pinkman',  email: 'jesse@mohdgulman87outlook.onmicrosoft.com' },
  { id: 'CUS-1003', name: 'Gustavo Fring',  email: 'gus@mohdgulman87outlook.onmicrosoft.com' },
  { id: 'CUS-1004', name: 'Jane Margolis',  email: 'jane@mohdgulman87outlook.onmicrosoft.com' },
];


export const useCustomerAuth = () => {
  const { instance, accounts } = useMsal();

  
  const [devCustomer, setDevCustomer] = useState(() => {
    const stored = sessionStorage.getItem('dev_customer_id');
    return MOCK_CUSTOMERS.find(c => c.id === stored) || null;
  });

  const devGetToken = useCallback(async () => {
    if (!devCustomer) throw new Error('No customer selected');
    return `dev-mock-token-customer-${devCustomer.id}`;
  }, [devCustomer]);

  const devLogin = useCallback((customerId) => {
    const found = MOCK_CUSTOMERS.find(c => c.id === customerId);
    if (found) {
      sessionStorage.setItem('dev_customer_id', found.id);
      setDevCustomer(found);
    }
  }, []);

  const devLogout = useCallback(() => {
    sessionStorage.removeItem('dev_customer_id');
    setDevCustomer(null);
  }, []);

  if (isDev) {
    return {
      isAuthenticated: !!devCustomer,
      customer: devCustomer,
      login:    devLogin,
      logout:   devLogout,
      getToken: devGetToken,
    };
  }

  
  const account = accounts[0];
  const customer = account ? {
    name:  account.name,
    email: account.username,
  } : null;

  const getToken = useCallback(async () => {
    if (!account) throw new Error('Not authenticated');
    try {
      const result = await instance.acquireTokenSilent({
        ...customerApiTokenRequest,
        account,
      });
      return result.accessToken;
    } catch (err) {
      console.error('[CustomerAuth] Silent token acquisition failed:', err);
      clearMsalKeys();
      throw err;
    }
  }, [instance, account]);

  const login = useCallback(async () => {
    clearMsalKeys();
    await instance.loginRedirect(customerLoginRequest);
  }, [instance]);

  const logout = useCallback(async () => {
    clearMsalKeys();
    await instance.logoutRedirect({ account });
  }, [instance, account]);

  return {
    isAuthenticated: !!account,
    customer,
    login,
    logout,
    getToken,
  };
};
