/**
 * KycReview.jsx — Admin KYC document review panel
 *
 * Features:
 *   - Lists all pending KYC submissions
 *   - Opens a review drawer for each submission
 *   - Displays document images/PDF previews via SAS URLs (30-min expiry)
 *   - Approve → activates customer; Reject → requires a reason note
 *   - Dev mode: shows mock submissions when API is unavailable
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, CheckCircle, XCircle, Eye, Clock, User,
  FileText, Camera, Home, RefreshCw, AlertTriangle, X
} from 'lucide-react';
import { createApi } from '../../services/api.js';
import { useAuthContext } from '../../auth/AuthContext.jsx';
import './KycReview.css';

const DOC_LABELS = {
  passport:     { label: 'Passport',     Icon: FileText },
  utility_bill: { label: 'Utility Bill', Icon: Home },
  selfie:       { label: 'Selfie Photo', Icon: Camera },
};

const STATUS_CONFIG = {
  Pending:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)'  },
  Approved: { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)'  },
  Rejected: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)'   },
};

const fmtDate = (iso) => iso ? new Date(iso).toLocaleString('en-GB', { timeZone: 'UTC' }) + ' UTC' : '—';
const fmtSize = (b) => b ? `${(b / 1024).toFixed(0)} KB` : '';

// ── Document Preview ─────────────────────────────────────────────────────────
const DocPreview = ({ docType, meta }) => {
  const [expanded, setExpanded] = useState(false);
  const { Icon, label } = DOC_LABELS[docType] || { label: docType, Icon: FileText };
  const viewUrl = meta?.viewUrl || meta?.thumbnailUrl;

  return (
    <div className="doc-card">
      <div className="doc-card-header">
        <span className="doc-icon"><Icon size={16} /></span>
        <span className="doc-label">{label}</span>
        {meta?.sizeBytes && <span className="doc-size">{fmtSize(meta.sizeBytes)}</span>}
      </div>
      {viewUrl ? (
        <div className={`doc-preview ${expanded ? 'expanded' : ''}`} onClick={() => setExpanded(e => !e)}>
          {meta.mimeType === 'application/pdf' ? (
            <div className="pdf-placeholder">
              <FileText size={36} />
              <span>PDF Document</span>
              <a href={viewUrl} target="_blank" rel="noreferrer" className="open-link"
                onClick={e => e.stopPropagation()}>Open PDF ↗</a>
            </div>
          ) : (
            <img src={viewUrl} alt={label} className="doc-image" />
          )}
          <div className="expand-hint">{expanded ? 'Click to collapse' : 'Click to enlarge'}</div>
        </div>
      ) : (
        <div className="doc-missing">
          <AlertTriangle size={20} />
          <span>{meta?.devMode ? 'Dev mode — no real file' : 'No preview available'}</span>
        </div>
      )}
    </div>
  );
};

// ── Review Drawer ─────────────────────────────────────────────────────────────
const ReviewDrawer = ({ submission, onClose, onApprove, onReject, processing }) => {
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const docs = submission.documents || {};

  const handleReject = () => {
    if (!rejectNote.trim()) return;
    onReject(submission.id, submission.customer_id, rejectNote);
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="review-drawer" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="drawer-header">
          <div>
            <h2>KYC Review</h2>
            <p className="drawer-sub">Submission #{submission.id} · {fmtDate(submission.submitted_at)}</p>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Customer Info */}
        <div className="customer-info-strip">
          <div className="info-item">
            <User size={14} />
            <span>{submission.full_name}</span>
          </div>
          <div className="info-item">
            <span className="info-label">ID:</span>
            <code>{submission.customer_id}</code>
          </div>
          <div className="info-item">
            <span className="info-label">Email:</span>
            <span>{submission.email}</span>
          </div>
          {submission.nationality && (
            <div className="info-item">
              <span className="info-label">Nationality:</span>
              <span>{submission.nationality}</span>
            </div>
          )}
          {submission.risk_level && (
            <div className="info-item">
              <span className="info-label">Risk:</span>
              <span className={`risk-badge risk-${submission.risk_level?.toLowerCase()}`}>
                {submission.risk_level}
              </span>
            </div>
          )}
        </div>

        {/* Documents */}
        <div className="docs-grid">
          {Object.entries(docs).length > 0 ? (
            Object.entries(docs).map(([docType, meta]) => (
              <DocPreview key={docType} docType={docType} meta={meta} />
            ))
          ) : (
            <div className="no-docs">
              <FileText size={32} style={{ opacity: 0.3 }} />
              <p>No documents uploaded yet</p>
            </div>
          )}
        </div>

        {/* Submitted by */}
        <div className="submitted-by">
          Submitted by <strong>{submission.submitted_by}</strong>
        </div>

        {/* Action Buttons */}
        {submission.status === 'Pending' && (
          <div className="drawer-actions">
            {!showRejectForm ? (
              <>
                <button
                  className="btn-approve"
                  onClick={() => onApprove(submission.id, submission.customer_id)}
                  disabled={processing}
                >
                  <CheckCircle size={17} />
                  {processing ? 'Processing…' : 'Approve KYC'}
                </button>
                <button
                  className="btn-reject"
                  onClick={() => setShowRejectForm(true)}
                  disabled={processing}
                >
                  <XCircle size={17} />
                  Reject
                </button>
              </>
            ) : (
              <div className="reject-form">
                <p>Rejection reason <span style={{ color: '#ef4444' }}>*</span></p>
                <textarea
                  value={rejectNote}
                  onChange={e => setRejectNote(e.target.value)}
                  placeholder="e.g. Document is blurry, name mismatch, expired passport…"
                  rows={3}
                />
                <div className="reject-form-btns">
                  <button className="btn-cancel" onClick={() => { setShowRejectForm(false); setRejectNote(''); }}>
                    Cancel
                  </button>
                  <button
                    className="btn-reject-confirm"
                    onClick={handleReject}
                    disabled={!rejectNote.trim() || processing}
                  >
                    <XCircle size={15} />
                    {processing ? 'Rejecting…' : 'Confirm Rejection'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {submission.status !== 'Pending' && (
          <div className="already-reviewed">
            {submission.status === 'Approved'
              ? <><CheckCircle size={16} /> Approved by {submission.reviewed_by}</>
              : <><XCircle size={16} /> Rejected — {submission.review_note}</>
            }
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const KycReview = () => {
  const { getToken } = useAuthContext();
  const [submissions, setSubmissions] = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [selected,    setSelected]    = useState(null);
  const [processing,  setProcessing]  = useState(false);
  const [toast,       setToast]       = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const api = createApi(getToken);
      const res = await api.kyc.getPending();
      setSubmissions(res.data || []);
    } catch {
      setSubmissions(MOCK_SUBMISSIONS);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  const handleApprove = async (submissionId, customerId) => {
    setProcessing(true);
    try {
      const api = createApi(getToken);
      await api.kyc.approve(submissionId, customerId);
      showToast('✅ KYC approved — customer account activated');
      setSelected(null);
      fetchSubmissions();
    } catch (err) {
      showToast(`❌ ${err.message || 'Approval failed'}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (submissionId, customerId, note) => {
    setProcessing(true);
    try {
      const api = createApi(getToken);
      await api.kyc.reject(submissionId, customerId, note);
      showToast('KYC rejected and customer notified');
      setSelected(null);
      fetchSubmissions();
    } catch (err) {
      showToast(`❌ ${err.message || 'Rejection failed'}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="kyc-review">
      {/* Toast */}
      {toast && <div className={`kyc-toast ${toast.type}`}>{toast.msg}</div>}

      {/* Header */}
      <div className="kyc-header">
        <div>
          <h1 className="kyc-title"><Shield size={22} /> KYC Review Queue</h1>
          <p className="kyc-subtitle">
            {submissions.length} submission{submissions.length !== 1 ? 's' : ''} pending review.
            Documents load via time-limited Azure SAS URLs.
          </p>
        </div>
        <button className="kyc-refresh-btn" onClick={fetchSubmissions}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats Row */}
      <div className="kyc-stats">
        {[
          { label: 'Pending Review', value: submissions.length, color: '#f59e0b' },
          { label: 'Avg Risk Level', value: submissions.some(s => s.risk_level === 'High') ? 'High' : 'Low', color: '#ef4444' },
          { label: 'With Documents', value: submissions.filter(s => Object.keys(s.documents || {}).length > 0).length, color: '#6366f1' },
        ].map(({ label, value, color }) => (
          <div key={label} className="kyc-stat-card">
            <div className="stat-value" style={{ color }}>{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Submission Cards */}
      {loading ? (
        <div className="kyc-loading">Loading submissions…</div>
      ) : submissions.length === 0 ? (
        <div className="kyc-empty">
          <CheckCircle size={48} style={{ opacity: 0.2 }} />
          <p>All clear — no pending KYC submissions</p>
        </div>
      ) : (
        <div className="submissions-grid">
          {submissions.map(sub => {
            const cfg = STATUS_CONFIG[sub.status] || STATUS_CONFIG.Pending;
            const docCount = Object.keys(sub.documents || {}).length;
            return (
              <div key={sub.id} className="submission-card" onClick={() => setSelected(sub)}>
                <div className="submission-card-header">
                  <div className="sub-id">#{sub.id}</div>
                  <span className="sub-status" style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                    <Clock size={11} /> {sub.status}
                  </span>
                </div>
                <div className="sub-name">{sub.full_name}</div>
                <div className="sub-meta">
                  <code>{sub.customer_id}</code>
                  <span>{sub.email}</span>
                </div>
                <div className="sub-footer">
                  <div className="doc-count">
                    <FileText size={13} />
                    {docCount} document{docCount !== 1 ? 's' : ''}
                  </div>
                  <div className="sub-date">{fmtDate(sub.submitted_at)}</div>
                </div>
                {sub.risk_level && (
                  <div className={`risk-badge risk-${sub.risk_level?.toLowerCase()}`}>
                    {sub.risk_level} Risk
                  </div>
                )}
                <button className="review-btn">
                  <Eye size={14} /> Review Documents
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Drawer */}
      {selected && (
        <ReviewDrawer
          submission={selected}
          onClose={() => setSelected(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          processing={processing}
        />
      )}
    </div>
  );
};

// Mock data for dev mode
const MOCK_SUBMISSIONS = [
  {
    id: 1, customer_id: 'CUS-4401', full_name: 'Sarah Al-Mansouri',
    email: 'sarah@example.com', nationality: 'UAE', risk_level: 'Low',
    status: 'Pending', submitted_at: new Date().toISOString(), submitted_by: 'admin@bank.com',
    documents: {
      passport:     { mimeType: 'image/jpeg', sizeBytes: 204800, viewUrl: 'https://picsum.photos/seed/passport/600/400', devMode: true },
      utility_bill: { mimeType: 'image/jpeg', sizeBytes: 153600, viewUrl: 'https://picsum.photos/seed/bill/600/400',     devMode: true },
      selfie:       { mimeType: 'image/jpeg', sizeBytes: 89600,  viewUrl: 'https://picsum.photos/seed/selfie/400/400',   devMode: true },
    },
  },
  {
    id: 2, customer_id: 'CUS-8812', full_name: 'James Okafor',
    email: 'james@example.com', nationality: 'Nigeria', risk_level: 'Medium',
    status: 'Pending', submitted_at: new Date(Date.now() - 7200000).toISOString(), submitted_by: 'manager@bank.com',
    documents: {
      passport:     { mimeType: 'application/pdf', sizeBytes: 512000, viewUrl: null, devMode: true },
    },
  },
];

export default KycReview;
