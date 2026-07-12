











import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity, ArrowUpRight, ArrowDownRight, RefreshCw, Search,
  Filter, AlertTriangle, DollarSign, List, ShieldAlert
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { createApi } from '../../services/api.js';
import { useAuthContext } from '../../auth/AuthContext.jsx';
import './TransactionsDashboard.css';

const fmtCurrency = (num) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num || 0);
const fmtDate = (iso) => iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtChartDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

const TransactionsDashboard = () => {
  const { getToken } = useAuthContext();
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  
  const [page, setPage] = useState(1);
  const limit = 50;
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    minAmount: '',
    flagged: false
  });

  const fetchStats = useCallback(async () => {
    try {
      const api = createApi(getToken);
      const res = await api.transactions.getStats();
      if (res && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error("Failed to load transaction stats", err);
    }
  }, [getToken]);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const api = createApi(getToken);
      const offset = (page - 1) * limit;
      const res = await api.transactions.getAll({
        limit,
        offset,
        search: filters.search,
        type: filters.type,
        minAmount: filters.minAmount,
        flagged: filters.flagged ? 'true' : ''
      });
      if (res) {
        setTransactions(res.data || []);
        setTotal(res.total || 0);
      }
    } catch (err) {
      console.error("Failed to load transactions", err);
    } finally {
      setLoading(false);
    }
  }, [getToken, page, limit, filters]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setPage(1); 
  };

  const chartData = useMemo(() => {
    if (!stats?.daily) return [];
    return stats.daily.map(d => ({
      date: fmtChartDate(d.date),
      volume: parseFloat(d.total_volume) || 0,
      count: d.tx_count
    }));
  }, [stats]);

  return (
    <div className="tx-dashboard">
      <div className="tx-header">
        <div>
          <h1 className="tx-title"><Activity size={24} /> Transactions & Flow</h1>
          <p className="tx-subtitle">Monitor global transaction volume, limits, and real-time AML flags.</p>
        </div>
        <button className="tx-refresh-btn" onClick={() => { fetchStats(); fetchTransactions(); }}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      
      <div className="tx-stats-row">
        <div className="tx-stat-card">
          <div className="tx-stat-title"><DollarSign size={14} color="#10b981" /> Today's Volume</div>
          <div className="tx-stat-value" style={{ color: '#10b981' }}>{fmtCurrency(stats?.today?.volume)}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Across {stats?.today?.tx_count || 0} transactions
          </div>
        </div>
        <div className="tx-stat-card">
          <div className="tx-stat-title"><Activity size={14} color="#6366f1" /> Largest Transfer Today</div>
          <div className="tx-stat-value" style={{ color: '#6366f1' }}>{fmtCurrency(stats?.today?.largest_tx)}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Warning threshold: {fmtCurrency(stats?.limits?.singleWarnThreshold)}
          </div>
        </div>
        <div className="tx-stat-card">
          <div className="tx-stat-title"><ShieldAlert size={14} color="#ef4444" /> Active AML Flags</div>
          <div className="tx-stat-value" style={{ color: '#ef4444' }}>{stats?.flaggedCount || 0}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Pending review this week
          </div>
        </div>
      </div>

      <div className="tx-content">
        <div className="tx-main-col">
          
          <div className="tx-chart-card">
            <div style={{ marginBottom: '12px', fontWeight: 600, color: 'var(--text-muted)', fontSize: '13px' }}>
              30-Day Transaction Volume (USD)
            </div>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="date" stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e1e2d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#10b981' }}
                  formatter={(value) => [fmtCurrency(value), 'Volume']}
                />
                <Bar dataKey="volume" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          
          <div className="tx-table-container">
            <div className="tx-filters">
              <div className="tx-filter-group" style={{ flex: 1, minWidth: '200px' }}>
                <Search size={14} color="#888" />
                <input type="text" name="search" placeholder="Search ID, Account, or Name..." value={filters.search} onChange={handleFilterChange} style={{ width: '100%' }} />
              </div>
              <div className="tx-filter-group">
                <Filter size={14} color="#888" />
                <select name="type" value={filters.type} onChange={handleFilterChange}>
                  <option value="">All Types</option>
                  <option value="Credit">Credit</option>
                  <option value="Debit">Debit</option>
                  <option value="Transfer">Transfer</option>
                  <option value="Deposit">Deposit</option>
                  <option value="Withdrawal">Withdrawal</option>
                </select>
              </div>
              <div className="tx-filter-group">
                <DollarSign size={14} color="#888" />
                <input type="number" name="minAmount" placeholder="Min Amount" value={filters.minAmount} onChange={handleFilterChange} style={{ width: '90px' }} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-main)', cursor: 'pointer' }}>
                <input type="checkbox" name="flagged" checked={filters.flagged} onChange={handleFilterChange} />
                <AlertTriangle size={14} color={filters.flagged ? '#ef4444' : '#888'} /> Flagged Only
              </label>
            </div>

            <table className="tx-table">
              <thead>
                <tr>
                  <th>Time / ID</th>
                  <th>Customer / Account</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Counterparty</th>
                  <th>Flags</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#888' }}>Loading transactions...</td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#888' }}>No transactions found.</td></tr>
                ) : transactions.map(tx => {
                  const isPositive = ['Credit','Deposit'].includes(tx.type);
                  return (
                    <tr key={tx.id}>
                      <td>
                        <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '2px' }}>{fmtDate(tx.created_at)}</div>
                        <div style={{ fontFamily: 'monospace', color: '#888' }}>{tx.id.substring(0,8)}...</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{tx.customer_name}</div>
                        <div style={{ fontFamily: 'monospace', color: '#818cf8', fontSize: '11px' }}>{tx.account_id}</div>
                      </td>
                      <td>
                        <span className={`tx-type type-${tx.type}`}>{tx.type}</span>
                      </td>
                      <td className={`tx-amount ${isPositive ? 'positive' : 'negative'}`}>
                        {isPositive ? '+' : '-'}{fmtCurrency(tx.amount)}
                      </td>
                      <td>
                        {tx.counterparty ? (
                          <div>
                            <div>{tx.counterparty}</div>
                            {tx.country && <div style={{ fontSize: '10px', color: '#888' }}>{tx.country}</div>}
                          </div>
                        ) : <span style={{ color: '#555' }}>—</span>}
                      </td>
                      <td>
                        {tx.flag_id ? (
                          <span className="aml-flag-badge" title={tx.flag_type}>
                            <AlertTriangle size={10} /> {tx.aml_risk} Risk
                          </span>
                        ) : (
                          <span style={{ color: '#555' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            
            <div className="pagination">
              <span style={{ fontSize: '12px', color: '#888' }}>
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} transactions
              </span>
              <div className="page-btns">
                <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
                <button className="page-btn" disabled={page * limit >= total} onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionsDashboard;
