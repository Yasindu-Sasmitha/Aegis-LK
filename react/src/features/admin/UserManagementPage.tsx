import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../shared/auth/AuthContext';
import {
  fetchAdminUsers,
  createAdminUser,
  updateAdminUser,
  setAdminUserActive,
} from '../../shared/auth/authApi';
import type {
  AdminUserListItem,
  CreateAdminUserRequest,
  UpdateAdminUserRequest,
  UserRole,
} from '../../shared/auth/authTypes';
import {
  UsersIcon,
  UserIcon,
  ShieldIcon,
  PlusIcon,
  SearchIcon,
  RefreshCwIcon,
  EditIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  XIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  MapPinIcon,
  PhoneIcon,
} from '../../shared/components/Icons';

const DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha',
  'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala',
  'Mannar', 'Matale', 'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa',
  'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya',
];

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'Admin', label: 'Administrator', description: 'Full system configuration, user provisioning and audit control' },
  { value: 'DisasterOfficer', label: 'Disaster Officer', description: 'Weather alert verification, incident management & shelter control' },
  { value: 'Responder', label: 'Emergency Responder', description: 'Field response, resource dispatch execution & damage assessment' },
  { value: 'Citizen', label: 'Citizen', description: 'Emergency reporting, aid requests & early warning notifications' },
];

const ROLE_BADGES: Record<UserRole, { label: string; color: string; bg: string; border: string }> = {
  Admin: { label: 'Admin', color: '#4b00d5ff', bg: 'rgba(192, 132, 252, 0.12)', border: 'rgba(192, 132, 252, 0.3)' },
  DisasterOfficer: { label: 'Disaster Officer', color: '#025dcdff', bg: 'rgba(96, 165, 250, 0.12)', border: 'rgba(96, 165, 250, 0.3)' },
  Responder: { label: 'Responder', color: '#dd7404ff', bg: 'rgba(252, 211, 77, 0.12)', border: 'rgba(252, 211, 77, 0.3)' },
  Citizen: { label: 'Citizen', color: '#009e23ff', bg: 'rgba(110, 231, 183, 0.12)', border: 'rgba(110, 231, 183, 0.3)' },
};

interface UserManagementPageProps {
  onNavigateHome?: () => void;
}

