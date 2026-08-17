import React, { useState } from 'react';
import {
  RecoveryDashboardPage,
  ShelterManagementPage,
  AidRequestsPage,
  DonationsPage,
  CompensationPage,
  RecoveryPlanningPage,
  RecoveryReportsPage,
} from './features/recovery';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: 'system-ui, sans-serif' }}>
      {/* Navigation Header */}
      <header style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🛡️</span>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>Aegis-LK | Member 4 — Recovery & Community Support</h1>
        </div>
      </header>

      {/* Main Tab Navigation */}
      <nav style={{ backgroundColor: '#1e293b', padding: '0 2rem', display: 'flex', gap: '0.5rem', borderBottom: '1px solid #334155' }}>
        {[
          { id: 'dashboard', label: '📊 Dashboard' },
          { id: 'shelters', label: '⛺ Emergency Shelters' },
          { id: 'aid', label: '🤝 Aid Applications' },
          { id: 'donations', label: '📦 Donations' },
          { id: 'compensation', label: '💳 Compensation' },
          { id: 'planning', label: '🤖 Agentic AI Planning' },
          { id: 'reports', label: '📜 Audit Reports' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 16px',
              backgroundColor: activeTab === tab.id ? '#2563eb' : 'transparent',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px 6px 0 0',
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Main Content Area */}
      <main style={{ padding: '1.5rem 0' }}>
        {activeTab === 'dashboard' && <RecoveryDashboardPage />}
        {activeTab === 'shelters' && <ShelterManagementPage />}
        {activeTab === 'aid' && <AidRequestsPage />}
        {activeTab === 'donations' && <DonationsPage />}
        {activeTab === 'compensation' && <CompensationPage />}
        {activeTab === 'planning' && <RecoveryPlanningPage />}
        {activeTab === 'reports' && <RecoveryReportsPage />}
      </main>
    </div>
  );
};

export default App;
