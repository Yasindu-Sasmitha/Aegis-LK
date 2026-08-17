import React from 'react';
import { Donation } from '../types/recoveryTypes';

interface Props {
  donations: Donation[];
}

export const DonationTracker: React.FC<Props> = ({ donations }) => {
  const totalMonetary = donations
    .filter((d) => d.donationType === 'Monetary')
    .reduce((sum, d) => sum + d.amountOrQuantity, 0);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 0.25rem 0', color: '#166534', fontSize: '0.875rem' }}>Total Monetary Raised</h4>
          <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#15803d' }}>
            Rs. {totalMonetary.toLocaleString()}
          </p>
        </div>
        <div style={{ padding: '1rem', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 0.25rem 0', color: '#1e40af', fontSize: '0.875rem' }}>Total Relief Packages</h4>
          <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#1d4ed8' }}>
            {donations.filter((d) => d.donationType !== 'Monetary').length} items
          </p>
        </div>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '0.75rem 1rem' }}>Donor Name</th>
              <th style={{ padding: '0.75rem 1rem' }}>Donation Type</th>
              <th style={{ padding: '0.75rem 1rem' }}>Amount / Quantity</th>
              <th style={{ padding: '0.75rem 1rem' }}>Description</th>
              <th style={{ padding: '0.75rem 1rem' }}>Status</th>
              <th style={{ padding: '0.75rem 1rem' }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {donations.map((d) => (
              <tr key={d.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{d.donorName}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{d.donationType}</td>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                  {d.donationType === 'Monetary' ? `Rs. ${d.amountOrQuantity.toLocaleString()}` : d.amountOrQuantity}
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>{d.itemDescription || '-'}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', backgroundColor: d.allocationStatus === 'Distributed' ? '#dcfce7' : '#fef3c7', color: d.allocationStatus === 'Distributed' ? '#166534' : '#92400e' }}>
                    {d.allocationStatus}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 1rem', color: '#6b7280' }}>
                  {new Date(d.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
