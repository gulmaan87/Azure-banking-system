/**
 * AuditTrail.jsx — Admin portal view of the SQL audit_log table
 *
 * Shows a searchable, filterable table of every action performed by every employee.
 * Colour-coded by action type. Links to Sentinel for deep investigation.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Search, RefreshCw, ExternalLink, AlertTriangle, Download } from 'lucide-react';
import { createApi } from '../../services/api.js';
import { useAuthContext } from '../../auth/AuthContext.jsx';
import './AuditTrail.css';

const ACTION_CONFIG = {
  CREATE_CUSTOMER:   { color: '#10b981', label: 'Created',    group: 'customer' },
  UPDATE_CUSTOMER:   { color: '#6366f1', label: 'Updated',    group: 'customer' },
  UPDATE_RISK_LEVEL: { color: '#f59e0b', label: 'Risk Level', group: 'customer' },
  DELETE_CUSTOMER:   { color: '#ef4444', label: 'Deleted',    group: 'customer' },
  FREEZE_ACCOUNT:    { color: '#f97316', label: 'Frozen',     group: 'account'  },
  UNFREEZE_ACCOUNT:  { color: '#10b981', label: 'Unfrozen',   group: 'account'  },
  FLAG_CUSTOMER:     { color: '#ef4444', label: 'Flagged',    group: 'aml'      },
  AML_FLAG:          { color: '#991b1b', label: 'AML Flag',   group: 'aml'      },
  CREATE_TRANSACTION:{ color: '#6366f1', label: 'Transaction', group: 'txn'     },
  KYC_SUBMIT:        { color: '#06b6d4', label: 'KYC Submit', group: 'kyc'      },
  KYC_APPROVED:      { color: '#10b981', label: 'KYC ✓',      group: 'kyc'      },
  KYC_REJECTED:      { color: '#ef4444', label: 'KYC ✗',      group: 'kyc'      },
};

const formatTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-GB', { hour12: false, timeZone: 'UTC' }) + ' UTC';
};

const AuditTrail = () => {
  const { getToken } = useAuthContext();
  const [logs,     setLogs]     = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('all');   // action group filter
  const [page,     setPage]     = useState(1);
  const PAGE_SIZE = 25;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const api = createApi(getToken);
      const res = await api.get('/audit');
      setLogs(res.data.data || []);
    } catch (err) {
      // If API doesn't exist yet, show mock data so the UI is visible
      if (err?.response?.status === 404 || err?.code === 'ERR_NETWORK') {
        setLogs(MOCK_LOGS);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Client-side filter + search
  const filtered = logs.filter(log => {
    const matchSearch = !search || [log.action, log.entity_id, log.performed_by, log.ip_address]
      .some(f => f?.toLowerCase().includes(search.toLowerCase()));
    const matchFilter = filter === 'all' || ACTION_CONFIG[log.action]?.group === filter;
    return matchSearch && matchFilter;
  });

  const pages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const exportCSV = () => {
    const header = 'Timestamp,Action,Entity Type,Entity ID,Performed By,IP Address';
    const rows = filtered.map(l =>
      `"${l.created_at}","${l.action}","${l.entity_type}","${l.entity_id}","${l.performed_by}","${l.ip_address || ''}"`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'audit_log.csv'; a.click();
  };

  return (
    <div className="audit-trail">
      {/* Header */}
      <div className="audit-header">
        <div>
          <h1 className="audit-title">
            <Shield size={22} />
            Audit Trail
          </h1>
          <p className="audit-subtitle">
            Every staff action logged to SQL + Azure Sentinel.
            {' '}<a href="https://portal.azure.com/#blade/Microsoft_Azure_Security_Insights" target="_blank" rel="noreferrer" className="sentinel-link">
              Open in Sentinel <ExternalLink size={12} />
            </a>
          </p>
        </div>
        <div className="audit-actions">
          <button className="audit-btn" onClick={exportCSV} title="Export CSV">
            <Download size={15} /> Export
          </button>
          <button className="audit-btn" onClick={fetchLogs} title="Refresh">
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="audit-filters">
        <div className="search-box">
          <Search size={14} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search action, entity ID, employee…"
          />
        </div>
        <div className="filter-tabs">
          {['all','customer','account','aml','txn','kyc'].map(g => (
            <button
              key={g}
              className={`filter-tab ${filter === g ? 'active' : ''}`}
              onClick={() => { setFilter(g); setPage(1); }}
            >
              {g === 'all' ? 'All Events' : g === 'aml' ? 'AML' : g === 'txn' ? 'Transactions' : g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="audit-stats">
        <span className="stat">{filtered.length} events</span>
        <span className="stat aml">{logs.filter(l => l.action === 'AML_FLAG').length} AML flags</span>
        <span className="stat warn">{logs.filter(l => l.action === 'DELETE_CUSTOMER').length} deletions</span>
        <span className="stat">{[...new Set(logs.map(l => l.performed_by))].length} employees</span>
      </div>

      {/* Table */}
      {error && (
        <div className="audit-error">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <div className="audit-table-wrap">
        <table className="audit-table">
          <thead>
            <tr>
              <th>Timestamp (UTC)</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Performed By</th>
              <th>IP Address</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="loading-cell">Loading audit records…</td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={6} className="empty-cell">No matching audit records</td></tr>
            ) : paged.map((log, i) => {
              const cfg = ACTION_CONFIG[log.action] || { color: '#6b7280', label: log.action };
              return (
                <tr key={log.id || i} className={`audit-row ${cfg.group === 'aml' ? 'row-aml' : ''}`}>
                  <td className="cell-time">{formatTime(log.created_at)}</td>
                  <td>
                    <span className="action-badge" style={{ color: cfg.color, borderColor: cfg.color }}>
                      {cfg.label}
                    </span>
                  </td>
                  <td>
                    <span className="entity-type">{log.entity_type}</span>
                    <code className="entity-id">{log.entity_id}</code>
                  </td>
                  <td className="cell-user">{log.performed_by}</td>
                  <td className="cell-ip">{log.ip_address || '—'}</td>
                  <td className="cell-details">
                    {log.details_json ? (
                      <details>
                        <summary>View</summary>
                        <pre>{JSON.stringify(JSON.parse(log.details_json || '{}'), null, 2)}</pre>
                      </details>
                    ) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="pagination">
          <button disabled={page === 1}     onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span>Page {page} of {pages}</span>
          <button disabled={page === pages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
};

// Mock data for dev mode (before SQL is connected)
const MOCK_LOGS = [
  { id: 1, action: 'CREATE_CUSTOMER', entity_type: 'customer', entity_id: 'CUS-4401', performed_by: 'admin@bank.com', ip_address: '192.168.1.10', created_at: new Date().toISOString(), details_json: '{"email":"john@example.com"}' },
  { id: 2, action: 'AML_FLAG',        entity_type: 'transaction', entity_id: 'TXN-8821', performed_by: 'aml-engine', ip_address: null, created_at: new Date(Date.now() - 300000).toISOString(), details_json: '{"rules":["STRUCTURING"]}' },
  { id: 3, action: 'FREEZE_ACCOUNT',  entity_type: 'customer', entity_id: 'CUS-2209', performed_by: 'manager@bank.com', ip_address: '10.0.4.5', created_at: new Date(Date.now() - 900000).toISOString(), details_json: '{"reason":"Suspicious activity"}' },
  { id: 4, action: 'KYC_APPROVED',    entity_type: 'customer', entity_id: 'CUS-5503', performed_by: 'kyc@bank.com', ip_address: '10.0.4.6', created_at: new Date(Date.now() - 1800000).toISOString(), details_json: '{}' },
  { id: 5, action: 'CREATE_TRANSACTION', entity_type: 'transaction', entity_id: 'TXN-4412', performed_by: 'teller@bank.com', ip_address: '10.0.4.7', created_at: new Date(Date.now() - 2400000).toISOString(), details_json: '{"amount":15000,"type":"Debit"}' },
];

export default AuditTrail;
