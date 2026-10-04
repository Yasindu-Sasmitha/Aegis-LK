import React, { useState, useEffect, useRef } from 'react';
import { AegisLogo } from '../components/AegisLogo';
import {
  HomeIcon,
  CloudRainIcon,
  AlertTriangleIcon,
  PackageIcon,
  ShieldIcon,
  UsersIcon,
  ChevronDownIcon,
  MenuIcon,
  XIcon,
  MapPinIcon,
} from '../components/Icons';
import '../styles/navbar.css';
import type { User } from '../auth/authTypes';

export interface TabItem {
  id: string;
  label: string;
}

export interface NavbarProps {
  currentView: string;
  weatherTab: string;
  incidentTab: string;
  resourceTab: string;
  recoveryTab: string;
  canAccessResources: boolean;
  isOfficerOrAdmin: boolean;
  user: User | null;
  roleBadge: {
    label: string;
    color: string;
    bg: string;
  };
  weatherTabs: TabItem[];
  incidentTabs: TabItem[];
  resourceTabs: TabItem[];
  recoveryTabs: TabItem[];
  onNavigateHome: () => void;
  onNavigateWeather: (tab?: string) => void;
  onNavigateIncident: (tab?: string) => void;
  onNavigateResource: (tab?: string) => void;
  onNavigateRecovery: (tab?: string) => void;
  onNavigateUserManagement: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  weatherTab,
  incidentTab,
  resourceTab,
  recoveryTab,
  canAccessResources,
  isOfficerOrAdmin,
  user,
  roleBadge,
  weatherTabs,
  incidentTabs,
  resourceTabs,
  recoveryTabs,
  onNavigateHome,
  onNavigateWeather,
  onNavigateIncident,
  onNavigateResource,
  onNavigateRecovery,
  onNavigateUserManagement,
  onLogout,
}) => {
  // Glass scroll effect state
  const [isScrolled, setIsScrolled] = useState(false);

  // Active desktop hover dropdown menu key ('weather' | 'incident' | 'resource' | 'recovery' | null)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Mobile drawer state
  const [mobileOpen, setMobileOpen] = useState(false);

  // Expanded accordion section in mobile drawer
  const [mobileExpandedSection, setMobileExpandedSection] = useState<string | null>(null);

  // Closing delay timer ref to prevent flicker
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Glass effect scroll listener
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Check initial scroll offset
    setIsScrolled(window.scrollY > 20);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Keyboard accessibility: Escape closes dropdown or mobile menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDropdown(null);
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Desktop Hover handlers with 150ms closing grace period
  const handleMouseEnter = (menuKey: string) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setActiveDropdown(menuKey);
  };

  const handleMouseLeave = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  };

  const handleDropdownItemClick = (action: () => void) => {
    action();
    setActiveDropdown(null);
  };

  // Close mobile drawer and navigate
  const handleMobileNav = (action: () => void) => {
    action();
    setMobileOpen(false);
  };

  const toggleMobileSection = (section: string) => {
    setMobileExpandedSection(prev => (prev === section ? null : section));
  };

  return (
    <>
      <header
        className={`ae-navbar-header ${isScrolled ? 'ae-navbar-scrolled' : ''}`}
        role="banner"
      >
        <div className="ae-navbar-inner">
          {/* Brand Logo */}
          <div
            className="ae-nav-brand"
            onClick={onNavigateHome}
            role="button"
            tabIndex={0}
            aria-label="Aegis-LK Home"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onNavigateHome();
              }
            }}
          >
            <AegisLogo size={38} lightText={true} />
          </div>

          {/* Desktop Navigation System */}
          <nav className="ae-nav-desktop" aria-label="Main Navigation">
            {/* 1. Home */}
            <div className="ae-nav-item-wrapper">
              <button
                className={`ae-nav-btn ${currentView === 'home' ? 'active' : ''}`}
                onClick={onNavigateHome}
                aria-current={currentView === 'home' ? 'page' : undefined}
              >
                <HomeIcon size={16} />
                <span>Home</span>
              </button>
            </div>

            {/* 2. Weather Intelligence (Dropdown on hover) */}
            <div
              className="ae-nav-item-wrapper"
              onMouseEnter={() => handleMouseEnter('weather')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                className={`ae-nav-btn ${currentView === 'weather' ? 'active' : ''}`}
                onClick={() => {
                  onNavigateWeather('dashboard');
                  setActiveDropdown(null);
                }}
                aria-haspopup="true"
                aria-expanded={activeDropdown === 'weather'}
                aria-current={currentView === 'weather' ? 'page' : undefined}
              >
                <CloudRainIcon size={16} />
                <span>Weather Intelligence</span>
                <span className={`ae-nav-chevron ${activeDropdown === 'weather' ? 'open' : ''}`}>
                  <ChevronDownIcon size={14} />
                </span>
              </button>

              {activeDropdown === 'weather' && (
                <div
                  className="ae-dropdown-menu"
                  role="menu"
                  aria-label="Weather Intelligence Submenu"
                  onMouseEnter={() => handleMouseEnter('weather')}
                  onMouseLeave={handleMouseLeave}
                >
                  {weatherTabs.map((tab) => {
                    const isTabActive = currentView === 'weather' && weatherTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        role="menuitem"
                        className={`ae-dropdown-item ${isTabActive ? 'active' : ''}`}
                        onClick={() => handleDropdownItemClick(() => onNavigateWeather(tab.id))}
                      >
                        <span>{tab.label}</span>
                        {isTabActive && <span className="ae-dropdown-dot" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Incidents (Dropdown on hover) */}
            <div
              className="ae-nav-item-wrapper"
              onMouseEnter={() => handleMouseEnter('incident')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                className={`ae-nav-btn ${currentView === 'incident' ? 'active' : ''}`}
                onClick={() => {
                  onNavigateIncident('dashboard');
                  setActiveDropdown(null);
                }}
                aria-haspopup="true"
                aria-expanded={activeDropdown === 'incident'}
                aria-current={currentView === 'incident' ? 'page' : undefined}
              >
                <AlertTriangleIcon size={16} />
                <span>Incidents</span>
                <span className={`ae-nav-chevron ${activeDropdown === 'incident' ? 'open' : ''}`}>
                  <ChevronDownIcon size={14} />
                </span>
              </button>

              {activeDropdown === 'incident' && (
                <div
                  className="ae-dropdown-menu"
                  role="menu"
                  aria-label="Incidents Submenu"
                  onMouseEnter={() => handleMouseEnter('incident')}
                  onMouseLeave={handleMouseLeave}
                >
                  {incidentTabs.map((tab) => {
                    const isTabActive = currentView === 'incident' && incidentTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        role="menuitem"
                        className={`ae-dropdown-item ${isTabActive ? 'active' : ''}`}
                        onClick={() => handleDropdownItemClick(() => onNavigateIncident(tab.id))}
                      >
                        <span>{tab.label}</span>
                        {isTabActive && <span className="ae-dropdown-dot" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. Resources (Admin / DisasterOfficer / Responder only, Citizens hidden) */}
            {canAccessResources && (
              <div
                className="ae-nav-item-wrapper"
                onMouseEnter={() => handleMouseEnter('resource')}
                onMouseLeave={handleMouseLeave}
              >
                <button
                  className={`ae-nav-btn ${currentView === 'resource' ? 'active' : ''}`}
                  onClick={() => {
                    onNavigateResource('dashboard');
                    setActiveDropdown(null);
                  }}
                  aria-haspopup="true"
                  aria-expanded={activeDropdown === 'resource'}
                  aria-current={currentView === 'resource' ? 'page' : undefined}
                >
                  <PackageIcon size={16} />
                  <span>Resources</span>
                  <span className={`ae-nav-chevron ${activeDropdown === 'resource' ? 'open' : ''}`}>
                    <ChevronDownIcon size={14} />
                  </span>
                </button>

                {activeDropdown === 'resource' && (
                  <div
                    className="ae-dropdown-menu"
                    role="menu"
                    aria-label="Resources Submenu"
                    onMouseEnter={() => handleMouseEnter('resource')}
                    onMouseLeave={handleMouseLeave}
                  >
                    {resourceTabs.map((tab) => {
                      const isTabActive = currentView === 'resource' && resourceTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          role="menuitem"
                          className={`ae-dropdown-item ${isTabActive ? 'active' : ''}`}
                          onClick={() => handleDropdownItemClick(() => onNavigateResource(tab.id))}
                        >
                          <span>{tab.label}</span>
                          {isTabActive && <span className="ae-dropdown-dot" aria-hidden="true" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 5. Recovery & Relief (Dropdown on hover) */}
            <div
              className="ae-nav-item-wrapper"
              onMouseEnter={() => handleMouseEnter('recovery')}
              onMouseLeave={handleMouseLeave}
            >
              <button
                className={`ae-nav-btn ${currentView === 'recovery' ? 'active' : ''}`}
                onClick={() => {
                  onNavigateRecovery('dashboard');
                  setActiveDropdown(null);
                }}
                aria-haspopup="true"
                aria-expanded={activeDropdown === 'recovery'}
                aria-current={currentView === 'recovery' ? 'page' : undefined}
              >
                <ShieldIcon size={16} />
                <span>Recovery & Relief</span>
                <span className={`ae-nav-chevron ${activeDropdown === 'recovery' ? 'open' : ''}`}>
                  <ChevronDownIcon size={14} />
                </span>
              </button>

              {activeDropdown === 'recovery' && (
                <div
                  className="ae-dropdown-menu"
                  role="menu"
                  aria-label="Recovery & Relief Submenu"
                  onMouseEnter={() => handleMouseEnter('recovery')}
                  onMouseLeave={handleMouseLeave}
                >
                  {recoveryTabs.map((tab) => {
                    const isTabActive = currentView === 'recovery' && recoveryTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        role="menuitem"
                        className={`ae-dropdown-item ${isTabActive ? 'active' : ''}`}
                        onClick={() => handleDropdownItemClick(() => onNavigateRecovery(tab.id))}
                      >
                        <span>{tab.label}</span>
                        {isTabActive && <span className="ae-dropdown-dot" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>



            {/* 7. User Management (Admin only) */}
            {user?.role === 'Admin' && (
              <div className="ae-nav-item-wrapper">
                <button
                  className={`ae-nav-btn ${currentView === 'user-management' ? 'active' : ''}`}
                  onClick={onNavigateUserManagement}
                  aria-current={currentView === 'user-management' ? 'page' : undefined}
                >
                  <UsersIcon size={16} />
                  <span>User Management</span>
                </button>
              </div>
            )}
          </nav>

          {/* Desktop Right User Bar */}
          <div className="ae-nav-user-bar">
            <div className="ae-nav-user-info">
              <div className="ae-nav-user-name">
                {user?.fullName}
              </div>
              <div className="ae-nav-user-meta">
                <span
                  className="ae-nav-role-badge"
                  style={{
                    color: roleBadge.color,
                    backgroundColor: roleBadge.bg,
                    border: `1px solid ${roleBadge.color}40`,
                  }}
                >
                  {roleBadge.label}
                </span>
                {user?.district && (
                  <span className="ae-nav-district-badge">
                    <MapPinIcon size={12} color="#94a3b8" />
                    {user.district}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={onLogout}
              className="ae-nav-signout-btn"
              title="Sign out of Aegis-LK"
            >
              Sign Out
            </button>
          </div>

          {/* Mobile Hamburger Toggle Button (Shown on narrow screens) */}
          <button
            className="ae-nav-mobile-toggle"
            onClick={() => setMobileOpen(true)}
            aria-label="Open Navigation Menu"
            aria-expanded={mobileOpen}
          >
            <MenuIcon size={22} />
          </button>
        </div>
      </header>

      {/* ── Mobile Navigation Drawer & Backdrop ──────────────────────────── */}
      {mobileOpen && (
        <>
          <div
            className="ae-mobile-drawer-overlay"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div
            className="ae-mobile-drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation Menu"
          >
            {/* Drawer Header */}
            <div className="ae-mobile-drawer-header">
              <div onClick={() => handleMobileNav(onNavigateHome)} style={{ cursor: 'pointer' }}>
                <AegisLogo size={32} lightText={true} />
              </div>
              <button
                className="ae-mobile-drawer-close"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation menu"
              >
                <XIcon size={20} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="ae-mobile-drawer-body">
              {/* User Identity Card */}
              <div className="ae-mobile-user-card">
                <div style={{ color: '#ffffff', fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>
                  {user?.fullName}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span
                    className="ae-nav-role-badge"
                    style={{
                      color: roleBadge.color,
                      backgroundColor: roleBadge.bg,
                      border: `1px solid ${roleBadge.color}40`,
                    }}
                  >
                    {roleBadge.label}
                  </span>
                  {user?.district && (
                    <span className="ae-nav-district-badge">
                      <MapPinIcon size={12} color="#94a3b8" />
                      {user.district}
                    </span>
                  )}
                </div>
              </div>

              {/* 1. Home */}
              <div className="ae-mobile-nav-item">
                <button
                  className={`ae-mobile-nav-btn ${currentView === 'home' ? 'active' : ''}`}
                  onClick={() => handleMobileNav(onNavigateHome)}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <HomeIcon size={18} />
                    <span>Home</span>
                  </span>
                </button>
              </div>

              {/* 2. Weather Intelligence (Accordion) */}
              <div className="ae-mobile-nav-item">
                <button
                  className={`ae-mobile-nav-btn ${currentView === 'weather' ? 'active' : ''}`}
                  onClick={() => toggleMobileSection('weather')}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <CloudRainIcon size={18} />
                    <span>Weather Intelligence</span>
                  </span>
                  <span
                    className={`ae-nav-chevron ${mobileExpandedSection === 'weather' ? 'open' : ''}`}
                  >
                    <ChevronDownIcon size={16} />
                  </span>
                </button>

                {mobileExpandedSection === 'weather' && (
                  <div className="ae-mobile-sublist">
                    {weatherTabs.map((tab) => {
                      const isTabActive = currentView === 'weather' && weatherTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          className={`ae-mobile-sub-btn ${isTabActive ? 'active' : ''}`}
                          onClick={() => handleMobileNav(() => onNavigateWeather(tab.id))}
                        >
                          <span>{tab.label}</span>
                          {isTabActive && <span className="ae-dropdown-dot" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 3. Incidents (Accordion) */}
              <div className="ae-mobile-nav-item">
                <button
                  className={`ae-mobile-nav-btn ${currentView === 'incident' ? 'active' : ''}`}
                  onClick={() => toggleMobileSection('incident')}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <AlertTriangleIcon size={18} />
                    <span>Incidents</span>
                  </span>
                  <span
                    className={`ae-nav-chevron ${mobileExpandedSection === 'incident' ? 'open' : ''}`}
                  >
                    <ChevronDownIcon size={16} />
                  </span>
                </button>

                {mobileExpandedSection === 'incident' && (
                  <div className="ae-mobile-sublist">
                    {incidentTabs.map((tab) => {
                      const isTabActive = currentView === 'incident' && incidentTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          className={`ae-mobile-sub-btn ${isTabActive ? 'active' : ''}`}
                          onClick={() => handleMobileNav(() => onNavigateIncident(tab.id))}
                        >
                          <span>{tab.label}</span>
                          {isTabActive && <span className="ae-dropdown-dot" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 4. Resources (Accordion, role permitted only) */}
              {canAccessResources && (
                <div className="ae-mobile-nav-item">
                  <button
                    className={`ae-mobile-nav-btn ${currentView === 'resource' ? 'active' : ''}`}
                    onClick={() => toggleMobileSection('resource')}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <PackageIcon size={18} />
                      <span>Resources</span>
                    </span>
                    <span
                      className={`ae-nav-chevron ${mobileExpandedSection === 'resource' ? 'open' : ''}`}
                    >
                      <ChevronDownIcon size={16} />
                    </span>
                  </button>

                  {mobileExpandedSection === 'resource' && (
                    <div className="ae-mobile-sublist">
                      {resourceTabs.map((tab) => {
                        const isTabActive = currentView === 'resource' && resourceTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            className={`ae-mobile-sub-btn ${isTabActive ? 'active' : ''}`}
                            onClick={() => handleMobileNav(() => onNavigateResource(tab.id))}
                          >
                            <span>{tab.label}</span>
                            {isTabActive && <span className="ae-dropdown-dot" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 5. Recovery & Relief (Accordion) */}
              <div className="ae-mobile-nav-item">
                <button
                  className={`ae-mobile-nav-btn ${currentView === 'recovery' ? 'active' : ''}`}
                  onClick={() => toggleMobileSection('recovery')}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <ShieldIcon size={18} />
                    <span>Recovery & Relief</span>
                  </span>
                  <span
                    className={`ae-nav-chevron ${mobileExpandedSection === 'recovery' ? 'open' : ''}`}
                  >
                    <ChevronDownIcon size={16} />
                  </span>
                </button>

                {mobileExpandedSection === 'recovery' && (
                  <div className="ae-mobile-sublist">
                    {recoveryTabs.map((tab) => {
                      const isTabActive = currentView === 'recovery' && recoveryTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          className={`ae-mobile-sub-btn ${isTabActive ? 'active' : ''}`}
                          onClick={() => handleMobileNav(() => onNavigateRecovery(tab.id))}
                        >
                          <span>{tab.label}</span>
                          {isTabActive && <span className="ae-dropdown-dot" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>



              {/* 7. User Management (Admin only) */}
              {user?.role === 'Admin' && (
                <div className="ae-mobile-nav-item">
                  <button
                    className={`ae-mobile-nav-btn ${currentView === 'user-management' ? 'active' : ''}`}
                    onClick={() => handleMobileNav(onNavigateUserManagement)}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <UsersIcon size={18} />
                      <span>User Management</span>
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Drawer Footer (Sign out) */}
            <div className="ae-mobile-drawer-footer">
              <button
                onClick={onLogout}
                className="ae-nav-signout-btn"
                style={{ width: '100%', padding: '0.75rem 1rem', fontSize: '0.9rem' }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};
