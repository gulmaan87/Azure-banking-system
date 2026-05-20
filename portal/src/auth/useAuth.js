/**
 * useAuth.js — Custom hook for employee authentication
 * Wraps MSAL to provide login, logout, token acquisition, and role resolution.
 *
 * Usage:
 *   const { login, logout, role, employee, getToken, isAuthenticated } = useEmployeeAuth();
 */

import { useMsal } from '@azure/msal-react';
import { jwtDecode } from 'jwt-decode';
import { apiTokenRequest, employeeLoginRequest, AD_GROUPS } from './authConfig.js';
import { useCallback } from 'react';

const isDev = import.meta.env.DEV;

// ── Role resolver ─────────────────────────────────────────────────────────
const resolveRole = (groups = []) => {
  if (groups.includes(AD_GROUPS.BANK_ADMINS))       return 'ADMIN';
  if (groups.includes(AD_GROUPS.SECURITY_AUDITORS)) return 'AUDITOR';
  if (groups.includes(AD_GROUPS.APP_DEVELOPERS))    return 'DEVELOPER';
  if (groups.includes(AD_GROUPS.DATA_ENGINEERS))    return 'DATA';
  return null;
};

// ── Dev mock employee ──────────────────────────────────────────────────────
const DEV_EMPLOYEE = {
  name:  'Walter White (Dev)',
  email: 'walter@dev.local',
  role:  'ADMIN',
  upn:   'walter@dev.local',
};

// Helper to clear stuck MSAL interaction states to prevent "interaction_in_progress" errors
const clearMsalKeys = () => {
  [sessionStorage, localStorage].forEach(storage => {
    try {
      const keys = Object.keys(storage);
      keys.forEach(key => {
        if (key && (key.includes('interaction.status') || key.includes('msal.interaction.status'))) {
          storage.removeItem(key);
        }
      });
    } catch (e) {}
  });
};

export const useEmployeeAuth = () => {
  const { instance, accounts } = useMsal();
  const account = accounts[0];

  // ── In dev mode, skip real MSAL entirely ──────────────────────────────
  if (isDev && !account) {
    return {
      isAuthenticated: false,
      employee: null,
      role: null,
      login:  async () => {},   // login handled by Login component
      logout: async () => {},
      getToken: async () => 'dev-mock-token-admin',
    };
  }

  // Decode the idToken to extract groups and profile
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

  // Acquires access token silently (from cache or refresh token)
  const getToken = useCallback(async () => {
    if (isDev) return 'dev-mock-token-admin';
    try {
      const result = await instance.acquireTokenSilent({
        ...apiTokenRequest,
        account,
      });
      return result.accessToken;
    } catch (silentErr) {
      console.error("Silent token acquisition failed:", silentErr);
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

  return {
    isAuthenticated: !!account,
    employee,
    role: employee?.role || null,
    login,
    logout,
    getToken,
  };
};
