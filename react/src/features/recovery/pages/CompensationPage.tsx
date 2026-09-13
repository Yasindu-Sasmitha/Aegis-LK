import React, { useEffect, useState } from 'react';
import { fetchCompensations, createCompensation, approveCompensation } from '../api/recoveryApi';
import { CompensationTable } from '../components/CompensationTable';
import { Compensation } from '../types/recoveryTypes';

const DAMAGE_CATEGORIES = [
  'Total House Loss',
  'Partial Roof Damage',
  'Structural Wall Damage',
  'Livelihood Loss (Paddy & Agriculture)',
  'Commercial Shop / Small Business Loss',
  'Fishing Boat & Equipment Damage',
];

export const CompensationPage: React.FC = () => {
  const [claims, setClaims] = useState<Compensation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOfficer, setIsOfficer] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newClaim, setNewClaim] = useState({
    applicantName: '',
    nic: '',
    damageCategory: 'Total House Loss',
    claimAmount: 500000,
    verificationNotes: '',
  });

  const loadClaims = async () => {
    setLoading(true);
    try {
      const data = await fetchCompensations(filterStatus === 'all' ? undefined : filterStatus);
      setClaims(Array.isArray(data) ? data : (data as any).items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClaims();
  }, [filterStatus]);

  const handleApprove = async (id: string, approvedAmount: number, status: string, notes: string) => {
    try {
      await approveCompensation(id, approvedAmount, status, notes, 'DMC Recovery Officer');
      loadClaims();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClaim.applicantName.trim() || !newClaim.nic.trim()) {
      alert('Please enter your full name and National Identity Card (NIC) number.');
      return;
    }

    setSubmitting(true);
    try {
      await createCompensation(newClaim);
      setShowModal(false);
      setNewClaim({
        applicantName: '',
        nic: '',
        damageCategory: 'Total House Loss',
        claimAmount: 500000,
        verificationNotes: '',
      });
      loadClaims();
      alert('Your damage compensation claim has been submitted for official field verification.');
    } catch (err: any) {
      alert(err.message || 'Failed to submit compensation claim');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredClaims = claims.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.applicantName.toLowerCase().includes(q) ||
      (c.nic ? c.nic.toLowerCase().includes(q) : false) ||
      c.damageCategory.toLowerCase().includes(q)
    );
  });

  const totalClaimed = claims.reduce((sum, c) => sum + (c.claimAmount || 0), 0);
  const totalApproved = claims.reduce((sum, c) => sum + (c.approvedAmount || 0), 0);
  const pendingCount = claims.filter((c) => c.status === 'Submitted' || c.status === 'UnderReview').length;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#0f172a' }}>
      
      {/* ── HEADER & ROLE SWITCHER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '1.85rem' }}>💳</span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#0f172a' }}>
              Disaster Damage Compensation & Loss Grants
            </h1>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
            Government financial assistance for completely destroyed houses, structural roof damage, and agrarian livelihood losses.
          </p>
        </div>

        {/* User Role Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.4rem 0.75rem', borderRadius: '10px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>Active Mode:</span>
          <button
            onClick={() => setIsOfficer(!isOfficer)}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              border: 'none',
              background: isOfficer ? '#1e3a8a' : '#16a34a',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            <span>{isOfficer ? '🛡️ DMC Officer View' : '👤 Citizen / Claimant View'}</span>
            <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>(Click to switch)</span>
          </button>
        </div>
      </div>

      {/* ── CITIZEN INFO BANNER ── */}
      {!isOfficer && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          background: '#faf5ff',
          border: '1px solid #e9d5ff',
          borderLeft: '4px solid #7e22ce',
          borderRadius: '10px',
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem',
          fontSize: '0.9rem',
          color: '#7e22ce',
        }}>
          <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>📋</span>
          <div>
            <strong>Citizen Claimant Portal</strong>
            <p style={{ margin: '0.25rem 0 0 0', color: '#6b21a8', fontWeight: 400 }}>
              You can <strong>file a new compensation claim</strong> for property damage or livelihood loss. Once submitted, a Grama Niladhari officer will conduct a field verification. Claim approvals and payout decisions are made by the DMC Recovery Officer.
            </p>
          </div>
        </div>
      )}

      {/* ── METRICS & ACTION BUTTON ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Claims Filed</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0' }}>{claims.length} Claims</div>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Claimed: Rs. {totalClaimed.toLocaleString()}</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase' }}>Approved Payout Funds</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#15803d', margin: '0.2rem 0' }}>Rs. {totalApproved.toLocaleString()}</div>
          <div style={{ fontSize: '0.8rem', color: '#15803d' }}>Verified by DMC audit</div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>Under Field Verification</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#b45309', margin: '0.2rem 0' }}>{pendingCount}</div>
          <div style={{ fontSize: '0.8rem', color: '#b45309' }}>Awaiting Grama Niladhari check</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setShowModal(true)}
            style={{
              width: '100%',
              height: '100%',
              padding: '0.85rem 1.25rem',
              background: 'linear-gradient(135deg, #7e22ce, #6b21a8)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(126, 34, 206, 0.25)',
            }}
          >
            <span>➕</span>
            <span>File Damage Compensation Claim</span>
          </button>
        </div>
      </div>

      {/* ── FILTER & SEARCH BAR ── */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['all', 'Submitted', 'UnderReview', 'Approved', 'Disbursed'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: filterStatus === st ? '#7e22ce' : '#e2e8f0',
                background: filterStatus === st ? '#faf5ff' : '#ffffff',
                color: filterStatus === st ? '#7e22ce' : '#475569',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              {st === 'all' ? 'All Claims' : st}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="🔍 Search applicant name, NIC..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ padding: '0.45rem 0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', minWidth: '240px' }}
        />
      </div>

      {/* ── TABLE / LIST ── */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
          <p>Loading compensation claims...</p>
        </div>
      ) : (
        <CompensationTable claims={filteredClaims} isOfficer={isOfficer} onApprove={isOfficer ? handleApprove : undefined} />
      )}

      {/* ── SUBMIT CLAIM MODAL ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '2rem', width: '560px', maxWidth: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🏠</span>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  File Disaster Damage Compensation Claim
                </h2>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    Full Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Priyani Senanayake"
                    value={newClaim.applicantName}
                    onChange={(e) => setNewClaim({ ...newClaim, applicantName: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    National Identity Card (NIC) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 198264501234 or 826451234V"
                    value={newClaim.nic}
                    onChange={(e) => setNewClaim({ ...newClaim, nic: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    Damage Loss Category *
                  </label>
                  <select
                    value={newClaim.damageCategory}
                    onChange={(e) => setNewClaim({ ...newClaim, damageCategory: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', background: '#fff', boxSizing: 'border-box' }}
                  >
                    {DAMAGE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    Estimated Loss (LKR) *
                  </label>
                  <input
                    type="number"
                    min={1000}
                    step={10000}
                    value={newClaim.claimAmount}
                    onChange={(e) => setNewClaim({ ...newClaim, claimAmount: Number(e.target.value) })}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Property Location & Damage Description
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Grama Niladhari Division, street address, extent of water damage to foundations/walls..."
                  value={newClaim.verificationNotes}
                  onChange={(e) => setNewClaim({ ...newClaim, verificationNotes: e.target.value })}
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
                    padding: '0.65rem 1.5rem',
                    background: '#7e22ce',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting ? 'Submitting...' : '✓ File Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
