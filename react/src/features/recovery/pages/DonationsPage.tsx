import React, { useEffect, useState } from 'react';
import { fetchDonations, createDonation } from '../api/recoveryApi';
import { DonationTracker } from '../components/DonationTracker';
import { Donation } from '../types/recoveryTypes';

export const DonationsPage: React.FC = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newDonation, setNewDonation] = useState({
    donorName: '',
    donorContact: '',
    donationType: 'Monetary',
    amountOrQuantity: 25000,
    itemDescription: 'Emergency Citizen Subsistence Fund',
  });

  const loadDonations = async () => {
    setLoading(true);
    try {
      const data = await fetchDonations();
      setDonations(Array.isArray(data) ? data : (data as any).items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDonations();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDonation.donorName.trim()) {
      alert('Please provide a donor or organization name.');
      return;
    }

    setSubmitting(true);
    try {
      await createDonation({
        ...newDonation,
        allocationStatus: 'Unallocated',
      });
      setShowModal(false);
      setNewDonation({
        donorName: '',
        donorContact: '',
        donationType: 'Monetary',
        amountOrQuantity: 25000,
        itemDescription: 'Emergency Citizen Subsistence Fund',
      });
      loadDonations();
      alert('Donation contribution recorded successfully in the transparency ledger.');
    } catch (err: any) {
      alert(err.message || 'Failed to record donation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#0f172a' }}>
      
      {/* ── HEADER & ACTION BUTTON ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '1.85rem' }}>📦</span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#0f172a' }}>
              Public Community Donations & Supplies Registry
            </h1>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
            Transparent tracking of citizen donations, corporate CSR grants, and relief supply distributions to evacuation camps.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'linear-gradient(135deg, #15803d, #16a34a)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
          }}
        >
          <span>➕</span>
          <span>Record Community Donation</span>
        </button>
      </div>

      {/* ── TRACKER & TABLE ── */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
          <p>Loading donations registry...</p>
        </div>
      ) : (
        <DonationTracker donations={donations} />
      )}

      {/* ── LOG DONATION MODAL ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '2rem', width: '520px', maxWidth: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>🎁</span>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  Record Public Relief Contribution
                </h2>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Donor / Organization Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarvodaya Shramadana or Anonymous"
                  value={newDonation.donorName}
                  onChange={(e) => setNewDonation({ ...newDonation, donorName: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    Donation Type *
                  </label>
                  <select
                    value={newDonation.donationType}
                    onChange={(e) => setNewDonation({ ...newDonation, donationType: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', background: '#fff', boxSizing: 'border-box' }}
                  >
                    <option value="Monetary">Monetary (LKR Cash Grant)</option>
                    <option value="Supplies">Physical Relief Supplies</option>
                    <option value="Equipment">Medical / Generator Equipment</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                    {newDonation.donationType === 'Monetary' ? 'Amount (LKR) *' : 'Quantity (Units) *'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newDonation.amountOrQuantity}
                    onChange={(e) => setNewDonation({ ...newDonation, amountOrQuantity: Number(e.target.value) })}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Contact Email or Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. donor@example.org or 0112345678"
                  value={newDonation.donorContact}
                  onChange={(e) => setNewDonation({ ...newDonation, donorContact: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                  Item Description / Target Purpose
                </label>
                <input
                  type="text"
                  placeholder="e.g. 100 boxes of dry rations, 50 hygiene packs, drinking water"
                  value={newDonation.itemDescription}
                  onChange={(e) => setNewDonation({ ...newDonation, itemDescription: e.target.value })}
                  style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
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
                    background: '#15803d',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting ? 'Recording...' : '✓ Record Donation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
