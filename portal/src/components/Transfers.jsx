import React, { useState } from 'react';
import { Send, ArrowRight, User } from 'lucide-react';

const Transfers = () => {
  const [amount, setAmount] = useState('250.00');

  const contacts = [
    { name: 'Walter', role: 'Cloud Engineer', img: 'Walter' },
    { name: 'Jesse', role: 'Senior Engineer', img: 'Jesse' },
    { name: 'Hank', role: 'DevOps', img: 'Hank' },
    { name: 'Gomez', role: 'Automation', img: 'Gomez' }
  ];

  return (
    <div className="dashboard animate-slide-up delay-1">
      <div className="section-title" style={{ marginBottom: '24px' }}>
        <h2>Transfers</h2>
      </div>

      <div className="dashboard-grid">
        <div className="glass-panel" style={{ padding: '32px' }}>
          <h3 style={{ marginBottom: '24px' }}>Quick Transfer</h3>
          
          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '12px' }}>Amount</label>
            <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid var(--border)', paddingBottom: '8px' }}>
              <span style={{ fontSize: '32px', color: 'var(--text-muted)', marginRight: '8px' }}>$</span>
              <input 
                type="text" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  color: 'var(--text-main)', 
                  fontSize: '48px', 
                  fontWeight: '700', 
                  width: '100%',
                  outline: 'none',
                  fontFamily: 'var(--font-main)'
                }} 
              />
            </div>
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '16px' }}>Send to</label>
            <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
              <div style={{ 
                minWidth: '80px', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '8px',
                cursor: 'pointer'
              }}>
                <div style={{ 
                  width: '56px', height: '56px', borderRadius: '50%', 
                  background: 'rgba(255,255,255,0.05)', border: '1px dashed var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <User size={24} color="var(--text-muted)" />
                </div>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>New</span>
              </div>

              {contacts.map((contact, i) => (
                <div key={i} style={{ 
                  minWidth: '80px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '8px',
                  cursor: 'pointer'
                }}>
                  <img 
                    src={`https://ui-avatars.com/api/?name=${contact.img}&background=random&color=fff&rounded=true`} 
                    alt={contact.name}
                    style={{ width: '56px', height: '56px', borderRadius: '50%', border: i === 0 ? '2px solid var(--primary)' : '2px solid transparent' }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: i === 0 ? 600 : 400 }}>{contact.name}</span>
                </div>
              ))}
            </div>
          </div>

          <button style={{ 
            width: '100%', padding: '16px', borderRadius: '12px', 
            background: 'var(--primary)', color: 'white', border: 'none', 
            fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            cursor: 'pointer', transition: 'all 0.3s ease'
          }} className="transfer-btn">
            Send Money <ArrowRight size={20} />
          </button>
        </div>

        <div className="glass-panel" style={{ padding: '32px' }}>
          <h3 style={{ marginBottom: '24px' }}>Recent Transfers</h3>
          <div className="transaction-list">
            {[1, 2, 3].map(i => (
              <div key={i} className="transaction-item" style={{ padding: '12px' }}>
                <div className="tx-info">
                  <div className="tx-icon transfer">
                    <Send size={18} />
                  </div>
                  <div className="tx-details">
                    <h4>Sent to {contacts[i].name}</h4>
                    <p>Yesterday</p>
                  </div>
                </div>
                <div className="tx-amount">
                  -$120.00
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transfers;
