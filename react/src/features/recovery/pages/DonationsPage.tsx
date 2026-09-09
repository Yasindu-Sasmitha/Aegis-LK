import React, { useEffect, useState } from 'react';
import { fetchDonations, createDonation } from '../api/recoveryApi';
import { DonationTracker } from '../components/DonationTracker';
import { Donation } from '../types/recoveryTypes';

export const DonationsPage: React.FC = () => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<{
    donorName: string;
    donorContact: string;
    donationType: 'Monetary' | 'Supplies' | 'Equipment';
    amountOrQuantity: number;
    itemDescription: string;
  }>({
    donorName: '',
    donorContact: '',
    donationType: 'Monetary',
    amountOrQuantity: 10000,
    itemDescription: 'Emergency Relief Contribution',
  });

  const loadDonations = async () => {
    setLoading(true);
    try {
      const data = await fetchDonations();
      setDonations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDonations();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createDonation(form);
      setShowModal(false);
      loadDonations();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>📦 Community Donations & Supplies</h1>
          <p style={{ color: '#64748b', margin: '0.25rem 0 0 0' }}>Track public contributions and shelter allocations.</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ padding: '10px 16px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
          + Record Donation
        </button>
      </div>

      {loading ? <div>Loading donations...</div> : <DonationTracker donations={donations} />}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleCreate} style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', width: '400px', maxWidth: '90%' }}>
            <h3 style={{ marginTop: 0 }}>Record New Donation</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input placeholder="Donor Name" required value={form.donorName} onChange={(e) => setForm({ ...form, donorName: e.target.value })} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
              <input placeholder="Donor Contact (Private)" value={form.donorContact} onChange={(e) => setForm({ ...form, donorContact: e.target.value })} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
              <select value={form.donationType} onChange={(e) => setForm({ ...form, donationType: e.target.value as 'Monetary' | 'Supplies' | 'Equipment' })} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
                <option value="Monetary">Monetary</option>
                <option value="Supplies">Supplies</option>
                <option value="Equipment">Equipment</option>
              </select>
              <input type="number" placeholder="Amount / Quantity" required min={1} value={form.amountOrQuantity} onChange={(e) => setForm({ ...form, amountOrQuantity: Number(e.target.value) })} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
              <input placeholder="Item Description" value={form.itemDescription} onChange={(e) => setForm({ ...form, itemDescription: e.target.value })} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" onClick={() => setShowModal(false)} style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ padding: '6px 12px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Record</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
