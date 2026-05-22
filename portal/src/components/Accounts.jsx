import React, { useEffect, useState, useCallback } from 'react';
import { CreditCard, RefreshCw, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { useCustomerAuthContext } from '../auth/AuthContext.jsx';
import { createApi } from '../services/api.js';

const fmt = (n) => {
  if (n === null || n === undefined) return '—';
  return parseFloat(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const ACCOUNT_GRADIENTS = [
  'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1))',
  'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.05))',
  'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.05))',
  'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(244,63,94,0.05))',
];

const Accounts = () => {
  const { customer, getToken } = useCustomerAuthContext();
  const [accounts,     setAccounts]     = useState([]);
  const [transactions, setTransactions] = useState({});
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  const load = useCallback(async () => {
    if (!customer?.id) return;
    setLoading(true);
    setError(null);
    try {
      const api = createApi(getToken);
      const accsRes = await api.accounts.getByCustomer(customer.id);
      const accs = accsRes.data || [];
      setAccounts(accs);

      // Fetch last 5 transactions per account for mini-charts
      const txMap = {};
      await Promise.all(accs.map(async acc => {
        try {
          const txRes = await api.transactions.getByAccount(acc.id, 5);
          txMap[acc.id] = txRes.data || [];
        } catch {
          txMap[acc.id] = [];
        }
      }));
      setTransactions(txMap);
    } catch (err) {
      setError(err.message || 'Failed to load accounts');
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
          <p>Loading accounts…</p>
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
      <div className="section-title" style={{ marginBottom: '24px' }}>
        <h2>My Accounts</h2>
        <button
          onClick={load}
          style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {accounts.length === 0 ? (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <CreditCard size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
          <p>No accounts found. Contact your bank to open an account.</p>
        </div>
      ) : (
        <div className="grid-cards">
          {accounts.map((acc, i) => {
            const accTxs = transactions[acc.id] || [];
            const hasPositiveTrend = accTxs.some(t => ['Credit','Deposit'].includes(t.type));
            return (
              <div key={acc.id} className="glass-panel balance-card" style={{ padding: '24px', background: ACCOUNT_GRADIENTS[i % ACCOUNT_GRADIENTS.length] }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '4px' }}>
                      {acc.account_type}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '16px' }}>{acc.id}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '3px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      {acc.currency || 'USD'}
                    </span>
                    <CreditCard size={20} color="var(--primary)" />
                  </div>
                </div>

                <div className="balance-amount" style={{ fontSize: '32px', marginBottom: '16px' }}>
                  <span className="currency">$</span>
                  {fmt(acc.balance)}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                    {acc.is_frozen ? (
                      <span style={{ color: 'var(--danger)' }}>🔒 Account Frozen</span>
                    ) : (
                      <span style={{ color: 'var(--success, #10b981)' }}>✓ Active</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: hasPositiveTrend ? '#10b981' : 'var(--text-muted)' }}>
                    {hasPositiveTrend ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    <span>{accTxs.length} recent tx</span>
                  </div>
                </div>

                {/* Mini transaction list */}
                {accTxs.length > 0 && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {accTxs.slice(0, 3).map(tx => {
                      const isCredit = ['Credit','Deposit'].includes(tx.type);
                      return (
                        <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{tx.description || tx.type}</span>
                          <span style={{ color: isCredit ? '#10b981' : 'var(--danger)', fontWeight: 600 }}>
                            {isCredit ? '+' : '-'}${fmt(tx.amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Balance bar chart */}
      {accounts.length > 1 && (
        <div className="glass-panel" style={{ padding: '28px', marginTop: '24px' }}>
          <div className="section-title" style={{ marginBottom: '24px' }}>Balance Distribution</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', height: '120px' }}>
            {accounts.map((acc, i) => {
              const maxBal = Math.max(...accounts.map(a => parseFloat(a.balance || 0)), 1);
              const pct = (parseFloat(acc.balance || 0) / maxBal) * 100;
              return (
                <div key={acc.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>${fmt(acc.balance)}</div>
                  <div style={{
                    width: '100%', height: `${Math.max(pct, 5)}%`,
                    background: `var(--primary)`,
                    opacity: 0.7 + (i * 0.1),
                    borderRadius: '6px 6px 0 0',
                    transition: 'height 0.5s ease',
                  }} />
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px', textAlign: 'center' }}>{acc.account_type}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounts;
