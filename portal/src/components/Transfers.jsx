import React, { useState, useEffect, useCallback } from 'react';
import { Send, ArrowRight, CheckCircle, AlertCircle, RefreshCw, X } from 'lucide-react';
import { useCustomerAuthContext } from '../auth/AuthContext.jsx';
import { createApi } from '../services/api.js';

const fmt = (n) => {
  if (n === null || n === undefined) return '—';
  return parseFloat(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};


const Toast = ({ toast, onClose }) => {
  if (!toast) return null;
  const isSuccess = toast.type === 'success';
  return (
    <div style={{
      position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '16px 20px', borderRadius: '12px', maxWidth: '380px',
      background: isSuccess ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
      border: `1px solid ${isSuccess ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      backdropFilter: 'blur(12px)',
      animation: 'slideInRight 0.3s ease',
    }}>
      {isSuccess
        ? <CheckCircle size={20} color="#10b981" />
        : <AlertCircle size={20} color="#ef4444" />
      }
      <span style={{ flex: 1, fontSize: '14px', color: 'var(--text-main)' }}>{toast.message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}>
        <X size={16} />
      </button>
    </div>
  );
};

const Transfers = () => {
  const { customer, getToken } = useCustomerAuthContext();
  const [accounts,      setAccounts]      = useState([]);
  const [recentTxs,     setRecentTxs]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [submitting,    setSubmitting]    = useState(false);
  const [toast,         setToast]         = useState(null);

  
  const [fromAccount,   setFromAccount]   = useState('');
  const [toAccount,     setToAccount]     = useState('');
  const [amount,        setAmount]        = useState('');
  const [description,   setDescription]  = useState('');
  const [fieldErrors,   setFieldErrors]   = useState({});

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const loadData = useCallback(async () => {
    if (!customer?.id) return;
    setLoading(true);
    try {
      const api = createApi(getToken);
      const [accsRes, txRes] = await Promise.all([
        api.accounts.getByCustomer(customer.id),
        api.transactions.getByCustomer(customer.id, 10),
      ]);
      const accs = accsRes.data || [];
      setAccounts(accs);
      setRecentTxs((txRes.data || []).filter(t => t.type === 'Transfer'));
      if (accs.length > 0 && !fromAccount) setFromAccount(accs[0].id);
    } catch (err) {
      showToast(err.message || 'Failed to load accounts', 'error');
    } finally {
      setLoading(false);
    }
  }, [customer?.id, getToken]);

  useEffect(() => { loadData(); }, [loadData]);

  const validate = () => {
    const errors = {};
    const amt = parseFloat(amount);
    if (!fromAccount) errors.fromAccount = 'Select a source account';
    if (!toAccount || toAccount === fromAccount) {
      errors.toAccount = toAccount === fromAccount
        ? 'Destination must be different from source'
        : 'Enter destination account ID';
    }
    if (!amount || isNaN(amt) || amt <= 0)    errors.amount = 'Enter a valid positive amount';
    if (amt > 100000)                          errors.amount = 'Single transfer cannot exceed $100,000';
    const srcAcc = accounts.find(a => a.id === fromAccount);
    if (srcAcc && amt > parseFloat(srcAcc.balance || 0)) {
      errors.amount = `Insufficient balance. Available: $${fmt(srcAcc.balance)}`;
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const api = createApi(getToken);
      const srcAcc = accounts.find(a => a.id === fromAccount);
      await api.transactions.create({
        account_id:   fromAccount,
        customer_id:  customer.id,
        type:         'Transfer',
        amount:       parseFloat(amount),
        counterparty: toAccount,
        description:  description || `Transfer to ${toAccount}`,
      });

      showToast(`$${fmt(amount)} transferred successfully!`, 'success');

      
      setAmount('');
      setToAccount('');
      setDescription('');
      setFieldErrors({});

      
      await loadData();
    } catch (err) {
      showToast(err.message || 'Transfer failed. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const srcAccount = accounts.find(a => a.id === fromAccount);

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

  return (
    <div className="dashboard animate-slide-up delay-1">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="section-title" style={{ marginBottom: '24px' }}>
        <h2>Transfers</h2>
        <button
          onClick={loadData}
          style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="dashboard-grid">
        
        <div className="glass-panel" style={{ padding: '32px' }}>
          <h3 style={{ marginBottom: '24px' }}>New Transfer</h3>

          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
              <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '8px', fontSize: '13px' }}>
                  Amount
                </label>
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: `2px solid ${fieldErrors.amount ? 'var(--danger)' : 'var(--border)'}`, paddingBottom: '8px' }}>
                  <span style={{ fontSize: '28px', color: 'var(--text-muted)', marginRight: '8px' }}>$</span>
                  <input
                    type="number"
                    min="0.01" step="0.01"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    style={{
                      background: 'transparent', border: 'none',
                      color: 'var(--text-main)', fontSize: '40px', fontWeight: '700',
                      width: '100%', outline: 'none', fontFamily: 'var(--font-main)'
                    }}
                  />
                </div>
                {fieldErrors.amount && <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '6px' }}>{fieldErrors.amount}</p>}
                {srcAccount && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '6px' }}>
                    Available: <strong>${fmt(srcAccount.balance)}</strong>
                  </p>
                )}
              </div>

              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '8px', fontSize: '13px' }}>
                  From Account
                </label>
                <select
                  value={fromAccount}
                  onChange={e => setFromAccount(e.target.value)}
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${fieldErrors.fromAccount ? 'var(--danger)' : 'var(--border)'}`,
                    borderRadius: '8px', color: 'var(--text-main)',
                    padding: '10px 14px', fontSize: '14px',
                  }}
                >
                  {accounts.filter(a => !a.is_frozen).map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.account_type} — {acc.id} (${fmt(acc.balance)})
                    </option>
                  ))}
                </select>
                {fieldErrors.fromAccount && <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '6px' }}>{fieldErrors.fromAccount}</p>}
              </div>

              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '8px', fontSize: '13px' }}>
                  To Account ID
                </label>
                <input
                  type="text"
                  value={toAccount}
                  onChange={e => setToAccount(e.target.value.toUpperCase())}
                  placeholder="e.g. ACC-12345"
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${fieldErrors.toAccount ? 'var(--danger)' : 'var(--border)'}`,
                    borderRadius: '8px', color: 'var(--text-main)',
                    padding: '10px 14px', fontSize: '14px', boxSizing: 'border-box'
                  }}
                />
                {fieldErrors.toAccount && <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '6px' }}>{fieldErrors.toAccount}</p>}
              </div>

              
              <div style={{ marginBottom: '28px' }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '8px', fontSize: '13px' }}>
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What's this transfer for?"
                  maxLength={200}
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border)', borderRadius: '8px',
                    color: 'var(--text-main)', padding: '10px 14px',
                    fontSize: '14px', boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting || accounts.length === 0}
                style={{
                  width: '100%', padding: '16px', borderRadius: '12px',
                  background: submitting ? 'rgba(99,102,241,0.5)' : 'var(--primary)',
                  color: 'white', border: 'none',
                  fontSize: '16px', fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease'
                }}
                className="transfer-btn"
              >
                {submitting
                  ? <><RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> Processing…</>
                  : <>Send Money <ArrowRight size={20} /></>
                }
              </button>

              {accounts.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginTop: '12px' }}>
                  You have no active accounts to transfer from.
                </p>
              )}
            </form>
          )}
        </div>

        
        <div className="glass-panel" style={{ padding: '32px' }}>
          <h3 style={{ marginBottom: '24px' }}>Recent Transfers</h3>
          {recentTxs.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
              <Send size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
              <p style={{ fontSize: '14px' }}>No transfers yet.</p>
            </div>
          ) : (
            <div className="transaction-list">
              {recentTxs.map(tx => (
                <div key={tx.id} className="transaction-item" style={{ padding: '12px' }}>
                  <div className="tx-info">
                    <div className="tx-icon transfer" style={{ background: 'rgba(99,102,241,0.15)' }}>
                      <Send size={18} color="var(--primary)" />
                    </div>
                    <div className="tx-details">
                      <h4>{tx.description || 'Transfer'}</h4>
                      <p style={{ fontSize: '12px' }}>
                        {tx.account_type && `${tx.account_type} · `}
                        {tx.counterparty && `→ ${tx.counterparty} · `}
                        {relTime(tx.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="tx-amount" style={{ color: 'var(--danger)' }}>
                    -${fmt(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Transfers;
