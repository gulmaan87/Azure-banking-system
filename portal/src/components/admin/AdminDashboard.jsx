import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Users, AlertTriangle, CheckCircle, Search, Edit2, Trash2, ShieldAlert, CreditCard, Plus, X, Loader, Ban, RotateCcw, Flag, FileCheck, Activity } from 'lucide-react';
import BankManagement from '../BankManagement';
import LiveAlerts    from './LiveAlerts.jsx';
import AuditTrail   from './AuditTrail.jsx';
import KycReview    from './KycReview.jsx';
import TransactionsDashboard from './TransactionsDashboard.jsx';
import { createApi } from '../../services/api.js';
import { useAuthContext } from '../../auth/AuthContext.jsx';
import './Admin.css';

const AdminDashboard = ({ setRole }) => {
  const { employee, role: empRole, getToken, logout } = useAuthContext();
  const api = useMemo(() => createApi(getToken), [getToken]);
  const [activeTab, setActiveTab] = useState('customers');

  // ── Data State ────────────────────────────────────────────────────────────
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [search, setSearch]       = useState('');

  // ── Modal State ───────────────────────────────────────────────────────────
  const [showModal, setShowModal]   = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [saving, setSaving]         = useState(false);
  const [formData, setFormData]     = useState({
    full_name: '', email: '', phone: '', address: '', risk_level: 'Low',
  });

  // ── Fetch customers from real API ─────────────────────────────────────────
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.customers.getAll();
      setCustomers(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (activeTab === 'customers') fetchCustomers();
  }, [activeTab, fetchCustomers]);

  // ── Filtered customers by search ──────────────────────────────────────────
  const filtered = customers.filter(c =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.id?.toLowerCase().includes(search.toLowerCase())
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleOpenModal = (cus = null) => {
    if (cus) {
      setEditingId(cus.id);
      setFormData({ full_name: cus.full_name, email: cus.email, phone: cus.phone || '', address: cus.address || '', risk_level: cus.risk_level });
    } else {
      setEditingId(null);
      setFormData({ full_name: '', email: '', phone: '', address: '', risk_level: 'Low' });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.customers.update(editingId, formData);
      } else {
        await api.customers.create(formData);
      }
      setShowModal(false);
      await fetchCustomers();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this customer? This requires a zero balance.')) return;
    try {
      await api.customers.delete(id);
      await fetchCustomers();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleFreeze = async (id) => {
    const reason = prompt('Enter reason for freezing this account:');
    if (!reason) return;
    try {
      await api.customers.freeze(id, reason);
      await fetchCustomers();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleUnfreeze = async (id) => {
    try {
      await api.customers.unfreeze(id);
      await fetchCustomers();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleFlag = async (id) => {
    const reason = prompt('Enter AML reason for flagging this account:');
    if (!reason) return;
    try {
      await api.customers.flag(id, reason);
      await fetchCustomers();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getRiskColor = (risk) => {
    switch (risk) {
      case 'Low':      return 'var(--success)';
      case 'Medium':   return 'var(--secondary)';
      case 'High':     return 'var(--danger)';
      case 'Critical': return '#991b1b';
      default:         return 'var(--text-main)';
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      'Active':     { bg: 'rgba(16,185,129,0.15)',  color: 'var(--success)' },
      'Flagged':    { bg: 'rgba(239,68,68,0.15)',    color: 'var(--danger)' },
      'Review KYC': { bg: 'rgba(245,158,11,0.15)',   color: '#fbbf24' },
      'Frozen':     { bg: 'rgba(156,163,175,0.15)',  color: '#9ca3af' },
    };
    const style = map[status] || { bg: 'rgba(255,255,255,0.1)', color: '#fff' };
    return (
      <span style={{ background: style.bg, color: style.color, padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
        {status}
      </span>
    );
  };

  const fmt = (n) => n != null ? `$${parseFloat(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '$0.00';

  return (
    <div className="admin-container">
      {/* Admin Sidebar */}
      <aside className="admin-sidebar">
        <div className="brand" style={{ background: 'linear-gradient(to right, #f87171, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          <div className="brand-icon" style={{ background: 'linear-gradient(135deg, #ef4444, #991b1b)', boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)' }}>
            <ShieldAlert size={20} />
          </div>
          Bank Admin
        </div>
        {employee && (
          <div style={{ marginTop: '12px', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', fontSize: '13px' }}>
            <div style={{ fontWeight: 600, color: 'white' }}>{employee.name}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{empRole} · {employee.email}</div>
          </div>
        )}

        <nav className="nav-menu" style={{ marginTop: '32px' }}>
          {[
            { id: 'overview',   label: 'Overview',           Icon: CreditCard },
            { id: 'transactions',label: 'Transactions Flow',  Icon: Activity },
            { id: 'customers',  label: 'Customer Management', Icon: Users },
            { id: 'alerts',     label: 'Risk & AML Alerts',  Icon: AlertTriangle },
            { id: 'kyc',        label: 'KYC Review',         Icon: FileCheck },
            { id: 'audit',      label: 'Audit Trail',        Icon: CheckCircle },
          ].map(({ id, label, Icon }) => (
            <a key={id} href="#" className={`nav-item ${activeTab === id ? 'admin-active' : ''}`}
              onClick={(e) => { e.preventDefault(); setActiveTab(id); }}>
              <Icon size={20} /><span>{label}</span>
            </a>
          ))}
        </nav>

        <div style={{ marginTop: 'auto' }}>
          <button className="exit-admin-btn" onClick={() => { logout(); setRole(null); }}>Log Out</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-main animate-slide-up delay-1">
        {activeTab === 'overview' && <BankManagement />}

        {activeTab === 'transactions' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', padding: '24px', overflow: 'hidden' }}>
            <TransactionsDashboard />
          </div>
        )}

        {activeTab === 'customers' && (
          <div style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 120px)' }}>
            {/* Customer Table — takes majority of width */}
            <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
            <div className="header">
              <div>
                <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Customer Management</h1>
                <p style={{ color: 'var(--text-muted)' }}>Bank Staff Only — Live data from API</p>
              </div>
              <div className="search-bar" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
                <Search size={18} color="var(--text-muted)" />
                <input type="text" placeholder="Search name, email, or ID..." value={search}
                  onChange={e => setSearch(e.target.value)} />
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '24px' }}>
              <div className="section-title">
                Customer Directory
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{filtered.length} records</span>
                  <button className="admin-action-btn" onClick={() => handleOpenModal()}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Plus size={16} /> Add Customer
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ padding: '16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', marginBottom: '16px', color: 'var(--danger)' }}>
                  ⚠ API Error: {error} — <button onClick={fetchCustomers} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}>Retry</button>
                </div>
              )}

              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Customer ID</th>
                      <th>Name / Email</th>
                      <th>Status</th>
                      <th>Total Balance</th>
                      <th>Risk</th>
                      <th>KYC</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr><td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> Loading...
                      </td></tr>
                    )}
                    {!loading && filtered.map((cus) => (
                      <tr key={cus.id}>
                        <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '13px' }}>{cus.id}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{cus.full_name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{cus.email}</div>
                        </td>
                        <td>{getStatusBadge(cus.status)}</td>
                        <td style={{ fontWeight: 500 }}>{fmt(cus.total_balance)}</td>
                        <td style={{ color: getRiskColor(cus.risk_level), fontWeight: 600 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {['High','Critical'].includes(cus.risk_level) ? <AlertTriangle size={13} /> : <CheckCircle size={13} />}
                            {cus.risk_level}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', color: cus.kyc_verified ? 'var(--success)' : 'var(--text-muted)' }}>
                            {cus.kyc_verified ? '✓ Verified' : '⏳ Pending'}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button className="icon-btn" onClick={() => handleOpenModal(cus)} title="Edit"><Edit2 size={15} /></button>
                            {cus.status === 'Frozen'
                              ? <button className="icon-btn" onClick={() => handleUnfreeze(cus.id)} title="Unfreeze"><RotateCcw size={15} color="var(--success)" /></button>
                              : <button className="icon-btn" onClick={() => handleFreeze(cus.id)} title="Freeze"><Ban size={15} color="var(--danger)" /></button>
                            }
                            {cus.status === 'Active' &&
                              <button className="icon-btn" onClick={() => handleFlag(cus.id)} title="Flag AML"><Flag size={15} color="#fbbf24" /></button>
                            }
                            <button className="icon-btn" onClick={() => handleDelete(cus.id)} title="Delete"><Trash2 size={15} color="var(--danger)" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!loading && filtered.length === 0 && !error && (
                      <tr><td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        No customers found{search ? ` for "${search}"` : ''}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            </div>
            {/* Live Alert Feed — fixed right column */}
            <div style={{ width: '320px', flexShrink: 0 }}>
              <LiveAlerts onCustomerRefresh={fetchCustomers} />
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
            <div className="header" style={{ flexShrink: 0 }}>
              <div>
                <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Risk & AML Alerts</h1>
                <p style={{ color: 'var(--text-muted)' }}>
                  Real-time feed from the AML rules engine. Events stream via Azure SignalR.
                </p>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <LiveAlerts onCustomerRefresh={fetchCustomers} />
            </div>
          </div>
        )}

        {activeTab === 'kyc' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', padding: '24px', overflow: 'hidden' }}>
            <KycReview />
          </div>
        )}

        {activeTab === 'audit' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', padding: '24px', gap: '0' }}>
            <AuditTrail />
          </div>
        )}

      </main>

      {/* CRUD Modal */}
      {showModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal glass-panel">
            <div className="modal-header">
              <h2>{editingId ? 'Edit Customer' : 'Add New Customer'}</h2>
              <button className="icon-btn" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="modal-form">
              <div className="form-group">
                <label>Full Name</label>
                <input required type="text" value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })} placeholder="e.g. John Doe" />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input required type="email" value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="e.g. john@example.com" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input type="text" value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="+1 555 000 0000" />
                </div>
                <div className="form-group">
                  <label>Risk Level</label>
                  <select value={formData.risk_level} onChange={e => setFormData({ ...formData, risk_level: e.target.value })}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Address</label>
                <input type="text" value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="123 Main St, City" />
              </div>
              <div className="modal-actions">
                <button type="button" className="admin-cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="admin-action-btn" disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
