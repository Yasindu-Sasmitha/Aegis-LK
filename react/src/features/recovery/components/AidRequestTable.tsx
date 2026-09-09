import React from 'react';
import { AidRequest } from '../types/recoveryTypes';

interface Props {
  requests: AidRequest[];
  onStatusChange?: (id: string, newStatus: string) => void;
}

export const AidRequestTable: React.FC<Props> = ({ requests, onStatusChange }) => {
  return (
    <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <th style={{ padding: '0.75rem 1rem' }}>Victim Name</th>
            <th style={{ padding: '0.75rem 1rem' }}>Phone</th>
            <th style={{ padding: '0.75rem 1rem' }}>District</th>
            <th style={{ padding: '0.75rem 1rem' }}>Aid Type</th>
            <th style={{ padding: '0.75rem 1rem' }}>Family Size</th>
            <th style={{ padding: '0.75rem 1rem' }}>Urgency</th>
            <th style={{ padding: '0.75rem 1rem' }}>Status</th>
            <th style={{ padding: '0.75rem 1rem' }}>Assigned Shelter</th>
            {onStatusChange && <th style={{ padding: '0.75rem 1rem' }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => {
            const urgencyBg = r.urgency === 'Critical' ? '#fee2e2' : r.urgency === 'High' ? '#ffedd5' : '#f3f4f6';
            const urgencyColor = r.urgency === 'Critical' ? '#991b1b' : r.urgency === 'High' ? '#c2410c' : '#374151';

            return (
              <tr key={r.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{r.victimName}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{r.contactPhone}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{r.district}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{r.aidType}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{r.familySize}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{ backgroundColor: urgencyBg, color: urgencyColor, padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                    {r.urgency}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{ fontWeight: 600, color: r.status === 'Fulfilled' ? '#059669' : r.status === 'Approved' ? '#2563eb' : '#6b7280' }}>
                    {r.status}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>{r.shelterName || 'Unassigned'}</td>
                {onStatusChange && (
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {r.status === 'Pending' && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => onStatusChange(r.id, 'Approved')}
                          style={{ padding: '4px 8px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => onStatusChange(r.id, 'Rejected')}
                          style={{ padding: '4px 8px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                    {r.status === 'Approved' && (
                      <button
                        onClick={() => onStatusChange(r.id, 'Fulfilled')}
                        style={{ padding: '4px 8px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Mark Fulfilled
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
