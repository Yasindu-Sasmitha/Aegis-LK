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
import {
  WeatherDashboardPage,
  AlertReviewQueuePage,
  PredictionHistoryPage,
  AnalyticsPage,
} from './features/weather';

type Module = 'weather' | 'recovery';

const MODULE_CONFIG: Record<Module, { label: string; icon: string; color: string }> = {
  weather: { label: 'Weather Intelligence', icon: '🌦️', color: '#2563eb' },
  recovery: { label: 'Recovery & Community Support', icon: '🏥', color: '#7c3aed' },
};

export const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<Module>('weather');
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const WEATHER_TABS = [
    { id: 'dashboard', label: '🌦️ Forecast & Predict' },
    { id: 'review', label: '🔔 Alert Review Queue' },
    { id: 'history', label: '📜 Alert History' },
    { id: 'analytics', label: '📊 Accuracy Analytics' },
  ];

  const RECOVERY_TABS = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'shelters', label: '⛺ Emergency Shelters' },
    { id: 'aid', label: '🤝 Aid Applications' },
    { id: 'donations', label: '📦 Donations' },
    { id: 'compensation', label: '💳 Compensation' },
    { id: 'planning', label: '🤖 Agentic AI Planning' },
    { id: 'reports', label: '📜 Audit Reports' },
  ];

  const tabs = activeModule === 'weather' ? WEATHER_TABS : RECOVERY_TABS;
  const modCfg = MODULE_CONFIG[activeModule];

  const switchModule = (m: Module) => {
    setActiveModule(m);
    setActiveTab('dashboard');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Top Header */}
      <header style={{
        backgroundColor: '#0b1120', borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0.75rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🛡️</span>
          <div>
            <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '1.1rem' }}>Aegis-LK</div>
            <div style={{ color: '#475569', fontSize: '0.75rem' }}>Intelligent Disaster Platform — Sri Lanka</div>
          </div>
        </div>

        {/* Module switcher */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
          {(Object.entries(MODULE_CONFIG) as [Module, typeof MODULE_CONFIG[Module]][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => switchModule(key)}
              style={{
                padding: '0.4rem 1rem', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: '0.8rem',
                fontWeight: activeModule === key ? 600 : 400,
                background: activeModule === key ? cfg.color : 'transparent',
                color: activeModule === key ? '#ffffff' : '#94a3b8',
                transition: 'all 0.2s',
              }}
            >
              {cfg.icon} {cfg.label}
            </button>
          ))}
        </div>
      </header>

      {/* Sub-navigation tabs */}
      <nav style={{ backgroundColor: '#111827', padding: '0 2rem', display: 'flex', gap: '0.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            id={`tab-${activeModule}-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 16px', whiteSpace: 'nowrap',
              backgroundColor: 'transparent',
              color: activeTab === tab.id ? '#f1f5f9' : '#64748b',
              border: 'none', borderBottom: activeTab === tab.id ? `2px solid ${modCfg.color}` : '2px solid transparent',
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: 'pointer', fontSize: '0.85rem', transition: 'color 0.2s, border-color 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main style={{ minHeight: 'calc(100vh - 110px)' }}>
        {/* Weather Module */}
        {activeModule === 'weather' && activeTab === 'dashboard' && <WeatherDashboardPage />}
        {activeModule === 'weather' && activeTab === 'review' && <AlertReviewQueuePage />}
        {activeModule === 'weather' && activeTab === 'history' && <PredictionHistoryPage />}
        {activeModule === 'weather' && activeTab === 'analytics' && <AnalyticsPage />}

        {/* Recovery Module (unchanged) */}
        {activeModule === 'recovery' && activeTab === 'dashboard' && <RecoveryDashboardPage />}
        {activeModule === 'recovery' && activeTab === 'shelters' && <ShelterManagementPage />}
        {activeModule === 'recovery' && activeTab === 'aid' && <AidRequestsPage />}
        {activeModule === 'recovery' && activeTab === 'donations' && <DonationsPage />}
        {activeModule === 'recovery' && activeTab === 'compensation' && <CompensationPage />}
        {activeModule === 'recovery' && activeTab === 'planning' && <RecoveryPlanningPage />}
        {activeModule === 'recovery' && activeTab === 'reports' && <RecoveryReportsPage />}
      </main>
    </div>
  );
};

export default App;
