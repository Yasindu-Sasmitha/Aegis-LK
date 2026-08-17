import React, { useEffect, useState } from 'react';
import { fetchShelters, fetchAidRequests, fetchDonations, fetchCompensations } from '../api/recoveryApi';

export const RecoveryDashboardPage: React.FC = () => {
  const [stats, setStats] = useState({
    sheltersCount: 0,
    activeShelterOccupancy: 0,
    aidRequestsCount: 0,
    pendingAid: 0,
    donationsCount: 0,
    claimsCount: 0,
    loading: true,
  });

  useEffect(() => {
    async function loadData() {
      try {
        const [shelters, aid, donations, claims] = await Promise.all([
          fetchShelters(),
          fetchAidRequests(),
          fetchDonations(),
          fetchCompensations(),
        ]);

        const occ = shelters.reduce((sum, s) => sum + s.currentOccupancy, 0);
        const pending = aid.filter((a) => a.status === 'Pending').length;

        setStats({
          sheltersCount: shelters.length,
          activeShelterOccupancy: occ,
          aidRequestsCount: aid.length,
          pendingAid: pending,
          donationsCount: donations.length,
          claimsCount: claims.length,
          loading: false,
        });
      } catch {
        setStats((prev) => ({ ...prev, loading: false }));
      }
    }
    loadData();
  }, []);

  if (stats.loading) return <div style={{ padding: '2rem' }}>Loading Recovery Dashboard...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ margin: '0 0 0.5rem 0', color: '#0f172a' }}>🏛 Recovery & Community Support</h1>
      <p style={{ color: '#475569', marginBottom: '2rem' }}>
        Post-disaster shelter management, community aid dispatch, donation tracking, and agentic recovery planning.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        <div style={{ padding: '1.25rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: '#1e40af' }}>Active Emergency Shelters</span>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.75rem', fontWeight: 'bold', color: '#1d4ed8' }}>
            {stats.sheltersCount}
          </p>
          <small style={{ color: '#3b82f6' }}>{stats.activeShelterOccupancy} current occupants</small>
        </div>

        <div style={{ padding: '1.25rem', backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: '#92400e' }}>Pending Aid Applications</span>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.75rem', fontWeight: 'bold', color: '#b45309' }}>
            {stats.pendingAid}
          </p>
          <small style={{ color: '#d97706' }}>Out of {stats.aidRequestsCount} total requests</small>
        </div>

        <div style={{ padding: '1.25rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: '#166534' }}>Donation Packages</span>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.75rem', fontWeight: 'bold', color: '#15803d' }}>
            {stats.donationsCount}
          </p>
          <small style={{ color: '#16a34a' }}>Registered contributions</small>
        </div>

        <div style={{ padding: '1.25rem', backgroundColor: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '8px' }}>
          <span style={{ fontSize: '0.85rem', color: '#6b21a8' }}>Compensation Claims</span>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.75rem', fontWeight: 'bold', color: '#7e22ce' }}>
            {stats.claimsCount}
          </p>
          <small style={{ color: '#9333ea' }}>Submitted for review</small>
        </div>
      </div>
    </div>
  );
};
