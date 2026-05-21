import React, { useState } from 'react';
import { Shield, User, Briefcase, Loader } from 'lucide-react';
import { useMsal } from '@azure/msal-react';
import { employeeLoginRequest, isAuthConfigValid, authConfigErrorMsg, isOptionalConfigValid, optionalConfigWarningMsg } from '../auth/authConfig.js';
import './Login.css';

const Login = ({ setRole }) => {
  const { instance } = useMsal();
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const isDev = import.meta.env.DEV;

  const handleEmployeeLogin = async () => {
    setError('');
    setLoading(true);

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
          // Ignore storage access errors
        }
      });
    };

    try {
      if (isDev) {
        // In dev mode: skip MSAL, go straight to admin panel
        setRole('employee');
      } else {
        // Clear any stuck MSAL interaction status in sessionStorage/localStorage to prevent "interaction_in_progress" errors
        clearMsalKeys();

        // Production: real Azure AD redirect login
        // Redirect-based flows are 100% reliable in production and bypass popup blockers entirely.
        await instance.loginRedirect(employeeLoginRequest);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card animate-slide-up">
        <div className="login-brand">
          <div className="login-icon">
            <Shield size={24} />
          </div>
          Azure Bank
        </div>
        <p className="login-subtitle">Secure Gateway — Select your portal</p>

        {error && (
          <div style={{
            padding: '12px 16px', background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px',
            color: 'var(--danger)', fontSize: '13px', marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        {!isAuthConfigValid && (
          <div style={{
            padding: '12px 16px', background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px',
            color: 'var(--danger)', fontSize: '13px', marginBottom: '16px',
            textAlign: 'left'
          }}>
            <strong style={{ display: 'block', marginBottom: '4px' }}>⚠️ Auth Config Error</strong>
            <span style={{ fontSize: '12px', wordBreak: 'break-word' }}>
              {authConfigErrorMsg}
            </span>
            {!isDev && (
              <strong style={{ display: 'block', marginTop: '8px', fontSize: '12px', color: '#f87171' }}>
                Employee login is disabled in production.
              </strong>
            )}
          </div>
        )}

        {isAuthConfigValid && !isOptionalConfigValid && (
          <div style={{
            padding: '12px 16px', background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px',
            color: '#f59e0b', fontSize: '13px', marginBottom: '16px',
            textAlign: 'left'
          }}>
            <strong style={{ display: 'block', marginBottom: '4px' }}>⚠️ Optional Config Warning</strong>
            <span style={{ fontSize: '12px', wordBreak: 'break-word' }}>
              {optionalConfigWarningMsg}
            </span>
          </div>
        )}

        {isDev && (
          <div style={{
            padding: '10px 14px', background: 'rgba(99,102,241,0.1)',
            border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px',
            color: '#818cf8', fontSize: '12px', marginBottom: '20px', textAlign: 'left'
          }}>
            <strong>Dev Mode</strong> — MSAL bypassed. Employee login uses mock token (Walter White / ADMIN).
            Add Azure AD credentials to <code>.env</code> for production auth.
          </div>
        )}

        <div className="portal-selection">
          <button className="portal-btn customer" onClick={() => setRole('customer')}>
            <div className="portal-btn-icon">
              <User size={24} />
            </div>
            <div className="portal-btn-content">
              <h3>Customer Portal</h3>
              <p>Manage your accounts and transfers</p>
            </div>
          </button>

          <button 
            className="portal-btn employee" 
            onClick={handleEmployeeLogin} 
            disabled={loading || (!isAuthConfigValid && !isDev)}
          >
            <div className="portal-btn-icon">
              {loading ? <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} /> : <Briefcase size={24} />}
            </div>
            <div className="portal-btn-content">
              <h3>Employee Portal</h3>
              <p>{loading ? 'Authenticating with Azure AD…' : 'Bank Staff & Management Only'}</p>
            </div>
          </button>
        </div>

        <p style={{ marginTop: '24px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
          Employee access requires an active Azure AD account.<br />
          Unauthorized access attempts are logged and monitored.
        </p>
      </div>
    </div>
  );
};

export default Login;

