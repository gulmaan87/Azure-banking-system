import React from 'react';
import { ArrowUpRight, ArrowDownRight, CreditCard, Filter, Download } from 'lucide-react';

const Accounts = () => {
  const accounts = [
    { id: 1, type: 'Checking', name: 'Main Operations Account', balance: '24,580.45', num: '**** 8492' },
    { id: 2, type: 'Savings', name: 'Reserve Fund', balance: '18,000.00', num: '**** 1120' },
    { id: 3, type: 'Investment', name: 'Azure Growth Portfolio', balance: '125,430.80', num: '**** 0944' }
  ];

  return (
    <div className="dashboard animate-slide-up delay-1">
      <div className="section-title" style={{ marginBottom: '24px' }}>
        <h2>My Accounts</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="action-btn" style={{ padding: '8px 16px', flexDirection: 'row', gap: '8px', borderRadius: '8px' }}>
            <Filter size={16} /> Filter
          </button>
          <button className="action-btn" style={{ padding: '8px 16px', flexDirection: 'row', gap: '8px', borderRadius: '8px', background: 'var(--primary)', borderColor: 'var(--primary)' }}>
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      <div className="grid-cards">
        {accounts.map((acc, i) => (
          <div key={acc.id} className="glass-panel balance-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '4px' }}>{acc.type}</div>
                <div style={{ fontWeight: 600, fontSize: '18px' }}>{acc.name}</div>
              </div>
              <CreditCard size={24} color="var(--primary)" />
            </div>
            
            <div className="balance-amount" style={{ fontSize: '32px', marginBottom: '16px' }}>
              <span className="currency">$</span>
              {acc.balance}
            </div>
            
            <div style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '14px' }}>
              {acc.num}
            </div>
          </div>
        ))}
      </div>

      <div className="glass-panel" style={{ padding: '28px', marginTop: '24px' }}>
        <div className="section-title">Account Analytics</div>
        <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '16px', marginTop: '32px' }}>
          {/* Mock Bar Chart */}
          {[40, 70, 45, 90, 60, 85, 100].map((h, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '100%', 
                height: `${h}%`, 
                background: i === 6 ? 'var(--primary)' : 'rgba(255,255,255,0.1)', 
                borderRadius: '8px 8px 0 0',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }} className="bar-hover" />
              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{'SMTWTFS'[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Accounts;
