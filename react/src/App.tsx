import React, { useState } from 'react';
import { AuthProvider, useAuth } from './shared/auth/AuthContext';
import { LoginPage } from './shared/auth/LoginPage';
import { RegisterPage } from './shared/auth/RegisterPage';
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

const ROLE_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  Admin: { label: '⚙️ Admin', color: '#c084fc', bg: 'rgba(192,132,252,0.15)' },
  DisasterOfficer: { label: '🛡️ Disaster Officer', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
  Responder: { label: '🚨 Responder', color: '#fcd34d', bg: 'rgba(252,211,77,0.15)' },
  Citizen: { label: '👥 Citizen', color: '#6ee7b7', bg: 'rgba(110,231,183,0.15)' },
};

const MainPlatform: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeModule, setActiveModule] = useState<Module>('weather');
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const isOfficerOrAdmin = user?.role === 'DisasterOfficer' || user?.role === 'Admin';

  // Role-filtered tabs
  const WEATHER_TABS = [
    { id: 'dashboard', label: '🌦️ Forecast & Live Risk' },
    ...(isOfficerOrAdmin ? [{ id: 'review', label: '🔔 Alert Review Queue' }] : []),
    { id: 'history', label: '📜 Alert History' },
    ...(isOfficerOrAdmin ? [{ id: 'analytics', label: '📊 Accuracy Analytics' }] : []),
  ];

  const RECOVERY_TABS = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'shelters', label: '⛺ Emergency Shelters' },
    { id: 'aid', label: '🤝 Aid Applications' },
    { id: 'donations', label: '📦 Donations' },
    { id: 'compensation', label: '💳 Compensation' },
    ...(isOfficerOrAdmin ? [{ id: 'planning', label: '🤖 Agentic AI Planning' }] : []),
    { id: 'reports', label: '📜 Audit Reports' },
  ];

  const tabs = activeModule === 'weather' ? WEATHER_TABS : RECOVERY_TABS;
  const modCfg = MODULE_CONFIG[activeModule];

  const switchModule = (m: Module) => {
    setActiveModule(m);
    setActiveTab('dashboard');
  };

  const roleBadge = ROLE_BADGES[user?.role ?? 'Citizen'] ?? ROLE_BADGES.Citizen;

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

        {/* User Profile & Logout Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#f8fafc', fontSize: '0.85rem', fontWeight: 600 }}>
              {user?.fullName}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end', marginTop: 2 }}>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: roleBadge.color,
                backgroundColor: roleBadge.bg,
                padding: '2px 8px',
                borderRadius: 12,
                border: `1px solid ${roleBadge.color}30`
              }}>
                {roleBadge.label}
              </span>
              {user?.district && (
                <span style={{ color: '#64748b', fontSize: '0.7rem' }}>📍 {user.district}</span>
              )}
            </div>
          </div>

          <button
            onClick={logout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.45rem 0.85rem',
              backgroundColor: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8,
              color: '#fca5a5',
              fontSize: '0.8rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Module Switcher Bar */}
      <div style={{
        backgroundColor: '#0d1527', borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0.5rem 2rem', display: 'flex', alignItems: 'center', gap: '0.75rem'
      }}>
        <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '0.5rem' }}>
          Platform Module:
        </span>
        {(['weather', 'recovery'] as Module[]).map((m) => {
          const cfg = MODULE_CONFIG[m];
          const active = activeModule === m;
          return (
            <button
              key={m}
              onClick={() => switchModule(m)}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: 8,
                border: active ? `1px solid ${cfg.color}` : '1px solid rgba(255,255,255,0.08)',
                background: active ? `${cfg.color}20` : 'transparent',
                color: active ? '#f1f5f9' : '#94a3b8',
                fontWeight: active ? 600 : 400,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{cfg.icon}</span>
              <span>{cfg.label}</span>
            </button>
          );
        })}
      </div>

      {/* Module Tab Navigation */}
      <nav style={{
        backgroundColor: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 2rem', display: 'flex', gap: '0.25rem', overflowX: 'auto'
      }}>
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.85rem 1.1rem',
                background: 'transparent',
                border: 'none',
                borderBottom: active ? `2px solid ${modCfg.color}` : '2px solid transparent',
                color: active ? '#f1f5f9' : '#64748b',
                fontWeight: active ? 600 : 400,
                fontSize: '0.875rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Main Content Area */}
      <main style={{ padding: '2rem' }}>
        {/* Weather Intelligence Views */}
        {activeModule === 'weather' && (
          <>
            {activeTab === 'dashboard' && <WeatherDashboardPage />}
            {activeTab === 'review' && (
              isOfficerOrAdmin
                ? <AlertReviewQueuePage />
                : <div style={{ color: '#f87171' }}>Access restricted to Disaster Officers.</div>
            )}
            {activeTab === 'history' && <PredictionHistoryPage />}
            {activeTab === 'analytics' && (
              isOfficerOrAdmin
                ? <AnalyticsPage />
                : <div style={{ color: '#f87171' }}>Access restricted to Disaster Officers.</div>
            )}
          </>
        )}

        {/* Recovery & Community Support Views */}
        {activeModule === 'recovery' && (
          <>
            {activeTab === 'dashboard' && <RecoveryDashboardPage />}
            {activeTab === 'shelters' && <ShelterManagementPage />}
            {activeTab === 'aid' && <AidRequestsPage />}
            {activeTab === 'donations' && <DonationsPage />}
            {activeTab === 'compensation' && <CompensationPage />}
            {activeTab === 'planning' && <RecoveryPlanningPage />}
            {activeTab === 'reports' && <RecoveryReportsPage />}
          </>
        )}
      </main>
    </div>
  );
};

const AppRoot: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        color: '#94a3b8',
        fontFamily: "'Inter', system-ui, sans-serif"
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🛡️</div>
          <div>Initializing Aegis-LK Security...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return authMode === 'login' ? (
      <LoginPage onSwitchToRegister={() => setAuthMode('register')} />
    ) : (
      <RegisterPage onSwitchToLogin={() => setAuthMode('login')} />
    );
  }

  return <MainPlatform />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppRoot />
    </AuthProvider>
  );
};

export default App;
