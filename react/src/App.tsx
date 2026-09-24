import React, { useState, useEffect } from 'react';
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
  NGOManagementPage,
} from './features/recovery';
import {
  WeatherDashboardPage,
  AlertReviewQueuePage,
  PredictionHistoryPage,
  AnalyticsPage,
  fetchAlerts,
  WeatherAlert,
} from './features/weather';

import {
  IncidentQueuePage,
  IncidentDashboardPage,
  IncidentFullDetailPage,
  IncidentLogPage,
} from './features/incident';

type NavView = 'home' | 'weather' | 'recovery' | 'incident';

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
  const [incidentTab, setIncidentTab] = useState<string>('dashboard');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [latestAlerts, setLatestAlerts] = useState<WeatherAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (currentView === 'home') {
      setAlertsLoading(true);
      fetchAlerts({ status: 'Published', pageSize: 4 })
        .then(res => {
          if (active) {
            setLatestAlerts(res.items || []);
            setAlertsLoading(false);
          }
        })
        .catch(err => {
          console.error('Failed to load published alerts:', err);
          if (active) setAlertsLoading(false);
        });
    }
    return () => { active = false; };
  }, [currentView]);

  const isOfficerOrAdmin = user?.role === 'DisasterOfficer' || user?.role === 'Admin';

  // Role-filtered tabs for Weather module
  const WEATHER_TABS = [
    { id: 'dashboard', label: '🌦️ Forecast & Live Risk' },
    ...(isOfficerOrAdmin ? [{ id: 'review', label: '🔔 Alert Review Queue' }] : []),
    { id: 'history', label: '📜 Alert History' },
    ...(isOfficerOrAdmin ? [{ id: 'analytics', label: '📊 Accuracy Analytics' }] : []),
  ];

   const INCIDENT_TABS = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'all', label: '📋 All Incidents' },
    { id: 'Reported', label: '📥 Reported' },
    { id: 'OnHold', label: '⏸️ On Hold' },
    { id: 'Rejected', label: '🚫 Rejected' },
    { id: 'MissionApproved', label: '✅ Approved' },
    { id: 'Closed', label: '📁 Closed' },
    { id: 'log', label: '📋 Activity Log' },
  ];

  // Navigation tabs for Recovery module (available across roles)
  const RECOVERY_TABS = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'shelters', label: '⛺ Emergency Shelters' },
    { id: 'aid', label: '🤝 Aid Applications' },
    { id: 'donations', label: '📦 Donations' },
    { id: 'compensation', label: '💳 Compensation' },
    { id: 'ngos', label: '🏢 Partner NGOs' },
    { id: 'planning', label: '🤖 Agentic AI Planning' },
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

  // Allow deep navigation from sub-components
  useEffect(() => {
    const handleRecoveryNav = (e: CustomEvent<string>) => {
      if (e.detail) {
        setCurrentView('recovery');
        setRecoveryTab(e.detail);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('aegis:navigate-recovery' as any, handleRecoveryNav);
    return () => window.removeEventListener('aegis:navigate-recovery' as any, handleRecoveryNav);
  }, []);

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
            onClick={() => setCurrentView('incident')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              borderRadius: 8,
              border: 'none',
              background: currentView === 'incident' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: currentView === 'incident' ? '#38bdf8' : '#cbd5e1',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <span>🚨</span>
            <span>Incidents</span>
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
          {(currentView === 'weather' ? WEATHER_TABS : currentView === 'incident' ? INCIDENT_TABS : RECOVERY_TABS).map((tab) => {
            const active = (currentView === 'weather' ? weatherTab : currentView === 'incident' ? incidentTab : recoveryTab) === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => currentView === 'weather' ? setWeatherTab(tab.id) : currentView === 'incident' ? setIncidentTab(tab.id) : setRecoveryTab(tab.id)}
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

                {/* Right Decorative Badge (Stronger Together Ribbon matching Reference) */}
                <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', alignSelf: 'flex-end' }}>
                  <div style={{
                    textAlign: 'right',
                    background: 'rgba(7, 23, 46, 0.75)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    padding: '0.75rem 1.65rem',
                    borderRadius: 30,
                    boxShadow: '0 12px 30px rgba(0,0,0,0.45)'
                  }}>
                    <div style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontStyle: 'italic',
                      fontWeight: 800,
                      fontSize: '1.35rem',
                      color: '#ffffff',
                      letterSpacing: '-0.01em',
                      textShadow: '0 2px 10px rgba(0,0,0,0.6)'
                    }}>
                      Stronger Together
                    </div>
                    <div style={{
                      height: 4,
                      width: 100,
                      marginLeft: 'auto',
                      marginTop: '0.35rem',
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
                    onClick={() => navigateToWeather('history')}
                  >
                    View All →
                  </span>
                </div>

                {alertsLoading ? (
                  <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                    ⏳ Loading latest published alerts…
                  </div>
                ) : latestAlerts.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '2rem 1rem',
                    background: '#f8fafc',
                    borderRadius: 12,
                    border: '1px dashed #cbd5e1',
                    color: '#64748b'
                  }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>✅</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.2rem' }}>
                      No Active Published Alerts
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      All monitored districts are currently operating under normal baseline conditions.
                    </div>
                  </div>
                ) : (
                  latestAlerts.map(alert => {
                    const isHigh = alert.severity === 'High';
                    const hIcon = alert.hazardType === 'Flood' ? '🌊' : alert.hazardType === 'Landslide' ? '⛰️' : '💨';
                    const issuedDate = alert.publishedAt ?? alert.createdAt;

                    return (
                      <div
                        key={alert.id}
                        className="ae-alert-item"
                        onClick={() => navigateToWeather('history')}
                        title={alert.message}
                      >
                        <div style={{ flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                            <span style={{
                              background: isHigh ? '#fee2e2' : '#fef3c7',
                              color: isHigh ? '#991b1b' : '#92400e',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 6
                            }}>
                              {alert.severity}
                            </span>
                            <span style={{ fontSize: '0.85rem' }}>{hIcon}</span>
                            <strong style={{
                              fontSize: '0.875rem',
                              color: '#0f172a',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '260px'
                            }}>
                              {alert.hazardType} Warning – {alert.districtName ?? 'Sri Lanka'}
                            </strong>
                          </div>
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#475569',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '320px',
                            lineHeight: 1.4
                          }}>
                            {alert.message}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem' }}>
                            Issued {new Date(issuedDate).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                        </div>
                        <span style={{ color: '#94a3b8', fontSize: '1.25rem', marginLeft: 'auto' }}>›</span>
                      </div>
                    );
                  })
                )}
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

                {/* Live wind map — Windy.com free embed, centered on Sri Lanka */}
                <div style={{
                  borderRadius: 14,
                  overflow: 'hidden',
                  border: '1px solid #e2e8f0',
                  marginBottom: '1rem',
                  height: 220,
                }}>
                  <iframe
                    title="Sri Lanka live wind map"
                    src="https://embed.windy.com/embed2.html?lat=7.87&lon=80.77&zoom=7&level=surface&overlay=wind&product=ecmwf&menu=&message=true&marker=&calendar=now&pressure=&type=map&location=coordinates&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    loading="lazy"
                    style={{ display: 'block' }}
                  />
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
            {recoveryTab === 'dashboard' && <RecoveryDashboardPage onNavigate={(tab) => setRecoveryTab(tab)} />}
            {recoveryTab === 'shelters' && <ShelterManagementPage />}
            {recoveryTab === 'aid' && <AidRequestsPage />}
            {recoveryTab === 'donations' && <DonationsPage />}
            {recoveryTab === 'compensation' && <CompensationPage />}
            {recoveryTab === 'ngos' && <NGOManagementPage />}
            {recoveryTab === 'planning' && <RecoveryPlanningPage />}
            {recoveryTab === 'reports' && <RecoveryReportsPage />}
          </main>
        )}

        {currentView === 'incident' && (
          <main>
            {incidentTab === 'detail' && selectedIncidentId ? (
              <IncidentFullDetailPage
                incidentId={selectedIncidentId}
                onBack={() => setIncidentTab('all')}
              />
            ) : (
              <>
                {incidentTab === 'dashboard' && (
                  <IncidentDashboardPage
                    onNavigate={(tab) => setIncidentTab(tab)}
                  />
                )}
                {incidentTab === 'all' && (
                  <IncidentQueuePage
                    title="All Incidents"
                    onNavigate={(tab, incidentId) => {
                      if (tab === 'detail' && incidentId) {
                        setSelectedIncidentId(incidentId);
                      }
                      setIncidentTab(tab);
                    }}
                  />
                )}
                {['Reported', 'Assessed', 'OnHold', 'Rejected', 'MissionApproved', 'Closed'].includes(incidentTab) && (
                  <IncidentQueuePage
                    key={incidentTab}
                    fixedStatus={incidentTab as any}
                    title={`${incidentTab} Incidents`}
                    onNavigate={(tab, incidentId) => {
                      if (tab === 'detail' && incidentId) {
                        setSelectedIncidentId(incidentId);
                      }
                      setIncidentTab(tab);
                    }}
                  />
                )}
                {incidentTab === 'log' && <IncidentLogPage />}
              </>
            )}
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
