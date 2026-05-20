/**
 * useAuth.js — Custom hook for employee authentication
 * Wraps MSAL to provide login, logout, token acquisition, and role resolution.
 *
 * Usage:
 *   const { login, logout, role, employee, getToken, isAuthenticated } = useEmployeeAuth();
 */

import { useMsal } from '@azure/msal-react';
import { jwtDecode } from 'jwt-decode';
import { apiTokenRequest, AD_GROUPS } from './authConfig.js';
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
    } catch {
      // Silent acquire failed — trigger interactive login
      const result = await instance.acquireTokenPopup(apiTokenRequest);
      return result.accessToken;
    }
  }, [instance, account]);

  const login = useCallback(async () => {
    await instance.loginPopup(apiTokenRequest);
  }, [instance]);

  const logout = useCallback(async () => {
    sessionStorage.removeItem('emp_token');
    await instance.logoutPopup({ account });
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
