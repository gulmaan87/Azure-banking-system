




import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AlertTriangle, Zap, User, DollarSign, Shield, Wifi, WifiOff } from 'lucide-react';
import { useSignalR } from '../../hooks/useSignalR.js';
import './LiveAlerts.css';

const SEVERITY_CONFIG = {
  Critical: { color: '#991b1b', bg: 'rgba(153,27,27,0.15)', border: 'rgba(153,27,27,0.4)', Icon: Shield },
  High:     { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  Icon: AlertTriangle },
  Medium:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', Icon: AlertTriangle },
  Low:      { color: '#10b981', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.2)', Icon: Zap },
  info:     { color: '#6366f1', bg: 'rgba(99,102,241,0.10)', border: 'rgba(99,102,241,0.2)', Icon: Zap },
};

const eventToAlert = (event, data) => {
  const base = { id: `${Date.now()}-${Math.random()}`, timestamp: data.timestamp || new Date().toISOString(), event };

  switch (event) {
    case 'AmlAlert':
      return {
        ...base,
        severity: data.severity || 'High',
        title: `AML Flag — ${data.flags?.[0]?.rule || 'Suspicious Activity'}`,
        message: data.flags?.map(f => f.description).join(' | ') || 'Transaction flagged by AML engine',
        customerId: data.customer_id,
        icon: 'aml',
      };
    case 'CustomerUpdated':
      return {
        ...base,
        severity: ['FLAGGED','FROZEN'].includes(data.action) ? 'High' : 'info',
        title: `Customer ${data.action}`,
        message: data.reason || `Customer ${data.customer_id} was ${data.action.toLowerCase()}`,
        customerId: data.customer_id,
        icon: 'customer',
      };
    case 'TransactionCreated':
      return {
        ...base,
        severity: 'info',
        title: `Transaction — ${data.type}`,
        message: `$${parseFloat(data.amount).toLocaleString()} processed on account ${data.account_id}`,
        customerId: data.customer_id,
        icon: 'transaction',
      };
    case 'KycStatusChanged':
      return {
        ...base,
        severity: data.status === 'Rejected' ? 'Medium' : 'info',
        title: `KYC ${data.status}`,
        message: `Customer ${data.customer_id} KYC submission ${data.status.toLowerCase()}`,
        customerId: data.customer_id,
        icon: 'kyc',
      };
    default:
      return { ...base, severity: 'info', title: event, message: JSON.stringify(data), icon: 'info' };
  }
};

const AlertIcon = ({ icon, size = 16 }) => {
  const icons = { aml: Shield, customer: User, transaction: DollarSign, kyc: Shield, info: Zap };
  const Icon = icons[icon] || Zap;
  return <Icon size={size} />;
};

const fmt = (iso) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const LiveAlerts = ({ onCustomerRefresh }) => {
  const [alerts, setAlerts] = useState([]);
  const feedRef = useRef(null);

  const handleEvent = useCallback((event, data) => {
    const alert = eventToAlert(event, data);
    setAlerts(prev => [alert, ...prev].slice(0, 100)); 

    
    if (event === 'CustomerUpdated') {
      onCustomerRefresh?.();
    }
  }, [onCustomerRefresh]);

  const { connected, devMode } = useSignalR(handleEvent);

  
  useEffect(() => {
    feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [alerts.length]);

  const clearAlerts = () => setAlerts([]);

  
  const injectMockAlert = () => {
    const mocks = [
      { event: 'AmlAlert', data: {
        customer_id: 'CUS-4401', severity: 'Critical',
        flags: [{ rule: 'STRUCTURING', description: 'Daily outflow $9,200 near $10k threshold' }],
        timestamp: new Date().toISOString(),
      }},
      { event: 'TransactionCreated', data: {
        account_id: 'ACC-88001', customer_id: 'CUS-8092',
        type: 'Debit', amount: 15000, balance_after: 30200,
        timestamp: new Date().toISOString(),
      }},
      { event: 'CustomerUpdated', data: {
        action: 'FLAGGED', customer_id: 'CUS-1093',
        reason: 'Manual review by compliance officer',
        timestamp: new Date().toISOString(),
      }},
    ];
    const mock = mocks[Math.floor(Math.random() * mocks.length)];
    handleEvent(mock.event, mock.data);
  };

  return (
    <div className="live-alerts-panel">
      <div className="alerts-header">
        <div className="alerts-title">
          <Zap size={18} className="alerts-icon-pulse" />
          Live Activity Feed
          {alerts.length > 0 && (
            <span className="alerts-badge">{alerts.length}</span>
          )}
        </div>
        <div className="alerts-controls">
          <div className={`connection-indicator ${connected ? 'online' : devMode ? 'dev' : 'offline'}`}>
            {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {connected ? 'Live' : devMode ? 'Dev' : 'Offline'}
          </div>
          {devMode && (
            <button className="mock-btn" onClick={injectMockAlert} title="Inject mock event">
              + Mock Event
            </button>
          )}
          {alerts.length > 0 && (
            <button className="clear-btn" onClick={clearAlerts}>Clear</button>
          )}
        </div>
      </div>

      <div className="alerts-feed" ref={feedRef}>
        {alerts.length === 0 ? (
          <div className="alerts-empty">
            <Wifi size={28} style={{ opacity: 0.2, marginBottom: '12px' }} />
            <p>Waiting for events…</p>
            {devMode && <p style={{ fontSize: '12px', marginTop: '8px' }}>Click <strong>+ Mock Event</strong> to simulate</p>}
          </div>
        ) : (
          alerts.map((alert) => {
            const cfg = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
            return (
              <div key={alert.id} className="alert-card" style={{
                background: cfg.bg, borderLeft: `3px solid ${cfg.color}`,
                border: `1px solid ${cfg.border}`,
              }}>
                <div className="alert-card-header">
                  <span className="alert-icon" style={{ color: cfg.color }}>
                    <AlertIcon icon={alert.icon} size={14} />
                  </span>
                  <span className="alert-title" style={{ color: cfg.color }}>{alert.title}</span>
                  <span className="alert-severity" style={{ color: cfg.color }}>
                    {alert.severity !== 'info' ? alert.severity : ''}
                  </span>
                  <span className="alert-time">{fmt(alert.timestamp)}</span>
                </div>
                <p className="alert-message">{alert.message}</p>
                {alert.customerId && (
                  <span className="alert-cid">Customer: {alert.customerId}</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default LiveAlerts;
