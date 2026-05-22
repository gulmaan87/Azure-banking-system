import React from 'react';
import { Search, Bell, LogOut } from 'lucide-react';
import { useCustomerAuthContext } from '../auth/AuthContext.jsx';

const Header = () => {
  const { customer, logout } = useCustomerAuthContext();
  const firstName = customer?.name?.split(' ')[0] || 'there';
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(customer?.name || 'Customer')}&background=6366f1&color=fff&rounded=true`;

  return (
    <header className="header animate-slide-up">
      <div className="welcome">
        <h2>Welcome back, {firstName}</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
          Here is your financial overview for today
        </p>
      </div>

      <div className="user-profile">
        <div className="search-bar">
          <Search size={18} color="var(--text-muted)" />
          <input type="text" placeholder="Search transactions, accounts…" />
        </div>

        <div
          className="glass"
          style={{
            width: 40, height: 40, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', cursor: 'pointer'
          }}
        >
          <Bell size={20} />
          <div style={{
            position: 'absolute', top: 8, right: 10,
            width: 8, height: 8,
            background: 'var(--secondary)', borderRadius: '50%',
            border: '2px solid var(--bg-card)'
          }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src={avatarUrl}
            alt={customer?.name || 'Customer'}
            className="avatar"
          />
          <button
            onClick={logout}
            title="Sign out"
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--text-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', padding: '4px'
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
