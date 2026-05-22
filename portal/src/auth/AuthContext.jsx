/**
 * AuthContext.jsx
 * Provides employee auth state and customer auth state to component trees.
 *
 * Employee portal:  wrap with <AuthProvider>  → useAuthContext()
 * Customer portal:  wrap with <CustomerAuthProvider> → useCustomerAuthContext()
 */
import React, { createContext, useContext } from 'react';
import { useEmployeeAuth, useCustomerAuth } from '../auth/useAuth.js';

// ── Employee Context ──────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const auth = useEmployeeAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>');
  return ctx;
};

// ── Customer Context ──────────────────────────────────────────────────────────
const CustomerAuthContext = createContext(null);

export const CustomerAuthProvider = ({ children }) => {
  const auth = useCustomerAuth();
  return <CustomerAuthContext.Provider value={auth}>{children}</CustomerAuthContext.Provider>;
};

export const useCustomerAuthContext = () => {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error('useCustomerAuthContext must be used inside <CustomerAuthProvider>');
  return ctx;
};
