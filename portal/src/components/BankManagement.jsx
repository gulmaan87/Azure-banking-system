import React from 'react';
import { Server, Users, Activity, Lock, Globe, Shield, Database, Cpu, HardDrive, CheckCircle } from 'lucide-react';
import './BankManagement.css';

const BankManagement = () => {
  const regions = [
    {
      name: 'Region 1: East Asia',
      status: 'Primary',
      vms: [
        { name: 'management-1', role: 'R1 Manager', ip: '10.0.5.4', status: 'online' },
        { name: 'corebank-1', role: 'Core Banking', ip: '10.0.4.4', status: 'online' },
        { name: 'database-1', role: 'Secure DB', ip: '10.0.6.4', status: 'online' }
      ]
    },
    {
      name: 'Region 2: Southeast Asia',
      status: 'Disaster Recovery',
      vms: [
        { name: 'itops-1', role: 'R2 Manager', ip: '10.1.3.4', status: 'online' },
        { name: 'loans-1', role: 'Loans Processing', ip: '10.1.1.4', status: 'online' },
        { name: 'risk-1', role: 'Risk Assessment', ip: '10.1.2.4', status: 'online' }
      ]
    }
  ];

  const personnel = [
    { name: 'Walter White', role: 'System Admin', dept: 'IT', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Walter' },
    { name: 'Skyler White', role: 'Lead Auditor', dept: 'Risk', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Skyler' },
    { name: 'Jesse Pinkman', role: 'App Dev', dept: 'Engineering', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Jesse' },
    { name: 'Hank Schrader', role: 'Compliance', dept: 'Risk', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Hank' },
    { name: 'Mike Ehrmantraut', role: 'Data Engineer', dept: 'Data', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Mike' },
    { name: 'Gustavo Fring', role: 'CISO', dept: 'Security', avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Gus' }
  ];

  return (
    <div className="management-dashboard animate-slide-up delay-1">
      <div className="section-title">
        <div>
          <h2>Enterprise Infrastructure</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px', fontWeight: 400 }}>Zero-Trust Architecture Control Plane</p>
        </div>
        <div className="status-badge pulse">
          <Shield size={16} /> System Secured
        </div>
      </div>

      
      <div className="mgmt-stats-grid">
        <div className="glass-panel mgmt-stat-card">
          <div className="stat-icon-wrapper blue">
            <Globe size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Active Regions</span>
            <span className="stat-value">2</span>
          </div>
        </div>
        <div className="glass-panel mgmt-stat-card">
          <div className="stat-icon-wrapper green">
            <Server size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Deployed VMs</span>
            <span className="stat-value">6 / 6</span>
          </div>
        </div>
        <div className="glass-panel mgmt-stat-card">
          <div className="stat-icon-wrapper purple">
            <Lock size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">NSG Rules</span>
            <span className="stat-value">Strict</span>
          </div>
        </div>
        <div className="glass-panel mgmt-stat-card">
          <div className="stat-icon-wrapper pink">
            <Activity size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Global Uptime</span>
            <span className="stat-value">99.99%</span>
          </div>
        </div>
      </div>

      
      <div className="network-topology-container">
        {regions.map((region, idx) => (
          <div key={idx} className="glass-panel region-card">
            <div className="region-header">
              <h3>{region.name}</h3>
              <span className={`region-badge ${region.status === 'Primary' ? 'primary' : 'secondary'}`}>
                {region.status}
              </span>
            </div>
            <div className="vms-grid">
              {region.vms.map((vm, vIdx) => (
                <div key={vIdx} className="vm-node">
                  <div className="vm-icon">
                    {vm.role.includes('DB') ? <Database size={20} /> : <Cpu size={20} />}
                  </div>
                  <div className="vm-details">
                    <div className="vm-name">{vm.name}</div>
                    <div className="vm-role">{vm.role}</div>
                    <div className="vm-ip">{vm.ip}</div>
                  </div>
                  <div className="vm-status">
                    <CheckCircle size={14} color="var(--success)" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      
      <div className="glass-panel personnel-section" style={{ padding: '28px' }}>
        <div className="section-title">
          AzureAD Enterprise Personnel
          <div className="personnel-count">
            <Users size={16} /> {personnel.length} Identities
          </div>
        </div>
        <div className="personnel-grid">
          {personnel.map((person, pIdx) => (
            <div key={pIdx} className="personnel-card">
              <img src={person.avatar} alt={person.name} className="personnel-avatar" />
              <div className="personnel-info">
                <h4>{person.name}</h4>
                <div className="personnel-role">{person.role}</div>
                <div className="personnel-dept">{person.dept}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BankManagement;
