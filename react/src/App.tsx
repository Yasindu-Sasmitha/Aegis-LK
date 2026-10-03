import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './shared/auth/AuthContext';
import { LoginPage } from './shared/auth/LoginPage';
import { RegisterPage } from './shared/auth/RegisterPage';
import { AegisLogo } from './shared/components/AegisLogo';
import {
  AlertTriangleIcon,
  ShieldIcon,
  UsersIcon,
  PackageIcon,
  BookOpenIcon,
  BarChartIcon,
  BellIcon,
  MapPinIcon,
  CompassIcon,
  HomeIcon,
  PhoneIcon,
  InfoIcon,
  CheckCircleIcon,
  ClockIcon,
  CloudRainIcon,
  MountainIcon,
  WindIcon,
  ArrowRightIcon,
  ArrowUpIcon,
} from './shared/components/Icons';
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
  AlertHistoryPage,
  AnalyticsPage,
  fetchAlerts,
  WeatherAlert,
} from './features/weather';

import {
  IncidentQueuePage,
  IncidentDashboardPage,
  IncidentFullDetailPage,
} from './features/incident';
import {
  ResourceDashboardPage,
  WarehouseManagementPage,
  InventoryManagementPage,
  DispatchManagementPage,
} from './features/resource';
import { UserManagementPage } from './features/admin';

type NavView = 'home' | 'weather' | 'recovery' | 'resource' | 'incident' | 'user-management';

const ROLE_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  Admin: { label: 'Admin', color: '#c084fc', bg: 'rgba(192,132,252,0.15)' },
  DisasterOfficer: { label: 'Disaster Officer', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
  Responder: { label: 'Responder', color: '#fcd34d', bg: 'rgba(252,211,77,0.15)' },
  Citizen: { label: 'Citizen', color: '#6ee7b7', bg: 'rgba(110,231,183,0.15)' },
};

/**
 * Access control for the Resource module. Only Admin, DisasterOfficer and
 * Responder may view warehouse / inventory / dispatch data. Citizens are
 * blocked at the module level (matching the Aegis-LK RBAC matrix).
 */
const RESOURCE_ALLOWED_ROLES = ['Admin', 'DisasterOfficer', 'Responder'];

