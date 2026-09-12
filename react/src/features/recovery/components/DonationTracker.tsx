import React from 'react';
import { Donation } from '../types/recoveryTypes';

interface Props {
  donations: Donation[];
}

export const DonationTracker: React.FC<Props> = ({ donations }) => {
  const totalMonetary = donations
    .filter((d) => d.donationType === 'Monetary')
    .reduce((sum, d) => sum + (d.amountOrQuantity || 0), 0);

  const totalSupplies = donations
    .filter((d) => d.donationType !== 'Monetary')
    .reduce((sum, d) => sum + (d.amountOrQuantity || 0), 0);

  if (donations.length === 0) {
    return (
      <div style={{ padding: '3rem 2rem', textAlign: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#64748b' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📦</div>
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontWeight: 700 }}>No Donations Logged Yet</h3>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          Click "+ Record Community Donation" to log public contributions and relief supply packages.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* ── METRIC CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1.25rem', backgroundColor: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ color: '#166534', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Total Monetary Raised</span>
            <span style={{ fontSize: '1.25rem' }}>💵</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#15803d' }}>
            Rs. {totalMonetary.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
            Public citizen relief funds
          </div>
        </div>

        <div style={{ padding: '1.25rem', backgroundColor: '#ffffff', border: '1px solid #bfdbfe', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ color: '#1e40af', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Total Relief Packages</span>
            <span style={{ fontSize: '1.25rem' }}>📦</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1d4ed8' }}>
            {totalSupplies} items
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
            Dry rations, medical kits, and blankets
          </div>
        </div>

        <div style={{ padding: '1.25rem', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ color: '#475569', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Registered Donors</span>
            <span style={{ fontSize: '1.25rem' }}>🤝</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
            {donations.length} Contributions
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
            100% transparent audit trail
          </div>
        </div>
      </div>

      {/* ── HIGH-CONTRAST DONATION TABLE ── */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem', color: '#0f172a' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Donor Name / Organization</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Type</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Amount / Quantity</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Item Description</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Allocation Status</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Date Received</th>
              </tr>
            </thead>
            <tbody>
              {donations.map((d, idx) => (
                <tr
                  key={d.id}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                  }}
                >
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                    <div>{d.donorName}</div>
                    {d.donorContact && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>
                        {d.donorContact}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{
                      padding: '0.2rem 0.6rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: d.donationType === 'Monetary' ? '#dcfce7' : '#eff6ff',
                      color: d.donationType === 'Monetary' ? '#15803d' : '#1d4ed8',
                    }}>
                      {d.donationType === 'Monetary' ? '💵 Monetary' : '📦 Supplies'}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                    {d.donationType === 'Monetary'
                      ? `Rs. ${d.amountOrQuantity.toLocaleString()}`
                      : `${d.amountOrQuantity} Units`}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#334155' }}>
                    {d.itemDescription || 'General Disaster Relief'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor:
                          d.allocationStatus === 'Distributed'
                            ? '#dcfce7'
                            : d.allocationStatus === 'Allocated'
                            ? '#eff6ff'
                            : '#fef3c7',
                        color:
                          d.allocationStatus === 'Distributed'
                            ? '#166534'
                            : d.allocationStatus === 'Allocated'
                            ? '#1e40af'
                            : '#92400e',
                      }}
                    >
                      {d.allocationStatus}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
                    {new Date(d.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