export const UserManagementPage: React.FC<UserManagementPageProps> = ({ onNavigateHome }) => {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<AdminUserListItem | null>(null);
  const [statusConfirmUser, setStatusConfirmUser] = useState<AdminUserListItem | null>(null);

  // Create form state
  const [createForm, setCreateForm] = useState<CreateAdminUserRequest>({
    fullName: '',
    email: '',
    password: '',
    role: 'Citizen',
    district: 'Colombo',
    phoneNumber: '',
  });
  const [showCreatePassword, setShowCreatePassword] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState<UpdateAdminUserRequest>({
    fullName: '',
    email: '',
    role: 'Citizen',
    district: '',
    phoneNumber: '',
    newPassword: '',
  });
  const [showEditPassword, setShowEditPassword] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Dismiss notifications
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [successMessage]);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: { search?: string; role?: string; isActive?: boolean } = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (roleFilter) params.role = roleFilter;
      if (statusFilter === 'active') params.isActive = true;
      if (statusFilter === 'inactive') params.isActive = false;

      const data = await fetchAdminUsers(params);
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load user records.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, roleFilter, statusFilter]);

  useEffect(() => {
    if (currentUser?.role === 'Admin') {
      loadUsers();
    }
  }, [loadUsers, currentUser]);

  // Frontend defense-in-depth access check
  if (currentUser?.role !== 'Admin') {
    return (
      <div style={{
        maxWidth: 580,
        margin: '4rem auto',
        padding: '2.5rem',
        background: '#ffffff',
        borderRadius: 16,
        boxShadow: '0 8px 30px rgba(15, 23, 42, 0.08)',
        textAlign: 'center',
        border: '1px solid #e2e8f0',
      }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          background: '#fee2e2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem',
        }}>
          <LockIcon size={28} color="#dc2626" />
        </div>
        <h2 style={{ margin: '0 0 0.5rem', color: '#0f172a', fontSize: '1.5rem', fontWeight: 800 }}>
          Access Restricted
        </h2>
        <p style={{ color: '#64748b', margin: '0 0 1.5rem', lineHeight: 1.6, fontSize: '0.925rem' }}>
          The User Management module is reserved exclusively for System Administrators.
          Your current account role is <strong>{currentUser?.role ?? 'Unauthenticated'}</strong>.
        </p>
        <button
          onClick={onNavigateHome}
          style={{
            padding: '0.65rem 1.4rem',
            border: 'none',
            borderRadius: 8,
            background: '#0284c7',
            color: '#ffffff',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Handle Create User Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    const name = createForm.fullName.trim();
    const email = createForm.email.trim();
    const password = createForm.password;

    if (!name || name.length < 2) {
      setCreateError('Full name must be at least 2 characters.');
      return;
    }
    if (!email || !email.includes('@')) {
      setCreateError('Please provide a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setCreateError('Password must be at least 6 characters.');
      return;
    }

    try {
      setActionLoading(true);
      await createAdminUser({
        fullName: name,
        email: email,
        password: password,
        role: createForm.role,
        district: createForm.district?.trim() || undefined,
        phoneNumber: createForm.phoneNumber?.trim() || undefined,
      });

      setShowCreateModal(false);
      setCreateForm({
        fullName: '',
        email: '',
        password: '',
        role: 'Citizen',
        district: 'Colombo',
        phoneNumber: '',
      });
      setSuccessMessage(`Account for ${name} (${createForm.role}) created successfully.`);
      await loadUsers();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create user account.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (user: AdminUserListItem) => {
    setEditingUser(user);
    setEditError(null);
    setEditForm({
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      district: user.district || 'Colombo',
      phoneNumber: user.phoneNumber || '',
      newPassword: '',
    });
  };

  // Handle Edit User Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);

    const name = editForm.fullName.trim();
    const email = editForm.email.trim();

    if (!name || name.length < 2) {
      setEditError('Full name must be at least 2 characters.');
      return;
    }
    if (!email || !email.includes('@')) {
      setEditError('Please enter a valid email address.');
      return;
    }
    if (editForm.newPassword && editForm.newPassword.length < 6) {
      setEditError('New password must be at least 6 characters.');
      return;
    }

    try {
      setActionLoading(true);
      await updateAdminUser(editingUser.id, {
        fullName: name,
        email: email,
        role: editForm.role,
        district: editForm.district?.trim() || undefined,
        phoneNumber: editForm.phoneNumber?.trim() || undefined,
        newPassword: editForm.newPassword?.trim() || undefined,
      });

      setEditingUser(null);
      setSuccessMessage(`Profile for ${name} updated successfully.`);
      await loadUsers();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update user profile.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Status Toggle (Activate / Deactivate)
  const handleConfirmStatusToggle = async () => {
    if (!statusConfirmUser) return;

    try {
      setActionLoading(true);
      const nextStatus = !statusConfirmUser.isActive;
      await setAdminUserActive(statusConfirmUser.id, nextStatus);
      setStatusConfirmUser(null);
      setSuccessMessage(
        `User ${statusConfirmUser.fullName} has been ${nextStatus ? 'activated' : 'deactivated'}.`
      );
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update account status.');
      setStatusConfirmUser(null);
    } finally {
      setActionLoading(false);
    }
  };

  // Calculate Metrics
  const totalCount = users.length;
  const adminCount = users.filter((u) => u.role === 'Admin').length;
  const officerCount = users.filter((u) => u.role === 'DisasterOfficer' || u.role === 'Responder').length;
  const activeCount = users.filter((u) => u.isActive).length;

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1.75rem',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            background: 'rgba(192, 132, 252, 0.1)',
            color: '#a855f7',
            padding: '4px 10px',
            borderRadius: 20,
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: '0.5rem',
            border: '1px solid rgba(192, 132, 252, 0.25)',
          }}>
            <ShieldIcon size={12} color="#a855f7" />
            <span>Administrative Console</span>
          </div>
          <h1 style={{
            margin: '0 0 0.35rem',
            fontSize: '1.85rem',
            fontWeight: 800,
            color: '#07162c',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            letterSpacing: '-0.02em',
          }}>
            User Management
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.925rem' }}>
            Manage Aegis-LK accounts, roles and access status across all national response tiers.
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => loadUsers()}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.65rem 1.1rem',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              color: '#334155',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.15s ease',
            }}
            title="Refresh user records"
          >
            <RefreshCwIcon size={15} color="#475569" className={loading ? 'ae-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => {
              setShowCreateModal(true);
              setCreateError(null);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.65rem 1.25rem',
              backgroundColor: '#0284c7',
              border: 'none',
              borderRadius: 8,
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.35)',
              transition: 'all 0.15s ease',
            }}
          >
            <PlusIcon size={16} color="#ffffff" />
            <span>Create User</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div style={{
          backgroundColor: '#ecfdf5',
          border: '1px solid #a7f3d0',
          borderRadius: 10,
          padding: '0.85rem 1.25rem',
          color: '#065f46',
          fontSize: '0.875rem',
          fontWeight: 600,
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 6px rgba(16, 185, 129, 0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircleIcon size={18} color="#059669" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#065f46', padding: 2 }}
          >
            <XIcon size={16} />
          </button>
        </div>
      )}

      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 10,
          padding: '0.85rem 1.25rem',
          color: '#991b1b',
          fontSize: '0.875rem',
          fontWeight: 600,
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 6px rgba(239, 68, 68, 0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangleIcon size={18} color="#dc2626" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', padding: 2 }}
          >
            <XIcon size={16} />
          </button>
        </div>
      )}

      {/* Metrics Banner */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1.75rem',
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: '1.15rem 1.35rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(15, 23, 42, 0.03)',
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Registered Users
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>
            {totalCount}
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: '1.15rem 1.35rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(15, 23, 42, 0.03)',
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            System Administrators
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#6b21a8', marginTop: '0.25rem' }}>
            {adminCount}
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: '1.15rem 1.35rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(15, 23, 42, 0.03)',
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Officers & Responders
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0369a1', marginTop: '0.25rem' }}>
            {officerCount}
          </div>
        </div>

        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: '1.15rem 1.35rem',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(15, 23, 42, 0.03)',
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Active Accounts
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#047857', marginTop: '0.25rem' }}>
            {activeCount}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        padding: '1rem 1.25rem',
        border: '1px solid #e2e8f0',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.85rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 240 }}>
          <div style={{
            position: 'absolute',
            left: '0.85rem',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: '#94a3b8',
            display: 'flex',
          }}>
            <SearchIcon size={16} />
          </div>
          <input
            type="text"
            placeholder="Search by full name or email address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.85rem 0.6rem 2.4rem',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              outline: 'none',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Dropdowns */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              padding: '0.6rem 0.85rem',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '0.875rem',
              color: '#334155',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="">All Roles</option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.6rem 0.85rem',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '0.875rem',
              color: '#334155',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Deactivated Only</option>
          </select>

          {(searchQuery || roleFilter || statusFilter) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('');
                setStatusFilter('');
              }}
              style={{
                padding: '0.6rem 0.85rem',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                background: '#f8fafc',
                color: '#64748b',
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* User Records Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
      }}>
        {loading ? (
          <div style={{
            padding: '4rem 1.5rem',
            textAlign: 'center',
            color: '#64748b',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem',
          }}>
            <RefreshCwIcon size={28} color="#0284c7" className="ae-spin" />
            <div style={{ fontSize: '0.925rem', fontWeight: 600 }}>Loading Aegis-LK user directory...</div>
          </div>
        ) : users.length === 0 ? (
          <div style={{
            padding: '4rem 1.5rem',
            textAlign: 'center',
            color: '#64748b',
          }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              background: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}>
              <UsersIcon size={24} color="#94a3b8" />
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
              No user accounts found
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              {searchQuery || roleFilter || statusFilter
                ? 'Try adjusting your search criteria or resetting filters.'
                : 'Click "Create User" to add the first account.'}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{
                  backgroundColor: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}>
                  <th style={{ padding: '0.85rem 1.25rem' }}>User / Identity</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Role</th>
                  <th style={{ padding: '0.85rem 1rem' }}>District</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Contact</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Registered</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((item, idx) => {
                  const roleStyle = ROLE_BADGES[item.role] || ROLE_BADGES.Citizen;
                  const isSelf = currentUser?.id === item.id;
                  const borderBottom = idx < users.length - 1 ? '1px solid #f1f5f9' : 'none';

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom,
                        transition: 'background-color 0.1s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Name & Email */}
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            backgroundColor: '#e0f2fe',
                            color: '#0284c7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            flexShrink: 0,
                          }}>
                            {item.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <span>{item.fullName}</span>
                              {isSelf && (
                                <span style={{
                                  fontSize: '0.675rem',
                                  fontWeight: 700,
                                  backgroundColor: '#e2e8f0',
                                  color: '#475569',
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                }}>
                                  You
                                </span>
                              )}
                            </div>
                            <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 2 }}>
                              {item.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td style={{ padding: '1rem 1rem' }}>
                        <span style={{
                          display: 'inline-block',
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          color: roleStyle.color,
                          backgroundColor: roleStyle.bg,
                          border: `1px solid ${roleStyle.border}`,
                          padding: '3px 9px',
                          borderRadius: 6,
                          letterSpacing: '0.02em',
                        }}>
                          {roleStyle.label}
                        </span>
                      </td>

                      {/* District */}
                      <td style={{ padding: '1rem 1rem', color: '#334155' }}>
                        {item.district ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <MapPinIcon size={14} color="#94a3b8" />
                            <span>{item.district}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>

                      {/* Contact */}
                      <td style={{ padding: '1rem 1rem', color: '#334155' }}>
                        {item.phoneNumber ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <PhoneIcon size={13} color="#94a3b8" />
                            <span>{item.phoneNumber}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '1rem 1rem' }}>
                        {item.isActive ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            color: '#059669',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: '#ecfdf5',
                            padding: '3px 8px',
                            borderRadius: 6,
                            border: '1px solid #a7f3d0',
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10b981' }} />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            color: '#dc2626',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: '#fef2f2',
                            padding: '3px 8px',
                            borderRadius: 6,
                            border: '1px solid #fecaca',
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#ef4444' }} />
                            <span>Deactivated</span>
                          </span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td style={{ padding: '1rem 1rem', color: '#64748b', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {new Date(item.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                          <button
                            onClick={() => handleOpenEdit(item)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.4rem 0.75rem',
                              backgroundColor: '#ffffff',
                              border: '1px solid #cbd5e1',
                              borderRadius: 6,
                              color: '#334155',
                              fontSize: '0.775rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            title="Edit user details and role"
                          >
                            <EditIcon size={13} color="#475569" />
                            <span>Edit</span>
                          </button>

                          {item.isActive ? (
                            <button
                              onClick={() => setStatusConfirmUser(item)}
                              disabled={isSelf}
                              style={{
                                padding: '0.4rem 0.75rem',
                                backgroundColor: isSelf ? '#f1f5f9' : '#fff1f2',
                                border: `1px solid ${isSelf ? '#e2e8f0' : '#fecdd3'}`,
                                borderRadius: 6,
                                color: isSelf ? '#94a3b8' : '#e11d48',
                                fontSize: '0.775rem',
                                fontWeight: 600,
                                cursor: isSelf ? 'not-allowed' : 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              title={isSelf ? 'Administrators cannot deactivate their own account' : 'Deactivate this account'}
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => setStatusConfirmUser(item)}
                              style={{
                                padding: '0.4rem 0.75rem',
                                backgroundColor: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                borderRadius: 6,
                                color: '#16a34a',
                                fontSize: '0.775rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              title="Reactivate this user account"
                            >
                              Activate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL: CREATE USER
          ========================================================================= */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(7, 22, 44, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            width: '100%',
            maxWidth: 540,
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#07162c',
              color: '#ffffff',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <UserIcon size={18} color="#38bdf8" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Create New User Account</h3>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Provision staff, responder or citizen credentials
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
              >
                <XIcon size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateSubmit} style={{ padding: '1.5rem' }}>
              {createError && (
                <div style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 8,
                  padding: '0.65rem 0.85rem',
                  color: '#991b1b',
                  fontSize: '0.825rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                }}>
                  <AlertTriangleIcon size={16} color="#dc2626" />
                  <span>{createError}</span>
                </div>
              )}

              {/* Full Name */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kasun Fernando"
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Email */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. kasun@aegis.lk"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Initial Password (min 6 characters) *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCreatePassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Create a secure temporary password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 2.4rem 0.65rem 0.85rem',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94a3b8',
                      display: 'flex',
                    }}
                  >
                    {showCreatePassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                  </button>
                </div>
              </div>

              {/* Role Selection */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  System Role *
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as UserRole })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    backgroundColor: '#ffffff',
                    boxSizing: 'border-box',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label} ({r.value})
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                  {ROLES.find((r) => r.value === createForm.role)?.description}
                </div>
              </div>

              {/* District & Phone Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Assigned District
                  </label>
                  <select
                    value={createForm.district || 'Colombo'}
                    onChange={(e) => setCreateForm({ ...createForm, district: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      backgroundColor: '#ffffff',
                      boxSizing: 'border-box',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {DISTRICTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+94 77 ..."
                    value={createForm.phoneNumber || ''}
                    onChange={(e) => setCreateForm({ ...createForm, phoneNumber: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={actionLoading}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    padding: '0.65rem 1.5rem',
                    borderRadius: 8,
                    border: 'none',
                    background: '#0284c7',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
                  }}
                >
                  {actionLoading ? 'Creating User...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: EDIT USER
          ========================================================================= */}
      {editingUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(7, 22, 44, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            width: '100%',
            maxWidth: 540,
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#07162c',
              color: '#ffffff',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <EditIcon size={16} color="#38bdf8" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Edit User Profile</h3>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Update identity, role assignment and regional allocation
                  </div>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
              >
                <XIcon size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleEditSubmit} style={{ padding: '1.5rem' }}>
              {editError && (
                <div style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: 8,
                  padding: '0.65rem 0.85rem',
                  color: '#991b1b',
                  fontSize: '0.825rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                }}>
                  <AlertTriangleIcon size={16} color="#dc2626" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Full Name */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Email */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Role Selection */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Role *
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    fontSize: '0.875rem',
                    backgroundColor: '#ffffff',
                    boxSizing: 'border-box',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label} ({r.value})
                    </option>
                  ))}
                </select>
                {currentUser?.id === editingUser.id && editingUser.role === 'Admin' && (
                  <div style={{ fontSize: '0.75rem', color: '#eab308', marginTop: '0.3rem' }}>
                    Note: As the active administrator, you cannot revoke your own administrator role.
                  </div>
                )}
              </div>

              {/* District & Phone Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Assigned District
                  </label>
                  <select
                    value={editForm.district || 'Colombo'}
                    onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      backgroundColor: '#ffffff',
                      boxSizing: 'border-box',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {DISTRICTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={editForm.phoneNumber || ''}
                    onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Password Reset (Optional) */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Reset Password (optional)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    minLength={6}
                    placeholder="Leave blank to retain current password"
                    value={editForm.newPassword || ''}
                    onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 2.4rem 0.65rem 0.85rem',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94a3b8',
                      display: 'flex',
                    }}
                  >
                    {showEditPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                  </button>
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  disabled={actionLoading}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: 8,
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    padding: '0.65rem 1.5rem',
                    borderRadius: 8,
                    border: 'none',
                    background: '#0284c7',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
                  }}
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CONFIRM STATUS TOGGLE (DEACTIVATE / ACTIVATE)
          ========================================================================= */}
      {statusConfirmUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(7, 22, 44, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem',
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            width: '100%',
            maxWidth: 460,
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            border: '1px solid #e2e8f0',
            padding: '1.75rem',
            textAlign: 'center',
          }}>
            <div style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: statusConfirmUser.isActive ? '#fee2e2' : '#dcfce7',
              color: statusConfirmUser.isActive ? '#dc2626' : '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}>
              {statusConfirmUser.isActive ? (
                <AlertTriangleIcon size={26} color="#dc2626" />
              ) : (
                <CheckCircleIcon size={26} color="#16a34a" />
              )}
            </div>

            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              {statusConfirmUser.isActive ? 'Deactivate User Account?' : 'Reactivate User Account?'}
            </h3>

            <p style={{ margin: '0 0 1.5rem', color: '#64748b', fontSize: '0.875rem', lineHeight: 1.5 }}>
              {statusConfirmUser.isActive ? (
                <>
                  This will prevent <strong>{statusConfirmUser.fullName}</strong> ({statusConfirmUser.email})
                  from signing in to Aegis-LK. Their records and activity history will be preserved.
                </>
              ) : (
                <>
                  This will restore sign-in access for <strong>{statusConfirmUser.fullName}</strong> ({statusConfirmUser.email}).
                </>
              )}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setStatusConfirmUser(null)}
                disabled={actionLoading}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#475569',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmStatusToggle}
                disabled={actionLoading}
                style={{
                  padding: '0.65rem 1.4rem',
                  borderRadius: 8,
                  border: 'none',
                  background: statusConfirmUser.isActive ? '#dc2626' : '#16a34a',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  boxShadow: statusConfirmUser.isActive
                    ? '0 2px 8px rgba(220, 38, 38, 0.3)'
                    : '0 2px 8px rgba(22, 163, 74, 0.3)',
                }}
              >
                {actionLoading
                  ? 'Updating...'
                  : statusConfirmUser.isActive
                    ? 'Yes, Deactivate Account'
                    : 'Yes, Reactivate Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