const MainPlatform: React.FC = () => {
  const { user, logout } = useAuth();
  const [currentView, setCurrentView] = useState<NavView>('home');
  const [weatherTab, setWeatherTab] = useState<string>('dashboard');
  const [recoveryTab, setRecoveryTab] = useState<string>('dashboard');
  const [resourceTab, setResourceTab] = useState<string>('dashboard');
  const [resourceRefreshKey, setResourceRefreshKey] = useState<number>(0);
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

  // Support direct hash scrolling (e.g. #about-aegis)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (currentView === 'home' && window.location.hash === '#about-aegis') {
      timer = setTimeout(() => {
        document.getElementById('about-aegis')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [currentView]);

  const isOfficerOrAdmin = user?.role === 'DisasterOfficer' || user?.role === 'Admin';
  const canAccessResources = RESOURCE_ALLOWED_ROLES.includes(user?.role ?? '');

  // If a Citizen somehow ends up in the resource view, bounce them home.
  useEffect(() => {
    if (currentView === 'resource' && !canAccessResources) {
      setCurrentView('home');
    }
  }, [currentView, canAccessResources]);

  // If a non-admin somehow ends up in the user-management view, bounce them home.
  useEffect(() => {
    if (currentView === 'user-management' && user?.role !== 'Admin') {
      setCurrentView('home');
    }
  }, [currentView, user?.role]);

  // Role-filtered tabs for Weather module
  const WEATHER_TABS = [
    { id: 'dashboard', label: 'Forecast & Live Risk' },
    ...(isOfficerOrAdmin ? [{ id: 'review', label: 'Alert Review Queue' }] : []),
    { id: 'predictions', label: 'Prediction History' },
    { id: 'history', label: 'Alert History' },
    ...(isOfficerOrAdmin ? [{ id: 'analytics', label: 'Accuracy Analytics' }] : []),
  ];

  // Navigation tabs for Incident module
  const INCIDENT_TABS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'all', label: 'All Incidents' },
    { id: 'Reported', label: 'Reported' },
    { id: 'Assessed', label: 'Assessed' },
    { id: 'OnHold', label: 'On Hold' },
    { id: 'Rejected', label: 'Rejected' },
    { id: 'MissionApproved', label: 'Approved' },
    { id: 'Closed', label: 'Closed' },
  ];

  // Navigation tabs for Recovery module (available across roles)
  const RECOVERY_TABS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'shelters', label: 'Emergency Shelters' },
    { id: 'aid', label: 'Aid Applications' },
    { id: 'donations', label: 'Donations' },
    { id: 'compensation', label: 'Compensation' },
    { id: 'ngos', label: 'Partner NGOs' },
    { id: 'planning', label: 'Agentic AI Planning' },
    { id: 'reports', label: 'Audit Reports' },
  ];

  const RESOURCE_TABS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'warehouses', label: 'Warehouses' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'dispatch', label: 'Dispatch & Allocation' },
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

  const navigateToResource = (tab = 'dashboard') => {
    // Defence-in-depth: reject navigation for roles without access.
    if (!canAccessResources) {
      alert('Access restricted to Admin, Disaster Officer and Responder roles.');
      return;
    }
    setCurrentView('resource');
    setResourceTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToIncident = (tab = 'dashboard') => {
    setCurrentView('incident');
    setIncidentTab(tab);
    setSelectedIncidentId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToUserManagement = () => {
    if (user?.role !== 'Admin') {
      alert('Access restricted to System Administrators.');
      return;
    }
    setCurrentView('user-management');
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
      {/* Top Main Navigation Bar */}
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
              gap: '0.45rem',
              padding: '0.5rem 1rem',
              borderRadius: 8,
              border: 'none',
              background: currentView === 'home' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: currentView === 'home' ? '#38bdf8' : '#cbd5e1',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <HomeIcon size={16} />
            <span>Home</span>
          </button>

          <button
            onClick={() => navigateToWeather('dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 1rem',
              borderRadius: 8,
              border: 'none',
              background: currentView === 'weather' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: currentView === 'weather' ? '#38bdf8' : '#cbd5e1',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <CloudRainIcon size={16} />
            <span>Weather Intelligence</span>
          </button>

          <button
            onClick={() => navigateToRecovery('dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 1rem',
              borderRadius: 8,
              border: 'none',
              background: currentView === 'recovery' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: currentView === 'recovery' ? '#38bdf8' : '#cbd5e1',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <ShieldIcon size={16} />
            <span>Recovery & Relief</span>
          </button>

          {/* Resources — hidden for Citizens */}
          {canAccessResources && (
            <button
              onClick={() => navigateToResource('dashboard')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 1rem',
                borderRadius: 8,
                border: 'none',
                background: currentView === 'resource' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                color: currentView === 'resource' ? '#38bdf8' : '#cbd5e1',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <PackageIcon size={16} />
              <span>Resources</span>
            </button>
          )}

          <button
            onClick={() => navigateToIncident('dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 1rem',
              borderRadius: 8,
              border: 'none',
              background: currentView === 'incident' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
              color: currentView === 'incident' ? '#38bdf8' : '#cbd5e1',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <AlertTriangleIcon size={16} />
            <span>Incidents</span>
          </button>

          {/* User Management — Admin Only */}
          {user?.role === 'Admin' && (
            <button
              onClick={navigateToUserManagement}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 1rem',
                borderRadius: 8,
                border: 'none',
                background: currentView === 'user-management' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                color: currentView === 'user-management' ? '#38bdf8' : '#cbd5e1',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <UsersIcon size={16} />
              <span>User Management</span>
            </button>
          )}

          <button
            onClick={() => navigateToWeather(isOfficerOrAdmin ? 'analytics' : 'history')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 1rem',
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: '#94a3b8',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer',
            }}
          >
            <BarChartIcon size={16} />
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
                fontSize: '0.675rem', fontWeight: 700,
                color: roleBadge.color, backgroundColor: roleBadge.bg,
                padding: '2px 8px', borderRadius: 10,
                border: `1px solid ${roleBadge.color}40`,
                textTransform: 'uppercase', letterSpacing: '0.03em'
              }}>
                {roleBadge.label}
              </span>
              {user?.district && (
                <span style={{ color: '#94a3b8', fontSize: '0.725rem', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <MapPinIcon size={12} color="#94a3b8" />
                  {user.district}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={logout}
            style={{
              padding: '0.45rem 0.95rem',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: 8, color: '#fca5a5',
              fontSize: '0.825rem', fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s ease',
            }}
            title="Sign out of Aegis-LK"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Sub-header Module Nav */}
      {currentView !== 'home' && currentView !== 'user-management' && (
        <div style={{
          backgroundColor: '#0c2242',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '0 2.5rem', display: 'flex', gap: '0.5rem',
          overflowX: 'auto', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          {(currentView === 'weather' ? WEATHER_TABS : currentView === 'incident' ? INCIDENT_TABS : currentView === 'resource' ? RESOURCE_TABS : RECOVERY_TABS).map((tab) => {
            const active = (currentView === 'weather' ? weatherTab : currentView === 'incident' ? incidentTab : currentView === 'resource' ? resourceTab : recoveryTab) === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => currentView === 'weather' ? setWeatherTab(tab.id) : currentView === 'incident' ? setIncidentTab(tab.id) : currentView === 'resource' ? setResourceTab(tab.id) : setRecoveryTab(tab.id)}
                style={{
                  padding: '0.85rem 1.15rem', background: 'transparent', border: 'none',
                  borderBottom: active ? '3px solid #38bdf8' : '3px solid transparent',
                  color: active ? '#ffffff' : '#94a3b8',
                  fontWeight: active ? 700 : 500, fontSize: '0.875rem',
                  cursor: 'pointer', whiteSpace: 'nowrap',
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

        {/* ============ HOME OVERVIEW VIEW ============ */}
        {currentView === 'home' && (
          <div>
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
                      onClick={() => navigateToIncident('dashboard')}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <AlertTriangleIcon size={18} color="#ffffff" />
                      <span>Report an Emergency</span>
                      <ArrowRightIcon size={16} color="#ffffff" />
                    </button>

                    <button
                      className="ae-hero-btn-outline"
                      onClick={() => {
                        const el = document.getElementById('about-aegis');
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <BookOpenIcon size={18} />
                      <span>Learn More</span>
                    </button>
                  </div>
                </div>

                {/* Right Decorative Badge */}
                <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', alignSelf: 'flex-end' }}>
                  <div style={{
                    textAlign: 'right', background: 'rgba(7, 23, 46, 0.75)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    padding: '0.75rem 1.65rem', borderRadius: 30,
                    boxShadow: '0 12px 30px rgba(0,0,0,0.45)'
                  }}>
                    <div style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontStyle: 'italic', fontWeight: 800,
                      fontSize: '1.35rem', color: '#ffffff',
                      letterSpacing: '-0.01em',
                      textShadow: '0 2px 10px rgba(0,0,0,0.6)'
                    }}>
                      Stronger Together
                    </div>
                    <div style={{
                      height: 4, width: 100, marginLeft: 'auto', marginTop: '0.35rem',
                      borderRadius: 2,
                      background: 'linear-gradient(90deg, #f59e0b 0%, #ef4444 50%, #10b981 100%)'
                    }} />
                  </div>
                </div>
              </div>
            </div>

            {/* 6 Feature Cards Row */}
            <div className="ae-feature-cards-grid">
              <div className="ae-feature-card" onClick={() => navigateToWeather('dashboard')}>
                <div>
                  <div className="ae-feature-card-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>
                    <AlertTriangleIcon size={22} color="#dc2626" />
                  </div>
                  <div className="ae-feature-card-title">Emergency Alerts</div>
                  <div className="ae-feature-card-desc">Get real-time alerts for natural hazards, flash floods, and severe weather emergencies.</div>
                </div>
                <div className="ae-feature-card-link">
                  <ArrowRightIcon size={16} />
                </div>
              </div>

              <div className="ae-feature-card" onClick={() => navigateToRecovery('aid')}>
                <div>
                  <div className="ae-feature-card-icon" style={{ background: '#d1fae5', color: '#059669' }}>
                    <UsersIcon size={22} color="#059669" />
                  </div>
                  <div className="ae-feature-card-title">Community Support</div>
                  <div className="ae-feature-card-desc">Connect with nearby volunteers, aid programs, and local community support networks.</div>
                </div>
                <div className="ae-feature-card-link">
                  <ArrowRightIcon size={16} />
                </div>
              </div>

              <div className="ae-feature-card" onClick={() => navigateToRecovery('donations')}>
                <div>
                  <div className="ae-feature-card-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>
                    <ShieldIcon size={22} color="#2563eb" />
                  </div>
                  <div className="ae-feature-card-title">Recovery Management</div>
                  <div className="ae-feature-card-desc">Coordinate post-disaster recovery efforts, track reconstruction progress, and manage long-term rehabilitation plans.</div>
                </div>
                <div className="ae-feature-card-link">
                  <ArrowRightIcon size={16} />
                </div>
              </div>

              {/* Card 4: Resource Management */}
              <div
                className="ae-feature-card"
                onClick={() => navigateToResource('dashboard')} 
              >
                <div>
                  <div className="ae-feature-card-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>
                    <PackageIcon size={22} color="#16a34a" />
                  </div>
                  <div className="ae-feature-card-title">Resource Management</div>
                  <div className="ae-feature-card-desc">
                    Track emergency resources, ration supplies, relief warehouses, and distribution routes.
                  </div>
                  <div className="ae-feature-card-link">→</div>
                </div>
                <div className="ae-feature-card-link">
                  <ArrowRightIcon size={16} />
                </div>
              </div>

              <div className="ae-feature-card" onClick={() => navigateToWeather('history')}>
                <div>
                  <div className="ae-feature-card-icon" style={{ background: '#ede9fe', color: '#7c3aed' }}>
                    <BookOpenIcon size={22} color="#7c3aed" />
                  </div>
                  <div className="ae-feature-card-title">Disaster Information</div>
                  <div className="ae-feature-card-desc">Access early warnings, safety tips, historical logs, and disaster preparedness guides.</div>
                </div>
                <div className="ae-feature-card-link">
                  <ArrowRightIcon size={16} />
                </div>
              </div>

              <div className="ae-feature-card" onClick={() => navigateToWeather(isOfficerOrAdmin ? 'analytics' : 'history')}>
                <div>
                  <div className="ae-feature-card-icon" style={{ background: '#ffedd5', color: '#ea580c' }}>
                    <BarChartIcon size={22} color="#ea580c" />
                  </div>
                  <div className="ae-feature-card-title">Reports & Analytics</div>
                  <div className="ae-feature-card-desc">View verified sensor telemetry and AI prediction accuracy metrics for informed decisions.</div>
                </div>
                <div className="ae-feature-card-link">
                  <ArrowRightIcon size={16} />
                </div>
              </div>
            </div>

            {/* Bottom Grid */}
            <div className="ae-dashboard-bottom-grid">
              {/* Left Column: Latest Alerts */}
              <div className="ae-panel-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="ae-panel-header">
                  <div className="ae-panel-title">
                    <BellIcon size={18} color="#0284c7" />
                    <span>Latest Alerts</span>
                  </div>
                  <span className="ae-panel-action" onClick={() => navigateToWeather('history')}>
                    View All →
                  </span>
                </div>

                {alertsLoading ? (
                  <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <ClockIcon size={16} color="#64748b" />
                    <span>Loading latest published alerts…</span>
                  </div>
                ) : latestAlerts.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '2rem 1rem',
                    background: '#f8fafc',
                    borderRadius: 12,
                    border: '1px dashed #cbd5e1',
                    color: '#64748b',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <CheckCircleIcon size={32} color="#10b981" />
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', marginTop: '0.5rem', marginBottom: '0.2rem' }}>
                      No Active Published Alerts
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      All monitored districts are currently operating under normal baseline conditions.
                    </div>
                  </div>
                ) : (
                  latestAlerts.map(alert => {
                    const isHigh = alert.severity === 'High';
                    const HazardIconComponent = alert.hazardType === 'Flood'
                      ? CloudRainIcon
                      : alert.hazardType === 'Landslide'
                        ? MountainIcon
                        : WindIcon;
                    const issuedDate = alert.publishedAt ?? alert.createdAt;

                    return (
                      <div key={alert.id} className="ae-alert-item" onClick={() => navigateToWeather('history')} title={alert.message}>
                        <div style={{ flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                            <span style={{
                              background: isHigh ? '#fee2e2' : '#fef3c7',
                              color: isHigh ? '#991b1b' : '#92400e',
                              fontSize: '0.7rem', fontWeight: 700,
                              padding: '2px 8px', borderRadius: 6
                            }}>
                              {alert.severity}
                            </span>
                            <HazardIconComponent size={14} color="#64748b" />
                            <strong style={{
                              fontSize: '0.875rem', color: '#0f172a',
                              whiteSpace: 'nowrap', overflow: 'hidden',
                              textOverflow: 'ellipsis', maxWidth: '260px'
                            }}>
                              {alert.hazardType} Warning – {alert.districtName ?? 'Sri Lanka'}
                            </strong>
                          </div>
                          <div style={{
                            fontSize: '0.75rem', color: '#475569',
                            whiteSpace: 'nowrap', overflow: 'hidden',
                            textOverflow: 'ellipsis', maxWidth: '320px', lineHeight: 1.4
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

              {/* Center Column: Quick Access (Compact, Professional Dark Card) */}
              <div className="ae-quick-access-panel">
                <div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.85rem', color: '#ffffff' }}>
                    Quick Access
                  </div>

                  <div className="ae-quick-access-item" onClick={() => navigateToIncident('dashboard')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertTriangleIcon size={15} color="#fca5a5" />
                      <span>Report a Disaster</span>
                    </span>
                    <ArrowRightIcon size={14} color="#94a3b8" />
                  </div>

                  <div className="ae-quick-access-item" onClick={() => navigateToRecovery('shelters')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <HomeIcon size={15} color="#93c5fd" />
                      <span>Find Nearest Safe Shelter</span>
                    </span>
                    <ArrowRightIcon size={14} color="#94a3b8" />
                  </div>

                  <div className="ae-quick-access-item" onClick={() => navigateToRecovery('aid')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CompassIcon size={15} color="#a7f3d0" />
                      <span>View Evacuation Routes</span>
                    </span>
                    <ArrowRightIcon size={14} color="#94a3b8" />
                  </div>

                  <div className="ae-quick-access-item" onClick={() => alert('Emergency hotlines: 117 (Disaster Management Centre) or 119 (Police Emergency)')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <PhoneIcon size={15} color="#fde68a" />
                      <span>Contact Emergency Services</span>
                    </span>
                    <ArrowRightIcon size={14} color="#94a3b8" />
                  </div>
                </div>

                <div style={{
                  borderTop: '1px solid rgba(255,255,255,0.12)',
                  paddingTop: '0.65rem',
                  marginTop: '0.75rem',
                  fontSize: '0.725rem',
                  color: '#93c5fd',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem'
                }}>
                  <PhoneIcon size={13} color="#93c5fd" />
                  <span><strong>Emergency Hotline: 117</strong> | DMC</span>
                </div>
              </div>

              {/* Right Column: Dominant Large Hazard Map Preview */}
              <div className="ae-panel-card ae-hazard-map-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="ae-panel-header">
                  <div className="ae-panel-title">
                    <MapPinIcon size={18} color="#0284c7" />
                    <span>Hazard Map</span>
                  </div>
                  <span className="ae-panel-action" onClick={() => navigateToWeather('dashboard')}>
                    View Full Map →
                  </span>
                </div>

                {/* Live wind/hazard map — Windy embed centered on Sri Lanka */}
                <div style={{
                  borderRadius: 14, overflow: 'hidden',
                  border: '1px solid #e2e8f0',
                  marginBottom: '0.85rem',
                  flex: 1,
                  minHeight: 380,
                  boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.06)'
                }}>
                  <iframe
                    title="Sri Lanka live weather and hazard map"
                    src="https://embed.windy.com/embed2.html?lat=7.87&lon=80.77&zoom=7&level=surface&overlay=wind&product=ecmwf&menu=&message=true&marker=&calendar=now&pressure=&type=map&location=coordinates&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    loading="lazy"
                    style={{ display: 'block', minHeight: 380, width: '100%' }}
                  />
                </div>

                <div style={{
                  background: '#eff6ff', borderRadius: 10,
                  padding: '0.65rem 0.85rem',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  fontSize: '0.775rem', color: '#1e40af'
                }}>
                  <InfoIcon size={16} color="#2563eb" />
                  <span>Stay informed, stay safe. Live satellite sensor telemetry refreshed every 30m.</span>
                </div>
              </div>
            </div>

            {/* =========================================================================
                ABOUT AEGIS-LK / HOW THE SYSTEM WORKS (Anchor: #about-aegis)
               ========================================================================= */}
            <section
              id="about-aegis"
              style={{
                marginTop: '3.5rem',
                marginBottom: '1rem',
                background: '#ffffff',
                borderRadius: 20,
                border: '1px solid #e2e8f0',
                padding: '2.5rem',
                boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)',
              }}
            >
              <div style={{ maxWidth: 880, marginBottom: '2rem' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'rgba(2, 132, 199, 0.08)',
                  color: '#0284c7',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  padding: '4px 12px',
                  borderRadius: 20,
                  marginBottom: '0.85rem'
                }}>
                  <ShieldIcon size={13} color="#0284c7" />
                  <span>System Architecture & Overview</span>
                </div>

                <h2 style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: '1.85rem',
                  fontWeight: 800,
                  color: '#07162c',
                  letterSpacing: '-0.02em',
                  marginBottom: '0.75rem'
                }}>
                  About Aegis-LK — National Disaster Management Platform
                </h2>

                <p style={{
                  color: '#475569',
                  fontSize: '0.975rem',
                  lineHeight: 1.6,
                  margin: 0
                }}>
                  Aegis-LK is Sri Lanka's unified, intelligence-driven emergency management platform developed to interconnect citizens, local authorities, and national response agencies. By integrating multi-hazard meteorological forecasts, community incident verification, emergency supply logistics, and post-disaster recovery workflows into a single system, Aegis-LK accelerates emergency response times, protects vulnerable populations, and strengthens nationwide disaster resilience.
                </p>
              </div>

              {/* 4 Core Pillars Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.25rem',
                marginBottom: '2rem'
              }}>
                {/* Pillar 1 */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: '1.35rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem'
                }}>
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: '#e0f2fe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <CloudRainIcon size={20} color="#0284c7" />
                  </div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
                    Meteorological Intelligence
                  </div>
                  <div style={{ fontSize: '0.825rem', color: '#64748b', lineHeight: 1.5 }}>
                    Aggregates live weather telemetry from Open-Meteo, satellite sensors, and rainfall indices across all 25 districts with machine-learning hazard prediction and human-in-the-loop review.
                  </div>
                </div>

                {/* Pillar 2 */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: '1.35rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem'
                }}>
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: '#fee2e2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <AlertTriangleIcon size={20} color="#dc2626" />
                  </div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
                    Incident Verification & Triage
                  </div>
                  <div style={{ fontSize: '0.825rem', color: '#64748b', lineHeight: 1.5 }}>
                    Empowers citizens to submit geo-tagged incident reports with photo verification. AI agent pipelines conduct automated plausibility checks and deduplication to triage legitimate threats.
                  </div>
                </div>

                {/* Pillar 3 */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: '1.35rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem'
                }}>
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: '#dcfce7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <PackageIcon size={20} color="#16a34a" />
                  </div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
                    Resource Logistics & Safe Shelters
                  </div>
                  <div style={{ fontSize: '0.825rem', color: '#64748b', lineHeight: 1.5 }}>
                    Provides real-time visibility across regional relief warehouses, automated supply rationing, dispatch convoy tracking, and evacuation shelter capacity coordination.
                  </div>
                </div>

                {/* Pillar 4 */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: '1.35rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem'
                }}>
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: '#f3e8ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <ShieldIcon size={20} color="#7c3aed" />
                  </div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
                    Recovery & Citizen Rehabilitation
                  </div>
                  <div style={{ fontSize: '0.825rem', color: '#64748b', lineHeight: 1.5 }}>
                    Coordinates post-disaster financial compensation claims, public donations, and partner NGO relief programs to ensure equitable, transparent community rehabilitation.
                  </div>
                </div>
              </div>

              {/* Bottom Bar inside Section */}
              <div style={{
                borderTop: '1px solid #e2e8f0',
                paddingTop: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                fontSize: '0.8rem',
                color: '#64748b'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <AegisLogo size={24} lightText={false} />
                  <span>Democratic Socialist Republic of Sri Lanka • Disaster Management Centre</span>
                </div>

                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    background: 'none',
                    border: 'none',
                    color: '#0284c7',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    padding: '4px 8px',
                    borderRadius: 6
                  }}
                >
                  <span>Back to top</span>
                  <ArrowUpIcon size={14} color="#0284c7" />
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ============ WEATHER MODULE ============ */}
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
            {weatherTab === 'predictions' && <PredictionHistoryPage />}
            {weatherTab === 'history' && <AlertHistoryPage />}
            {weatherTab === 'analytics' && (
              isOfficerOrAdmin
                ? <AnalyticsPage />
                : <div style={{ color: '#b91c1c', background: '#fee2e2', padding: '1rem', borderRadius: 8 }}>
                  Access restricted to Disaster Officers.
                </div>
            )}
          </main>
        )}

        {/* ============ RECOVERY MODULE ============ */}
        {currentView === 'recovery' && (
          <main key={recoveryTab} style={{ animation: 'fadeIn 0.18s ease-in-out' }}>
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

        {/* ============ RESOURCE MODULE ============ */}
        {currentView === 'resource' && (
          <main>
            {!canAccessResources ? (
              <div style={{
                maxWidth: 560, margin: '4rem auto', padding: '2.5rem',
                background: '#fff', borderRadius: 16,
                boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🔒</div>
                <h2 style={{ margin: '0 0 0.5rem', color: '#0f172a', fontSize: '1.5rem' }}>
                  Access Restricted
                </h2>
                <p style={{ color: '#64748b', margin: '0 0 1.25rem', lineHeight: 1.6 }}>
                  The Resource & Logistics module is available to Admin, Disaster Officer
                  and Responder roles only. Your current role is <strong>{user?.role}</strong>.
                </p>
                <button
                  onClick={() => setCurrentView('home')}
                  style={{
                    padding: '0.7rem 1.3rem', border: 'none', borderRadius: 10,
                    background: '#2563eb', color: '#fff',
                    fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem'
                  }}
                >
                  Back to Home
                </button>
              </div>
            ) : (
              <>
                {resourceTab === 'dashboard' && (
                  <ResourceDashboardPage
                    key={resourceRefreshKey}
                    onNavigate={(tab) => setResourceTab(tab)}
                    refreshKey={resourceRefreshKey}
                  />
                )}
                {resourceTab === 'warehouses' && (
                  <WarehouseManagementPage key={resourceRefreshKey} />
                )}
                {resourceTab === 'inventory' && (
                  <InventoryManagementPage key={resourceRefreshKey} />
                )}
                {resourceTab === 'dispatch' && <DispatchManagementPage />}
              </>
            )}
          </main>
        )}

        {/* ============ INCIDENT MODULE ============ */}
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
              </>
            )}
          </main>
        )}

        {/* ============ USER MANAGEMENT MODULE (ADMIN ONLY) ============ */}
        {currentView === 'user-management' && (
          <main>
            <UserManagementPage onNavigateHome={() => setCurrentView('home')} />
          </main>
        )}
      </div>

      {/* Main Footer */}
      <footer style={{
        backgroundColor: '#07162c',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '1.5rem 2.5rem',
        color: '#94a3b8', fontSize: '0.8rem', marginTop: '3rem'
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
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#091322', color: '#94a3b8',
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