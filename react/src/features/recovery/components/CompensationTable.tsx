import React, { useState } from 'react';
import { Compensation } from '../types/recoveryTypes';

interface Props {
  claims: Compensation[];
  onApprove?: (id: string, approvedAmount: number, status: string, notes: string) => void;
}

export const CompensationTable: React.FC<Props> = ({ claims, onApprove }) => {
  const [selectedClaim, setSelectedClaim] = useState<Compensation | null>(null);
  const [approvedAmount, setApprovedAmount] = useState<number>(0);
  const [status, setStatus] = useState<string>('Approved');
  const [notes, setNotes] = useState<string>('');

  const handleOpenApprove = (c: Compensation) => {
    setSelectedClaim(c);
    setApprovedAmount(c.claimAmount);
    setStatus('Approved');
    setNotes(c.verificationNotes || '');
  };

  const handleConfirm = () => {
    if (selectedClaim && onApprove) {
      onApprove(selectedClaim.id, approvedAmount, status, notes);
      setSelectedClaim(null);
    }
  };

  return (
    <div>
      <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '0.75rem 1rem' }}>Applicant Name</th>
              <th style={{ padding: '0.75rem 1rem' }}>Damage Category</th>
              <th style={{ padding: '0.75rem 1rem' }}>Claimed Amount</th>
              <th style={{ padding: '0.75rem 1rem' }}>Approved Amount</th>
              <th style={{ padding: '0.75rem 1rem' }}>Status</th>
              <th style={{ padding: '0.75rem 1rem' }}>Approved By</th>
              {onApprove && <th style={{ padding: '0.75rem 1rem' }}>Officer Actions</th>}
            </tr>
          </thead>
          <tbody>
            {claims.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{c.applicantName}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{c.damageCategory}</td>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Rs. {c.claimAmount.toLocaleString()}</td>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#059669' }}>
                  {c.approvedAmount ? `Rs. ${c.approvedAmount.toLocaleString()}` : '-'}
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      backgroundColor: c.status === 'Approved' || c.status === 'Disbursed' ? '#dcfce7' : c.status === 'Rejected' ? '#fee2e2' : '#fef3c7',
                      color: c.status === 'Approved' || c.status === 'Disbursed' ? '#166534' : c.status === 'Rejected' ? '#991b1b' : '#92400e',
                    }}
                  >
                    {c.status}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 1rem', color: '#6b7280' }}>{c.approvedBy || '-'}</td>
                {onApprove && (
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {c.status === 'Submitted' || c.status === 'UnderReview' ? (
                      <button
                        onClick={() => handleOpenApprove(c)}
                        style={{ padding: '4px 10px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Review / Approve
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Completed</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedClaim && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '1.5rem', borderRadius: '8px', width: '450px', maxWidth: '90%' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Review Compensation Claim</h3>
            <p style={{ margin: '0 0 0.5rem 0' }}>Applicant: <strong>{selectedClaim.applicantName}</strong></p>
            <p style={{ margin: '0 0 1rem 0' }}>Claimed Amount: <strong>Rs. {selectedClaim.claimAmount.toLocaleString()}</strong></p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Approved Amount (Rs.)</label>
              <input
                type="number"
                value={approvedAmount}
                onChange={(e) => setApprovedAmount(Number(e.target.value))}
                max={selectedClaim.claimAmount}
                min={0}
                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Decision</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}>
                <option value="Approved">Approved</option>
                <option value="Disbursed">Disbursed</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Officer Verification Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button onClick={() => setSelectedClaim(null)} style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleConfirm} style={{ padding: '6px 12px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Submit Decision</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
