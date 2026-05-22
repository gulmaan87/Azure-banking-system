import React, { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Accounts from './components/Accounts';
import Transfers from './components/Transfers';
import AdminDashboard from './components/admin/AdminDashboard';
import Login from './components/Login';
import { AuthProvider, CustomerAuthProvider, useCustomerAuthContext } from './auth/AuthContext.jsx';

// ── Customer shell: wraps portal pages; requires CustomerAuthProvider ──────────
function CustomerShell({ setRole }) {
  const { isAuthenticated, login } = useCustomerAuthContext();
  const [activePage, setActivePage] = useState('dashboard');
  const isDev = import.meta.env.DEV;

  // In production, redirect unauthenticated customers to sign-in
  if (!isAuthenticated && !isDev) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100vh', gap: '16px',
        background: 'var(--bg-main)', color: 'var(--text-main)'
      }}>
        <h2>Customer Portal</h2>
        <p style={{ color: 'var(--text-muted)' }}>Please sign in to access your accounts.</p>
        <button
          onClick={login}
          style={{
            padding: '12px 24px', background: 'var(--primary)',
            border: 'none', borderRadius: '8px', color: 'white',
            fontSize: '14px', fontWeight: 600, cursor: 'pointer'
          }}
        >
          Sign in with Azure AD
        </button>
        <button
          onClick={() => setRole(null)}
          style={{
            background: 'transparent', border: 'none',
            color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px'
          }}
        >
          ← Back to gateway
        </button>
      </div>
    );
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard />;
      case 'accounts':  return <Accounts />;
      case 'transfers': return <Transfers />;
      default:          return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar activePage={activePage} setActivePage={setActivePage} setRole={setRole} />
      <main className="main-content">
        <Header />
        {renderPage()}
      </main>
    </div>
  );
}

function App() {
  const { accounts } = useMsal();
  const [role, setRole] = useState(null);

  // If MSAL has active accounts (employee logged in), auto-transition to Employee Portal
  useEffect(() => {
    if (accounts && accounts.length > 0) {
      setRole('employee');
    } else {
      setRole(prev => prev === 'employee' ? null : prev);
    }
  }, [accounts]);

  // Employee portal — isolated from customer context
  if (role === 'employee') {
    return (
      <AuthProvider>
        <AdminDashboard setRole={setRole} />
      </AuthProvider>
    );
  }

  // Customer portal AND gateway (Login) are both inside CustomerAuthProvider
  // so Login can call customerDevLogin() via useCustomerAuthContext()
  return (
    <CustomerAuthProvider>
      {!role
        ? <Login setRole={setRole} />
        : <CustomerShell setRole={setRole} />
      }
    </CustomerAuthProvider>
  );
}

export default App;
