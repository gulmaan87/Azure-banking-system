import React from 'react';
import { Search, Bell } from 'lucide-react';

const Header = () => {
  return (
    <header className="header animate-slide-up">
      <div className="welcome">
        <h2>Welcome back, Gulmaan</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
          Here is your financial overview for today
        </p>
      </div>
      
      <div className="user-profile">
        <div className="search-bar">
          <Search size={18} color="var(--text-muted)" />
          <input type="text" placeholder="Search transactions, bills..." />
        </div>
        
        <div className="glass" style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer' }}>
          <Bell size={20} />
          <div style={{ position: 'absolute', top: 8, right: 10, width: 8, height: 8, background: 'var(--secondary)', borderRadius: '50%', border: '2px solid var(--bg-card)' }}></div>
        </div>
        
        <img 
          src="https://ui-avatars.com/api/?name=Mohdg+Gulmaan&background=6366f1&color=fff&rounded=true" 
          alt="User Profile" 
          className="avatar"
        />
      </div>
    </header>
  );
};

export default Header;
