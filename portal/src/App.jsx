import React, { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Accounts from './components/Accounts';
import Transfers from './components/Transfers';
import AdminDashboard from './components/admin/AdminDashboard';
import Login from './components/Login';
import { AuthProvider } from './auth/AuthContext.jsx';

function App() {
  const { accounts } = useMsal();
  const [role, setRole]           = useState(null);
  const [activePage, setActivePage] = useState('dashboard');

  // If MSAL has active accounts (user is logged in), automatically transition to Employee Portal
  useEffect(() => {
    if (accounts && accounts.length > 0) {
      setRole('employee');
    } else {
      // If employee is logged out from MSAL, reset role to show Gateway page
      setRole(prev => prev === 'employee' ? null : prev);
    }
  }, [accounts]);

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard />;
      case 'accounts':  return <Accounts />;
      case 'transfers': return <Transfers />;
      default:          return <Dashboard />;
    }
  };

  // No role selected yet → show gateway
  if (!role) {
    return <Login setRole={setRole} />;
  }

  // Employee portal — wrap with AuthProvider so all children can useAuthContext()
  if (role === 'employee') {
    return (
      <AuthProvider>
        <AdminDashboard setRole={setRole} />
      </AuthProvider>
    );
  }

  // Customer portal
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

export default App;
