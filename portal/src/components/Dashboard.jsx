import React, { useEffect, useState, useCallback } from 'react';
import { ArrowUpRight, ArrowDownRight, CreditCard, Send, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { useCustomerAuthContext } from '../auth/AuthContext.jsx';
import { createApi } from '../services/api.js';

// Formats a number as currency
const fmt = (n) => {
  if (n === null || n === undefined) return '—';
  return parseFloat(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Relative time formatter
const relTime = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1)  return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const TX_ICONS = { Transfer: '💸', Credit: '💰', Debit: '💳', Deposit: '📥', Withdrawal: '💵' };

const Dashboard = () => {
  const { customer, getToken } = useCustomerAuthContext();
  const [accounts,     setAccounts]     = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  const totalBalance = accounts.reduce((sum, a) => sum + parseFloat(a.balance || 0), 0);
  const totalCredits = transactions
    .filter(t => ['Credit','Deposit'].includes(t.type))
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const totalDebits  = transactions
    .filter(t => ['Debit','Withdrawal','Transfer'].includes(t.type))
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

  const load = useCallback(async () => {
    if (!customer?.id) return;
    setLoading(true);
    setError(null);
    try {
      const api = createApi(getToken);
      const [accsRes, txRes] = await Promise.all([
        api.accounts.getByCustomer(customer.id),
        api.transactions.getByCustomer(customer.id, 10),
      ]);
      setAccounts(accsRes.data || []);
      setTransactions(txRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [customer?.id, getToken]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="dashboard animate-slide-up delay-1" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
          <p>Loading your accounts…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard animate-slide-up delay-1" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--danger)' }}>
          <AlertCircle size={32} style={{ marginBottom: '12px' }} />
          <p>{error}</p>
          <button onClick={load} style={{ marginTop: '12px', padding: '8px 16px', background: 'var(--primary)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard animate-slide-up delay-1">
      {/* Welcome line */}
      {customer?.name && (
        <div style={{ marginBottom: '8px', color: 'var(--text-muted)', fontSize: '14px' }}>
          Welcome back, <strong style={{ color: 'var(--text-main)' }}>{customer.name}</strong>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid-cards">
        <div className="glass-panel balance-card">
          <div className="balance-label">Total Balance</div>
          <div className="balance-amount">
            <span className="currency">$</span>
            {fmt(totalBalance)}
          </div>
          <div className="trend up">
            <div className="trend-badge">
              <ArrowUpRight size={14} /> {accounts.length} account{accounts.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        <div className="glass-panel balance-card" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1))' }}>
          <div className="balance-label">Total Credits</div>
          <div className="balance-amount">
            <span className="currency">$</span>
            {fmt(totalCredits)}
          </div>
          <div className="trend up">
            <div className="trend-badge">
              <ArrowUpRight size={14} /> Deposits & credits
            </div>
          </div>
        </div>

        <div className="glass-panel balance-card" style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(244,63,94,0.05))' }}>
          <div className="balance-label">Total Debits</div>
          <div className="balance-amount">
            <span className="currency">$</span>
            {fmt(totalDebits)}
          </div>
          <div className="trend down">
            <div className="trend-badge" style={{ background: 'rgba(239,68,68,0.1)' }}>
              <ArrowDownRight size={14} /> Transfers & debits
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Recent Transactions */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div className="section-title">
            Recent Transactions
            <button onClick={load} title="Refresh" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
              <RefreshCw size={16} />
            </button>
          </div>

          {transactions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '16px' }}>No transactions yet.</p>
          ) : (
            <div className="transaction-list">
              {transactions.map(tx => {
                const isCredit = ['Credit','Deposit'].includes(tx.type);
                return (
                  <div key={tx.id} className="transaction-item">
                    <div className="tx-info">
                      <div className={`tx-icon ${isCredit ? 'income' : 'expense'}`}>
                        <span style={{ fontSize: '20px' }}>{TX_ICONS[tx.type] || '🔄'}</span>
                      </div>
                      <div className="tx-details">
                        <h4>{tx.description || tx.type}</h4>
                        <p>{tx.account_type ? `${tx.account_type} · ` : ''}{relTime(tx.created_at)}</p>
                      </div>
                    </div>
                    <div className={`tx-amount ${isCredit ? 'income' : ''}`}>
                      {isCredit ? '+' : '-'}${fmt(tx.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column: accounts summary + quick actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '28px' }}>
            <div className="section-title" style={{ marginBottom: '16px' }}>
              My Accounts
            </div>
            {accounts.map(acc => (
              <div key={acc.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 0', borderBottom: '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CreditCard size={18} color="var(--primary)" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{acc.account_type}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'monospace' }}>
                      {acc.id}
                    </div>
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>
                  ${fmt(acc.balance)} <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{acc.currency || 'USD'}</span>
                </div>
              </div>
            ))}
            {accounts.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px' }}>No accounts found.</p>
            )}
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
