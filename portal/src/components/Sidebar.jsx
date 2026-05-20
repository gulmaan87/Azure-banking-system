import React from 'react';
import { LayoutDashboard, Wallet, ArrowLeftRight, PieChart, CreditCard, Settings, LogOut, Shield, Server } from 'lucide-react';

const Sidebar = ({ activePage, setActivePage, setRole }) => {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <Shield size={20} />
        </div>
        Azure Bank
      </div>
      
      <nav className="nav-menu">
        <a href="#" className={`nav-item ${activePage === 'dashboard' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActivePage('dashboard'); }}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </a>
        <a href="#" className={`nav-item ${activePage === 'accounts' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActivePage('accounts'); }}>
          <Wallet size={20} />
          <span>Accounts</span>
        </a>
        <a href="#" className={`nav-item ${activePage === 'transfers' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActivePage('transfers'); }}>
          <ArrowLeftRight size={20} />
          <span>Transfers</span>
        </a>
        <a href="#" className="nav-item">
          <PieChart size={20} />
          <span>Investments</span>
        </a>
        <a href="#" className="nav-item">
          <CreditCard size={20} />
          <span>Cards</span>
        </a>
      </nav>

      <div style={{ marginTop: 'auto' }}>
        <nav className="nav-menu">
          <a href="#" className="nav-item">
            <Settings size={20} />
            <span>Settings</span>
          </a>
          <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); setRole(null); }} style={{ color: 'var(--danger)' }}>
            <LogOut size={20} />
            <span>Log out</span>
          </a>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
