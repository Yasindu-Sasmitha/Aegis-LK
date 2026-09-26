import React, { useEffect, useState } from 'react';
import { fetchAidRequests, createAidRequest, updateAidRequestStatus } from '../api/recoveryApi';
import { AidRequestTable } from '../components/AidRequestTable';
import { AidRequest } from '../types/recoveryTypes';
import { useAuth } from '../../../shared/auth/AuthContext';

const SRI_LANKA_DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle',
  'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle',
  'Kilinochchi', 'Kurunegala', 'Mannar', 'Matale', 'Matara', 'Monaragala',
  'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura',
  'Trincomalee', 'Vavuniya',
];

const AID_TYPES = [
  'Food Rations',
  'Clean Drinking Water',
  'Emergency Medical Kit',
  'Baby Care & Infant Formula',
  'Temporary Shelter & Bedding',
  'Cash Living Stipend',
  'Clothing & Blankets',
];

export const AidRequestsPage: React.FC = () => {
  const { user } = useAuth();
  const isOfficer = user?.role === 'DisasterOfficer' || user?.role === 'Admin' || user?.role === 'Responder';
  const isCitizen = user?.role === 'Citizen';

  const [requests, setRequests] = useState<AidRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newRequest, setNewRequest] = useState({
    victimName: user?.fullName || '',
    contactPhone: user?.phoneNumber || '',
    district: user?.district || 'Kalutara',
    aidType: 'Food Rations',
    familySize: 4,
    urgency: 'High',
    notes: '',
  });

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await fetchAidRequests(filterStatus === 'all' ? undefined : filterStatus);
      setRequests(Array.isArray(data) ? data : (data as any).items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [filterStatus]);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateAidRequestStatus(id, status);
      loadRequests();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequest.victimName.trim()) {
      alert('Please provide the applicant/victim full name.');
      return;
    }

    const cleanPhone = newRequest.contactPhone.trim();
    if (!cleanPhone || cleanPhone.replace(/[^0-9+]/g, '').length < 9) {
      alert('Please provide a valid contact phone number with at least 9-10 digits (e.g. 0771234567 or +94112345670).');
      return;
    }

    if (!newRequest.familySize || newRequest.familySize < 1 || newRequest.familySize > 50) {
      alert('Family size must be between 1 and 50 members.');
      return;
    }

    setSubmitting(true);
    try {
      await createAidRequest({
        ...newRequest,
        contactPhone: cleanPhone,
        status: 'Pending',
      });
      setShowModal(false);
      setNewRequest({
        victimName: user?.fullName || '',
        contactPhone: user?.phoneNumber || '',
        district: user?.district || 'Kalutara',
        aidType: 'Food Rations',
        familySize: 4,
        urgency: 'High',
        notes: '',
      });
      loadRequests();
      alert('Your emergency relief aid request has been submitted successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to submit aid request');
    } finally {
      setSubmitting(false);
    }
  };

  const userFullName = (user?.fullName || '').trim().toLowerCase();
  const userPhone = (user?.phoneNumber || '').trim().replace(/[^0-9]/g, '');

  const filteredRequests = requests.filter((r) => {
    if (isCitizen && !isOfficer) {
      const rName = (r.victimName || '').trim().toLowerCase();
      const rPhone = (r.contactPhone || '').trim().replace(/[^0-9]/g, '');
      const isOwner = (userFullName && (rName === userFullName || rName.includes(userFullName))) ||
                      (userPhone && rPhone && (userPhone.endsWith(rPhone.slice(-9)) || rPhone.endsWith(userPhone.slice(-9))));
      if (!isOwner) return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.victimName.toLowerCase().includes(q) ||
      r.district.toLowerCase().includes(q) ||
      r.contactPhone.includes(q) ||
      r.aidType.toLowerCase().includes(q)
    );
  });

  const pendingCount = filteredRequests.filter((r) => r.status === 'Pending').length;
  const fulfilledCount = filteredRequests.filter((r) => r.status === 'Fulfilled').length;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#0f172a' }}>
      
      {/* ── HEADER & AUTH ROLE BADGE ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#0f172a' }}>
              Citizen Emergency Aid &amp; Relief Portal
            </h1>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
            Direct intake for flood, cyclone, and landslide victims to receive dry rations, medical kits, and cash stipends.
          </p>
        </div>

        {/* Action Button & Role Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.45rem 0.85rem', borderRadius: '10px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Logged in as:</span>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: '6px',
              background: user?.role === 'Admin' ? '#faf5ff' : user?.role === 'DisasterOfficer' ? '#eff6ff' : user?.role === 'Responder' ? '#fffbeb' : '#f0fdf4',
              color: user?.role === 'Admin' ? '#7e22ce' : user?.role === 'DisasterOfficer' ? '#1e40af' : user?.role === 'Responder' ? '#b45309' : '#15803d',
              border: `1px solid ${user?.role === 'Admin' ? '#e9d5ff' : user?.role === 'DisasterOfficer' ? '#bfdbfe' : user?.role === 'Responder' ? '#fde68a' : '#bbf7d0'}`,
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              {user?.role === 'Admin' ? '⚙️ System Admin' : user?.role === 'DisasterOfficer' ? '🛡️ Disaster Officer' : user?.role === 'Responder' ? '🚨 Field Responder' : '👥 Citizen'}
            </span>
          </div>

          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: '0.75rem 1.25rem',
              background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>➕</span>
            <span>Apply for Emergency Relief</span>
          </button>
        </div>
      </div>

      {/* ── CITIZEN INFO BANNER ── */}
      {isCitizen ? (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderLeft: '4px solid #16a34a',
          borderRadius: '10px',
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem',
          fontSize: '0.9rem',
          color: '#166534',
        }}>
          <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>ℹ️</span>
          <div>
            <strong>Citizen Relief Request Service</strong>
            <p style={{ margin: '0.25rem 0 0 0', color: '#15803d', fontWeight: 400 }}>
              Need emergency rations, potable drinking water, medical kits, or temporary bedding? Click <strong>"+ Apply for Emergency Relief"</strong>. Your request will be prioritized and assigned to field response teams.
            </p>
          </div>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          background: '#eff6ff',
          border: '1px solid #dbeafe',
          borderLeft: '4px solid #2563eb',
          borderRadius: '10px',
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem',
          fontSize: '0.9rem',
          color: '#1e40af',
        }}>
          <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>🛡️</span>
          <div>
            <strong>Officer Relief Dispatch &amp; Fulfillment Portal</strong>
            <p style={{ margin: '0.25rem 0 0 0', color: '#1d4ed8', fontWeight: 400 }}>
              Manage intake volume, filter by critical urgency, assign victims to emergency shelters, and advance request fulfillment status.
            </p>
          </div>
        </div>
      )}

      {/* ── METRICS SUMMARY CARDS (Pattern matching Reference Image 1) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1.25rem', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ color: '#475569', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Total Applications</span>
            <span style={{ fontSize: '1.25rem' }}>📋</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
            {requests.length} Requests
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
            Submitted across all affected districts
          </div>
        </div>

        <div style={{ padding: '1.25rem', backgroundColor: '#ffffff', border: '1px solid #fde68a', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ color: '#b45309', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Pending Review</span>
            <span style={{ fontSize: '1.25rem' }}>⏳</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#b45309' }}>
            {pendingCount} Pending
          </div>
          <div style={{ fontSize: '0.8rem', color: '#b45309', marginTop: '0.25rem' }}>
            Awaiting officer verification &amp; triage
          </div>
        </div>

        <div style={{ padding: '1.25rem', backgroundColor: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ color: '#166534', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Fulfilled / Dispatched</span>
            <span style={{ fontSize: '1.25rem' }}>✅</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#15803d' }}>
            {fulfilledCount} Completed
          </div>
          <div style={{ fontSize: '0.8rem', color: '#15803d', marginTop: '0.25rem' }}>
            Relief supplies successfully delivered
          </div>
        </div>
      </div>

      {/* ── FILTER & SEARCH BAR ── */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['all', 'Pending', 'Approved', 'Fulfilled'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: filterStatus === st ? '#2563eb' : '#e2e8f0',
                background: filterStatus === st ? '#eff6ff' : '#ffffff',
                color: filterStatus === st ? '#1d4ed8' : '#475569',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              {st === 'all' ? 'All Applications' : st}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="🔍 Search applicant, phone, district..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ padding: '0.45rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', minWidth: '240px' }}
        />
      </div>

      {/* ── TABLE / LIST ── */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
          <p>Loading relief applications...</p>
        </div>
      ) : (
        <AidRequestTable requests={filteredRequests} isOfficer={isOfficer} onStatusChange={isOfficer ? handleStatusChange : undefined} />
      )}

      {/* ── SUBMIT APPLICATION MODAL ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '2rem', width: '560px', maxWidth: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>📋</span>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  Emergency Relief Aid Application
                </h2>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Full Name of Victim / Applicant *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kasun Bandara"
                  value={newRequest.victimName}
                  onChange={(e) => setNewRequest({ ...newRequest, victimName: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    Contact Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 0771234567"
                    value={newRequest.contactPhone}
                    onChange={(e) => setNewRequest({ ...newRequest, contactPhone: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    Affected District *
                  </label>
                  <select
                    value={newRequest.district}
                    onChange={(e) => setNewRequest({ ...newRequest, district: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', background: '#fff', boxSizing: 'border-box' }}
                  >
                    {SRI_LANKA_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    Primary Relief Category Needed *
                  </label>
                  <select
                    value={newRequest.aidType}
                    onChange={(e) => setNewRequest({ ...newRequest, aidType: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', background: '#fff', boxSizing: 'border-box' }}
                  >
                    {AID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    Family Members
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={newRequest.familySize}
                    onChange={(e) => setNewRequest({ ...newRequest, familySize: Number(e.target.value) })}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Urgency Level
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['Critical', 'High', 'Medium', 'Low'].map((lvl) => (
                    <label
                      key={lvl}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        border: '1px solid',
                        borderColor: newRequest.urgency === lvl ? '#2563eb' : '#cbd5e1',
                        background: newRequest.urgency === lvl ? '#eff6ff' : '#ffffff',
                        borderRadius: '6px',
                        textAlign: 'center',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: newRequest.urgency === lvl ? '#1d4ed8' : '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="urgency"
                        value={lvl}
                        checked={newRequest.urgency === lvl}
                        onChange={(e) => setNewRequest({ ...newRequest, urgency: e.target.value })}
                        style={{ display: 'none' }}
                      />
                      {lvl}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Specific Needs / Situation Details
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Ground floor submerged, 2 infants in family needing milk powder, elderly needing dry rations."
                  value={newRequest.notes}
                  onChange={(e) => setNewRequest({ ...newRequest, notes: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '0.65rem 1.25rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', color: '#475569' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                  }}
                >
                  {submitting ? 'Submitting...' : '✓ Submit Aid Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
