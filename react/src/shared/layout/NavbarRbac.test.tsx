import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Navbar, NavbarProps } from './Navbar';

describe('Navbar Role-Based Access Control (RBAC)', () => {
  const defaultWeatherTabs = [
    { id: 'dashboard', label: 'Forecast & Live Risk' },
    { id: 'predictions', label: 'Prediction History' },
    { id: 'history', label: 'Alert History' },
  ];

  const officerWeatherTabs = [
    { id: 'dashboard', label: 'Forecast & Live Risk' },
    { id: 'review', label: 'Alert Review Queue' },
    { id: 'predictions', label: 'Prediction History' },
    { id: 'history', label: 'Alert History' },
    { id: 'analytics', label: 'Accuracy Analytics' },
  ];

  const defaultIncidentTabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'all', label: 'All Incidents' },
  ];

  const defaultResourceTabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'warehouses', label: 'Warehouses' },
    { id: 'inventory', label: 'Inventory' },
  ];

  const defaultRecoveryTabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'shelters', label: 'Emergency Shelters' },
  ];

  const createProps = (overrides: Partial<NavbarProps> = {}): NavbarProps => ({
    currentView: 'home',
    weatherTab: 'dashboard',
    incidentTab: 'dashboard',
    resourceTab: 'dashboard',
    recoveryTab: 'dashboard',
    canAccessResources: false,
    isOfficerOrAdmin: false,
    user: {
      id: 'citizen-1',
      email: 'citizen@aegis.lk',
      fullName: 'Kasun Perera',
      role: 'Citizen',
      district: 'Gampaha',
      isActive: true,
      createdAt: '2026-01-01',
    },
    roleBadge: { label: 'Citizen', color: '#6ee7b7', bg: 'rgba(110,231,183,0.15)' },
    weatherTabs: defaultWeatherTabs,
    incidentTabs: defaultIncidentTabs,
    resourceTabs: defaultResourceTabs,
    recoveryTabs: defaultRecoveryTabs,
    onNavigateHome: vi.fn(),
    onNavigateWeather: vi.fn(),
    onNavigateIncident: vi.fn(),
    onNavigateResource: vi.fn(),
    onNavigateRecovery: vi.fn(),
    onNavigateUserManagement: vi.fn(),
    onLogout: vi.fn(),
    ...overrides,
  });

  it('Citizen role: hides Resources and User Management modules', () => {
    const props = createProps({
      canAccessResources: false,
      isOfficerOrAdmin: false,
      user: {
        id: 'citizen-1',
        email: 'citizen@aegis.lk',
        fullName: 'Kasun Perera',
        role: 'Citizen',
        district: 'Gampaha',
        isActive: true,
        createdAt: '2026-01-01',
      },
      roleBadge: { label: 'Citizen', color: '#6ee7b7', bg: 'rgba(110,231,183,0.15)' },
    });

    render(<Navbar {...props} />);
    const mainNav = screen.getByRole('navigation', { name: /main navigation/i });

    // Common items available to citizens in main desktop navigation
    expect(within(mainNav).getByRole('button', { name: /^home$/i })).toBeInTheDocument();
    expect(within(mainNav).getByRole('button', { name: /weather intelligence/i })).toBeInTheDocument();
    expect(within(mainNav).getByRole('button', { name: /incidents/i })).toBeInTheDocument();
    expect(within(mainNav).getByRole('button', { name: /recovery & relief/i })).toBeInTheDocument();

    // Restricted modules MUST NOT be present
    expect(within(mainNav).queryByRole('button', { name: /^resources$/i })).not.toBeInTheDocument();
    expect(within(mainNav).queryByRole('button', { name: /user management/i })).not.toBeInTheDocument();

    // Role badge
    expect(screen.getByText('Citizen')).toBeInTheDocument();
  });

  it('DisasterOfficer role: allows Resources, but hides User Management', () => {
    const props = createProps({
      canAccessResources: true,
      isOfficerOrAdmin: true,
      weatherTabs: officerWeatherTabs,
      user: {
        id: 'officer-1',
        email: 'officer@aegis.lk',
        fullName: 'DMC Officer',
        role: 'DisasterOfficer',
        district: 'Kandy',
        isActive: true,
        createdAt: '2026-01-01',
      },
      roleBadge: { label: 'Disaster Officer', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
    });

    render(<Navbar {...props} />);
    const mainNav = screen.getByRole('navigation', { name: /main navigation/i });

    // Resources button MUST be present for officers
    expect(within(mainNav).getByRole('button', { name: /^resources/i })).toBeInTheDocument();

    // User management MUST NOT be present for non-admins
    expect(within(mainNav).queryByRole('button', { name: /user management/i })).not.toBeInTheDocument();

    expect(screen.getByText('Disaster Officer')).toBeInTheDocument();
  });

  it('Admin role: allows both Resources and User Management navigation', async () => {
    const user = userEvent.setup();
    const props = createProps({
      canAccessResources: true,
      isOfficerOrAdmin: true,
      user: {
        id: 'admin-1',
        email: 'admin@aegis.lk',
        fullName: 'System Administrator',
        role: 'Admin',
        district: 'Colombo',
        isActive: true,
        createdAt: '2026-01-01',
      },
      roleBadge: { label: 'Admin', color: '#c084fc', bg: 'rgba(192,132,252,0.15)' },
    });

    render(<Navbar {...props} />);
    const mainNav = screen.getByRole('navigation', { name: /main navigation/i });

    expect(within(mainNav).getByRole('button', { name: /^resources/i })).toBeInTheDocument();
    const userMgmtBtn = within(mainNav).getByRole('button', { name: /user management/i });
    expect(userMgmtBtn).toBeInTheDocument();

    await user.click(userMgmtBtn);
    expect(props.onNavigateUserManagement).toHaveBeenCalledTimes(1);

    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('calls onLogout when clicking the logout action', async () => {
    const user = userEvent.setup();
    const props = createProps();

    render(<Navbar {...props} />);

    const logoutBtn = screen.getByTitle(/sign out of aegis-lk/i);
    await user.click(logoutBtn);

    expect(props.onLogout).toHaveBeenCalledTimes(1);
  });
});
