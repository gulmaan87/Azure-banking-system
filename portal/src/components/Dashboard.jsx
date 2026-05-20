import React from 'react';
import { ArrowUpRight, ArrowDownRight, CreditCard, Send, Plus, MoreHorizontal } from 'lucide-react';

const Dashboard = () => {
  const transactions = [
    { id: 1, name: 'Apple Store', date: 'Today, 14:24', amount: '-$1,299.00', type: 'expense', icon: '🍎' },
    { id: 2, name: 'Salary Deposit', date: 'Yesterday, 09:00', amount: '+$5,400.00', type: 'income', icon: '💼' },
    { id: 3, name: 'Netflix Subscription', date: 'Oct 24, 10:15', amount: '-$15.99', type: 'expense', icon: '🎬' },
    { id: 4, name: 'Transfer to Priya', date: 'Oct 22, 18:30', amount: '-$250.00', type: 'transfer', icon: '💸' },
  ];

  return (
    <div className="dashboard animate-slide-up delay-1">
      <div className="grid-cards">
        <div className="glass-panel balance-card">
          <div className="balance-label">Total Balance</div>
          <div className="balance-amount">
            <span className="currency">$</span>
            42,580.45
          </div>
          <div className="trend up">
            <div className="trend-badge">
              <ArrowUpRight size={14} /> +2.4%
            </div>
            <span style={{ color: 'var(--text-muted)' }}>vs last month</span>
          </div>
        </div>
        
        <div className="glass-panel balance-card" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.1))' }}>
          <div className="balance-label">Total Income</div>
          <div className="balance-amount">
            <span className="currency">$</span>
            14,200.00
          </div>
          <div className="trend up">
            <div className="trend-badge">
              <ArrowUpRight size={14} /> +5.1%
            </div>
          </div>
        </div>

        <div className="glass-panel balance-card" style={{ background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(244, 63, 94, 0.05))' }}>
          <div className="balance-label">Total Expenses</div>
          <div className="balance-amount">
            <span className="currency">$</span>
            3,840.20
          </div>
          <div className="trend down">
            <div className="trend-badge" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
              <ArrowDownRight size={14} /> -1.2%
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div className="section-title">
            Recent Transactions
            <a href="#" className="view-all">View All</a>
          </div>
          
          <div className="transaction-list">
            {transactions.map(tx => (
              <div key={tx.id} className="transaction-item">
                <div className="tx-info">
                  <div className={`tx-icon ${tx.type}`}>
                    <span style={{ fontSize: '20px' }}>{tx.icon}</span>
                  </div>
                  <div className="tx-details">
                    <h4>{tx.name}</h4>
                    <p>{tx.date}</p>
                  </div>
                </div>
                <div className={`tx-amount ${tx.type === 'income' ? 'income' : ''}`}>
                  {tx.amount}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '28px' }}>
            <div className="section-title" style={{ marginBottom: '16px' }}>
              My Card
              <MoreHorizontal size={20} color="var(--text-muted)" style={{ cursor: 'pointer' }}/>
            </div>
            <div style={{ 
              background: 'linear-gradient(135deg, #1e293b, #0f172a)', 
              borderRadius: '16px', 
              padding: '24px',
              border: '1px solid rgba(255,255,255,0.1)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'var(--primary)', opacity: 0.2, filter: 'blur(20px)' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
                <span style={{ fontWeight: 600, letterSpacing: '2px' }}>AZURE</span>
                <CreditCard size={24} />
              </div>
              <div style={{ fontSize: '20px', letterSpacing: '4px', marginBottom: '24px', fontFamily: 'monospace' }}>
                **** **** **** 4092
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '12px' }}>
                <div>
                  <div style={{ marginBottom: '4px' }}>Card Holder</div>
                  <div style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>Mohdg Gulmaan</div>
                </div>
                <div>
                  <div style={{ marginBottom: '4px' }}>Expires</div>
                  <div style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>12/28</div>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '28px' }}>
            <div className="section-title">Quick Actions</div>
            <div className="quick-actions">
              <div className="action-btn">
                <Send />
                Transfer
              </div>
              <div className="action-btn">
                <Plus />
                Top Up
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
