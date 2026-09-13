import React from 'react';
import { AidRequest } from '../types/recoveryTypes';

interface Props {
  requests: AidRequest[];
  isOfficer: boolean;
  onStatusChange?: (id: string, newStatus: string) => void;
}

export const AidRequestTable: React.FC<Props> = ({ requests, isOfficer, onStatusChange }) => {
  if (requests.length === 0) {
    return (
      <div style={{ padding: '3rem 2rem', textAlign: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#64748b' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📭</div>
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontWeight: 700 }}>No Aid Applications Found</h3>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          {isOfficer
            ? 'No citizen aid applications match the selected criteria. Use "+ Apply for Emergency Relief" to log a field request.'
            : 'You have not submitted any aid applications yet. Click "+ Apply for Emergency Relief" to file an urgent request.'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem', color: '#0f172a' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Victim / Applicant</th>
              <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Contact Phone</th>
              <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>District</th>
              <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Aid Type Requested</th>
              <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Family Size</th>
              <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Urgency</th>
              <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Status</th>
              <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Assigned Shelter</th>
              {isOfficer && onStatusChange && <th style={{ padding: '0.85rem 1rem', fontWeight: 700, textAlign: 'right' }}>Officer Actions</th>}
            </tr>
          </thead>
          <tbody>
            {requests.map((r, idx) => {
              const isUrgent = r.urgency === 'Critical' || r.urgency === 'High';
              return (
                <tr
                  key={r.id}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                    transition: 'background 0.15s',
                  }}
                >
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                    <div>{r.victimName}</div>
                    {r.notes && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400, marginTop: '0.2rem', maxWidth: '280px' }}>
                        {r.notes}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#334155', fontFamily: 'monospace', fontWeight: 600 }}>
                    {r.contactPhone}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#334155' }}>
                    <span style={{ background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600, fontSize: '0.8rem' }}>
                      📍 {r.district}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#1e3a8a' }}>
                    {r.aidType}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#334155' }}>
                    👥 {r.familySize} members
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: r.urgency === 'Critical' ? '#fee2e2' : r.urgency === 'High' ? '#fef3c7' : '#f1f5f9',
                        color: r.urgency === 'Critical' ? '#dc2626' : r.urgency === 'High' ? '#b45309' : '#475569',
                      }}
                    >
                      {isUrgent ? '🔥 ' : ''}{r.urgency}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: r.status === 'Fulfilled' ? '#dcfce7' : r.status === 'Approved' ? '#eff6ff' : r.status === 'Rejected' ? '#fee2e2' : '#fef3c7',
                        color: r.status === 'Fulfilled' ? '#15803d' : r.status === 'Approved' ? '#1d4ed8' : r.status === 'Rejected' ? '#b91c1c' : '#b45309',
                      }}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
                    {r.shelterName ? `⛺ ${r.shelterName}` : '—'}
                  </td>
                  {isOfficer && onStatusChange && (
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        {r.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => onStatusChange(r.id, 'Approved')}
                              style={{ padding: '0.35rem 0.75rem', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem' }}
                            >
                              ✓ Approve
                            </button>
                            <button
                              onClick={() => onStatusChange(r.id, 'Rejected')}
                              style={{ padding: '0.35rem 0.6rem', backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem' }}
                            >
                              ✕ Reject
                            </button>
                          </>
                        )}
                        {r.status === 'Approved' && (
                          <button
                            onClick={() => onStatusChange(r.id, 'Fulfilled')}
                            style={{ padding: '0.35rem 0.75rem', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem' }}
                          >
                            📦 Mark Dispatched / Fulfilled
                          </button>
                        )}
                        {r.status === 'Fulfilled' && (
                          <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 700 }}>✓ Completed</span>
                        )}
                        {r.status === 'Rejected' && (
                          <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>✕ Declined</span>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
