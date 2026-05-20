/**
 * AuthContext.jsx
 * Provides employee auth state (role, employee profile, getToken)
 * to any component in the tree without prop-drilling.
 */
import React, { createContext, useContext } from 'react';
import { useEmployeeAuth } from '../auth/useAuth.js';

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
