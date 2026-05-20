import React, { useState } from 'react';
import { Shield, User, Briefcase, Loader } from 'lucide-react';
import { useMsal } from '@azure/msal-react';
import { employeeLoginRequest } from '../auth/authConfig.js';
import './Login.css';

const Login = ({ setRole }) => {
  const { instance } = useMsal();
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const isDev = import.meta.env.DEV;

  const handleEmployeeLogin = async () => {
    setError('');
    setLoading(true);
    try {
      if (isDev) {
        // In dev mode: skip MSAL, go straight to admin panel
        setRole('employee');
      } else {
        // Production: real Azure AD popup login
        const result = await instance.loginPopup(employeeLoginRequest);
        // Store token so the API client can retrieve it
        sessionStorage.setItem('emp_token', result.accessToken);
        setRole('employee');
      }
    } catch (err) {
      if (err.errorCode !== 'user_cancelled') {
        setError(err.message || 'Authentication failed. Please try again.');
      }
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

          <button className="portal-btn employee" onClick={handleEmployeeLogin} disabled={loading}>
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
