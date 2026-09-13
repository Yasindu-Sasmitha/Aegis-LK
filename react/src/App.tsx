import React, { useState } from 'react';
import { AuthProvider, useAuth } from './shared/auth/AuthContext';
import { LoginPage } from './shared/auth/LoginPage';
import { RegisterPage } from './shared/auth/RegisterPage';
import { AegisLogo } from './shared/components/AegisLogo';
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

type NavView = 'home' | 'weather' | 'recovery';

const ROLE_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  Admin: { label: '⚙️ Admin', color: '#c084fc', bg: 'rgba(192,132,252,0.15)' },
  DisasterOfficer: { label: '🛡️ Disaster Officer', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
  Responder: { label: '🚨 Responder', color: '#fcd34d', bg: 'rgba(252,211,77,0.15)' },
  Citizen: { label: '👥 Citizen', color: '#6ee7b7', bg: 'rgba(110,231,183,0.15)' },
};

const MainPlatform: React.FC = () => {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState<NavView>('home');
  const [weatherTab, setWeatherTab] = useState<string>('dashboard');
  const [recoveryTab, setRecoveryTab] = useState<string>('dashboard');

  const isOfficerOrAdmin = user?.role === 'DisasterOfficer' || user?.role === 'Admin';

  // Role-filtered tabs for Weather module
  const WEATHER_TABS = [
    { id: 'dashboard', label: '🌦️ Forecast & Live Risk' },
    ...(isOfficerOrAdmin ? [{ id: 'review', label: '🔔 Alert Review Queue' }] : []),
    { id: 'history', label: '📜 Alert History' },
    ...(isOfficerOrAdmin ? [{ id: 'analytics', label: '📊 Accuracy Analytics' }] : []),
  ];

  // Role-filtered tabs for Recovery module
  const RECOVERY_TABS = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'shelters', label: '⛺ Emergency Shelters' },
    { id: 'aid', label: '🤝 Aid Applications' },
    { id: 'donations', label: '📦 Donations' },
    { id: 'compensation', label: '💳 Compensation' },
    ...(isOfficerOrAdmin ? [{ id: 'planning', label: '🤖 Agentic AI Planning' }] : []),
    { id: 'reports', label: '📜 Audit Reports' },
  ];

  const roleBadge = ROLE_BADGES[user?.role ?? 'Citizen'] ?? ROLE_BADGES.Citizen;

  const navigateToWeather = (tab = 'dashboard') => {
    setCurrentView('weather');
    setWeatherTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToRecovery = (tab = 'dashboard') => {
    setCurrentView('recovery');
    setRecoveryTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Top Main Navigation Bar (Matching Reference Image 1) */}
      <header style={{
        backgroundColor: '#07162c',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '0.75rem 2.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)'
      }}>
        {/* Brand */}
        <div style={{ cursor: 'pointer' }} onClick={() => setCurrentView('home')}>
          <AegisLogo size={38} lightText={true} />
        </div>

        {/* Center Nav Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => setCurrentView('home')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              borderRadius: 8,
              border: 'none',
              background: currentView === 'home' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: currentView === 'home' ? '#38bdf8' : '#cbd5e1',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <span>🏠</span>
            <span>Home</span>
          </button>

          <button
            onClick={() => navigateToWeather('dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              borderRadius: 8,
              border: 'none',
              background: currentView === 'weather' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: currentView === 'weather' ? '#38bdf8' : '#cbd5e1',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <span>🌦️</span>
            <span>Weather Intelligence</span>
          </button>

          <button
            onClick={() => navigateToRecovery('dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              borderRadius: 8,
              border: 'none',
              background: currentView === 'recovery' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: currentView === 'recovery' ? '#38bdf8' : '#cbd5e1',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <span>🏥</span>
            <span>Recovery & Relief</span>
          </button>

          <button
            onClick={() => navigateToWeather(isOfficerOrAdmin ? 'analytics' : 'history')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: '#94a3b8',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 500,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            <span>📊</span>
            <span>Reports</span>
          </button>
        </nav>

        {/* Right User Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#ffffff', fontSize: '0.875rem', fontWeight: 600 }}>
              {user?.fullName}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', justifyContent: 'flex-end', marginTop: 2 }}>
              <span style={{
                fontSize: '0.675rem',
                fontWeight: 700,
                color: roleBadge.color,
                backgroundColor: roleBadge.bg,
                padding: '2px 8px',
                borderRadius: 10,
                border: `1px solid ${roleBadge.color}40`,
                textTransform: 'uppercase',
                letterSpacing: '0.03em'
              }}>
                {roleBadge.label}
              </span>
              {user?.district && (
                <span style={{ color: '#94a3b8', fontSize: '0.725rem' }}>📍 {user.district}</span>
              )}
            </div>
          </div>

          <button
            onClick={logout}
            style={{
              padding: '0.45rem 0.95rem',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: 8,
              color: '#fca5a5',
              fontSize: '0.825rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title="Sign out of Aegis-LK"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Sub-header Module Nav (Visible when in module views) */}
      {currentView !== 'home' && (
        <div style={{
          backgroundColor: '#0c2242',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '0 2.5rem',
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          {(currentView === 'weather' ? WEATHER_TABS : RECOVERY_TABS).map((tab) => {
            const active = (currentView === 'weather' ? weatherTab : recoveryTab) === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => currentView === 'weather' ? setWeatherTab(tab.id) : setRecoveryTab(tab.id)}
                style={{
                  padding: '0.85rem 1.15rem',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: active ? '3px solid #38bdf8' : '3px solid transparent',
                  color: active ? '#ffffff' : '#94a3b8',
                  fontWeight: active ? 700 : 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Content Container */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '2rem 2.5rem' }}>
        {/* =========================================================================
            HOME OVERVIEW VIEW (Matching Reference Screenshot 1)
           ========================================================================= */}
        {currentView === 'home' && (
          <div>
            {/* Hero Section */}
            <div className="ae-landing-hero">
              <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ maxWidth: 660 }}>
                  <div className="ae-hero-eyebrow">
                    PREPARE &nbsp;•&nbsp; RESPOND &nbsp;•&nbsp; RECOVER &nbsp;•&nbsp; TOGETHER
                  </div>

                  <h1 className="ae-hero-heading">
                    A Safer Sri Lanka Starts with <span>Preparedness</span>
                  </h1>

                  <p className="ae-hero-desc">
                    Aegis-LK is the national platform for disaster management in Sri Lanka, connecting people, authorities and communities to save lives, reduce risks and build a more resilient nation.
                  </p>

                  <div className="ae-hero-actions">
                    <button
                      className="ae-hero-btn-primary"
                      onClick={() => navigateToWeather('dashboard')}
                    >
                      <span>🛡️ Report an Emergency</span>
                      <span>→</span>
                    </button>

                    <button
                      className="ae-hero-btn-outline"
                      onClick={() => navigateToWeather('dashboard')}
                    >
                      <span>📖 Learn More</span>
                    </button>
                  </div>
                </div>

                {/* Right Decorative Badge & Visual (Helicopter & Sri Lanka Crest Motif) */}
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingRight: '2rem' }}>
                  {/* Stylized Helicopter / Rescue Graphic */}
                  <svg width="280" height="150" viewBox="0 0 280 150" fill="none" opacity="0.9">
                    {/* Rotor */}
                    <ellipse cx="140" cy="35" rx="90" ry="4" stroke="#94a3b8" strokeWidth="2.5" strokeDasharray="6 4" />
                    {/* Cabin */}
                    <path d="M100 45 Q160 30 190 55 Q210 75 190 90 Q120 95 90 85 Q75 75 85 55 Z" fill="#1e3a5f" stroke="#38bdf8" strokeWidth="2" />
                    {/* Cockpit Window */}
                    <path d="M155 46 Q185 55 185 70 L145 70 Z" fill="#38bdf8" opacity="0.6" />
                    {/* Tail Boom */}
                    <path d="M90 65 L30 55 L30 40 L25 40 L25 70 L30 70 L30 62 L85 75 Z" fill="#0f2646" stroke="#38bdf8" strokeWidth="1.5" />
                    <line x1="28" y1="35" x2="28" y2="75" stroke="#94a3b8" strokeWidth="2" />
                    {/* Skids */}
                    <line x1="100" y1="110" x2="180" y2="110" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
                    <line x1="115" y1="92" x2="110" y2="110" stroke="#cbd5e1" strokeWidth="2" />
                    <line x1="165" y1="92" x2="170" y2="110" stroke="#cbd5e1" strokeWidth="2" />
                  </svg>

                  {/* Stronger Together Ribbon */}
                  <div style={{
                    marginTop: '1rem',
                    textAlign: 'center',
                    background: 'rgba(7, 23, 46, 0.75)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    padding: '0.65rem 1.5rem',
                    borderRadius: 30,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                  }}>
                    <div style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontStyle: 'italic',
                      fontWeight: 800,
                      fontSize: '1.25rem',
                      color: '#ffffff',
                      textShadow: '0 2px 8px rgba(0,0,0,0.5)'
                    }}>
                      Stronger Together
                    </div>
                    <div style={{
                      height: 4,
                      width: 90,
                      margin: '0.35rem auto 0',
                      borderRadius: 2,
                      background: 'linear-gradient(90deg, #f59e0b 0%, #ef4444 50%, #10b981 100%)'
                    }} />
                  </div>
                </div>
              </div>
            </div>

            {/* 5 Feature Cards Row */}
            <div className="ae-feature-cards-grid">
              {/* Card 1: Emergency Alerts */}
              <div
                className="ae-feature-card"
                onClick={() => navigateToWeather('dashboard')}
              >
                <div>
                  <div className="ae-feature-card-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
                    🚨
                  </div>
                  <div className="ae-feature-card-title">Emergency Alerts</div>
                  <div className="ae-feature-card-desc">
                    Get real-time alerts for natural hazards, flash floods, and severe weather emergencies.
                  </div>
                </div>
                <div className="ae-feature-card-link">→</div>
              </div>

              {/* Card 2: Community Support */}
              <div
                className="ae-feature-card"
                onClick={() => navigateToRecovery('aid')}
              >
                <div>
                  <div className="ae-feature-card-icon" style={{ background: '#d1fae5', color: '#059669' }}>
                    👥
                  </div>
                  <div className="ae-feature-card-title">Community Support</div>
                  <div className="ae-feature-card-desc">
                    Connect with nearby volunteers, aid programs, and local community support networks.
                  </div>
                </div>
                <div className="ae-feature-card-link">→</div>
              </div>

              {/* Card 3: Resource Management */}
              <div
                className="ae-feature-card"
                onClick={() => navigateToRecovery('donations')}
              >
                <div>
                  <div className="ae-feature-card-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>
                    🛡️
                  </div>
                  <div className="ae-feature-card-title">Resource Management</div>
                  <div className="ae-feature-card-desc">
                    Track emergency resources, ration supplies, relief warehouses, and distribution routes.
                  </div>
                </div>
                <div className="ae-feature-card-link">→</div>
              </div>

              {/* Card 4: Disaster Information */}
              <div
                className="ae-feature-card"
                onClick={() => navigateToWeather('history')}
              >
                <div>
                  <div className="ae-feature-card-icon" style={{ background: '#ede9fe', color: '#7c3aed' }}>
                    📖
                  </div>
                  <div className="ae-feature-card-title">Disaster Information</div>
                  <div className="ae-feature-card-desc">
                    Access early warnings, safety tips, historical logs, and disaster preparedness guides.
                  </div>
                </div>
                <div className="ae-feature-card-link">→</div>
              </div>

              {/* Card 5: Reports & Analytics */}
              <div
                className="ae-feature-card"
                onClick={() => navigateToWeather(isOfficerOrAdmin ? 'analytics' : 'history')}
              >
                <div>
                  <div className="ae-feature-card-icon" style={{ background: '#ffedd5', color: '#ea580c' }}>
                    📊
                  </div>
                  <div className="ae-feature-card-title">Reports & Analytics</div>
                  <div className="ae-feature-card-desc">
                    View verified sensor telemetry and AI prediction accuracy metrics for informed decisions.
                  </div>
                </div>
                <div className="ae-feature-card-link">→</div>
              </div>
            </div>

            {/* 3-Column Bottom Overview Grid (Latest Alerts, Quick Access, Hazard Map) */}
            <div className="ae-dashboard-bottom-grid">
              {/* Left Column: Latest Alerts */}
              <div className="ae-panel-card">
                <div className="ae-panel-header">
                  <div className="ae-panel-title">
                    <span>🔔</span>
                    <span>Latest Alerts</span>
                  </div>
                  <span
                    className="ae-panel-action"
                    onClick={() => navigateToWeather('dashboard')}
                  >
                    View All →
                  </span>
                </div>

                <div className="ae-alert-item" onClick={() => navigateToWeather('dashboard')}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{
                        background: '#fee2e2',
                        color: '#dc2626',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 6
                      }}>
                        High
                      </span>
                      <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>
                        Heavy Rainfall Warning – Western Province
                      </strong>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Issued on 12 Sep 2025, 10:30 AM
                    </div>
                  </div>
                  <span style={{ color: '#94a3b8' }}>›</span>
                </div>

                <div className="ae-alert-item" onClick={() => navigateToWeather('dashboard')}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{
                        background: '#fef3c7',
                        color: '#d97706',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 6
                      }}>
                        Medium
                      </span>
                      <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>
                        Strong Winds Expected – Southern Coast
                      </strong>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Issued on 12 Sep 2025, 08:15 AM
                    </div>
                  </div>
                  <span style={{ color: '#94a3b8' }}>›</span>
                </div>

                <div className="ae-alert-item" onClick={() => navigateToWeather('dashboard')}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{
                        background: '#fef9c3',
                        color: '#ca8a04',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 6
                      }}>
                        Low
                      </span>
                      <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>
                        Flood Risk Alert – Kegalle District
                      </strong>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Issued on 11 Sep 2025, 05:40 PM
                    </div>
                  </div>
                  <span style={{ color: '#94a3b8' }}>›</span>
                </div>
              </div>

              {/* Center Column: Quick Access (Dark Blue Card with Sri Lanka Motif) */}
              <div className="ae-quick-access-panel">
                <div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.15rem', fontWeight: 800, marginBottom: '1.15rem', color: '#ffffff' }}>
                    Quick Access
                  </div>

                  <div className="ae-quick-access-item" onClick={() => navigateToWeather('dashboard')}>
                    <span>⚠️ Report a Disaster</span>
                    <span>→</span>
                  </div>

                  <div className="ae-quick-access-item" onClick={() => navigateToRecovery('shelters')}>
                    <span>⛺ Find Nearest Safe Shelter</span>
                    <span>→</span>
                  </div>

                  <div className="ae-quick-access-item" onClick={() => navigateToRecovery('aid')}>
                    <span>🛣️ View Evacuation Routes</span>
                    <span>→</span>
                  </div>

                  <div className="ae-quick-access-item" onClick={() => alert('Emergency hotline: 117 (Disaster Management Centre) or 119 (Police Emergency)')}>
                    <span>📞 Contact Emergency Services</span>
                    <span>→</span>
                  </div>
                </div>

                <div style={{
                  borderTop: '1px solid rgba(255,255,255,0.12)',
                  paddingTop: '0.85rem',
                  marginTop: '1rem',
                  fontSize: '0.75rem',
                  color: '#93c5fd',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span>📞</span>
                  <span><strong>Emergency Hotline: 117</strong> | Disaster Management Centre</span>
                </div>
              </div>

              {/* Right Column: Hazard Map Preview */}
              <div className="ae-panel-card">
                <div className="ae-panel-header">
                  <div className="ae-panel-title">
                    <span>🗺️</span>
                    <span>Hazard Map</span>
                  </div>
                  <span
                    className="ae-panel-action"
                    onClick={() => navigateToWeather('dashboard')}
                  >
                    View Full Map →
                  </span>
                </div>

                {/* Sri Lanka Heat Map Preview Graphic */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-around',
                  marginBottom: '1rem'
                }}>
                  {/* Island Graphic with Heat zones */}
                  <svg width="100" height="130" viewBox="0 0 100 130" fill="none">
                    <path
                      d="M50 10 C56 12 60 18 60 23 C60 28 57 32 58 37 C60 43 67 47 69 53 C71 61 68 69 65 76 C62 84 56 93 50 93 C44 93 40 86 40 80 C40 73 43 68 43 62 C43 55 39 50 41 43 C43 37 47 31 48 23 C49 18 48 10 50 10 Z"
                      fill="#86efac"
                      stroke="#4ade80"
                      strokeWidth="1.5"
                    />
                    {/* Moderate Risk Zone (Central highlands) */}
                    <circle cx="53" cy="62" r="14" fill="#fde047" opacity="0.85" />
                    {/* High Risk Spot (South-West) */}
                    <circle cx="48" cy="70" r="8" fill="#f87171" opacity="0.9" />
                  </svg>

                  {/* Legend */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.75rem', color: '#475569' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                      <span>High Risk</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                      <span>Moderate Risk</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#eab308' }} />
                      <span>Low Risk</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                      <span>Normal</span>
                    </div>
                  </div>
                </div>

                {/* Tip Bubble */}
                <div style={{
                  background: '#eff6ff',
                  borderRadius: 10,
                  padding: '0.65rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.775rem',
                  color: '#1e40af'
                }}>
                  <span>ℹ️</span>
                  <span>Stay informed, stay safe. Live satellite sensor telemetry refreshed every 30m.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            WEATHER INTELLIGENCE MODULE WORKSPACE
           ========================================================================= */}
        {currentView === 'weather' && (
          <main>
            {weatherTab === 'dashboard' && <WeatherDashboardPage />}
            {weatherTab === 'review' && (
              isOfficerOrAdmin
                ? <AlertReviewQueuePage />
                : <div style={{ color: '#b91c1c', background: '#fee2e2', padding: '1rem', borderRadius: 8 }}>
                    Access restricted to Disaster Officers.
                  </div>
            )}
            {weatherTab === 'history' && <PredictionHistoryPage />}
            {weatherTab === 'analytics' && (
              isOfficerOrAdmin
                ? <AnalyticsPage />
                : <div style={{ color: '#b91c1c', background: '#fee2e2', padding: '1rem', borderRadius: 8 }}>
                    Access restricted to Disaster Officers.
                  </div>
            )}
          </main>
        )}

        {/* =========================================================================
            RECOVERY & COMMUNITY SUPPORT MODULE WORKSPACE
           ========================================================================= */}
        {currentView === 'recovery' && (
          <main>
            {recoveryTab === 'dashboard' && <RecoveryDashboardPage />}
            {recoveryTab === 'shelters' && <ShelterManagementPage />}
            {recoveryTab === 'aid' && <AidRequestsPage />}
            {recoveryTab === 'donations' && <DonationsPage />}
            {recoveryTab === 'compensation' && <CompensationPage />}
            {recoveryTab === 'planning' && <RecoveryPlanningPage />}
            {recoveryTab === 'reports' && <RecoveryReportsPage />}
          </main>
        )}
      </div>

      {/* Main Footer (Matching Reference) */}
      <footer style={{
        backgroundColor: '#07162c',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '1.5rem 2.5rem',
        color: '#94a3b8',
        fontSize: '0.8rem',
        marginTop: '3rem'
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <AegisLogo size={32} lightText={true} />
            <span style={{ color: '#475569' }}>|</span>
            <span style={{ color: '#cbd5e1' }}>Resilient Communities &nbsp;•&nbsp; A Safer Tomorrow</span>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div>© 2025–2026 Aegis-LK. All rights reserved.</div>
            <div style={{ color: '#64748b', fontSize: '0.725rem', marginTop: 2 }}>
              Ministry of Disaster Management, Democratic Socialist Republic of Sri Lanka
            </div>
          </div>
        </div>
      </footer>
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
        backgroundColor: '#091322',
        color: '#94a3b8',
        fontFamily: "'Inter', system-ui, sans-serif"
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <AegisLogo size={56} showText={false} />
          </div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.25rem', fontWeight: 700, color: '#ffffff' }}>
            Aegis-LK
          </div>
          <div style={{ color: '#38bdf8', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Initializing Secure Disaster Platform...
          </div>
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
