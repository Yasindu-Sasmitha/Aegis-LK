import React, { useState } from 'react';
import { Compensation } from '../types/recoveryTypes';

interface Props {
  claims: Compensation[];
  isOfficer: boolean;
  onApprove?: (id: string, approvedAmount: number, status: string, notes: string) => void;
}

export const CompensationTable: React.FC<Props> = ({ claims, isOfficer, onApprove }) => {
  const [selectedClaim, setSelectedClaim] = useState<Compensation | null>(null);
  const [approvedAmount, setApprovedAmount] = useState<number>(0);
  const [status, setStatus] = useState<string>('Approved');
  const [notes, setNotes] = useState<string>('');

  const handleOpenApprove = (c: Compensation) => {
    setSelectedClaim(c);
    setApprovedAmount(c.approvedAmount || c.claimAmount);
    setStatus(c.status === 'Submitted' ? 'Approved' : c.status);
    setNotes(c.verificationNotes || '');
  };

  const handleConfirm = () => {
    if (selectedClaim && onApprove) {
      onApprove(selectedClaim.id, approvedAmount, status, notes);
      setSelectedClaim(null);
    }
  };

  if (claims.length === 0) {
    return (
      <div style={{ padding: '3rem 2rem', textAlign: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#64748b' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📑</div>
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontWeight: 700 }}>No Compensation Claims Found</h3>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          {isOfficer
            ? 'No citizen property compensation claims found. Click "+ File Damage Compensation Claim" to register a claim.'
            : 'You have not filed any property or livelihood loss claims yet. Click "+ File Damage Compensation Claim" to begin.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem', color: '#0f172a' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Claimant / NIC</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Damage Category</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Claim Amount</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Approved Payout</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Status</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Audited By</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>Filing Date</th>
                {isOfficer && onApprove && <th style={{ padding: '0.85rem 1rem', fontWeight: 700, textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {claims.map((c, idx) => (
                <tr
                  key={c.id}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                    transition: 'background 0.15s',
                  }}
                >
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                    <div>{c.applicantName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace', fontWeight: 600 }}>
                      NIC: {c.nic}
                    </div>
                    {c.verificationNotes && (
                      <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.2rem', maxWidth: '260px', fontWeight: 400 }}>
                        {c.verificationNotes}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#334155', fontWeight: 600 }}>
                    <span style={{ background: '#f1f5f9', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                      🏠 {c.damageCategory}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                    Rs. {c.claimAmount.toLocaleString()}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: c.approvedAmount ? '#15803d' : '#64748b' }}>
                    {c.approvedAmount ? `Rs. ${c.approvedAmount.toLocaleString()}` : '—'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background:
                          c.status === 'Approved' || c.status === 'Disbursed'
                            ? '#dcfce7'
                            : c.status === 'Rejected'
                            ? '#fee2e2'
                            : '#fef3c7',
                        color:
                          c.status === 'Approved' || c.status === 'Disbursed'
                            ? '#15803d'
                            : c.status === 'Rejected'
                            ? '#b91c1c'
                            : '#b45309',
                      }}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#475569', fontSize: '0.8rem' }}>
                    {c.approvedBy ? `🛡️ ${c.approvedBy}` : '—'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                  {isOfficer && onApprove && (
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      {c.status === 'Submitted' || c.status === 'UnderReview' ? (
                        <button
                          onClick={() => handleOpenApprove(c)}
                          style={{
                            padding: '0.35rem 0.75rem',
                            backgroundColor: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                          }}
                        >
                          Review & Payout →
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenApprove(c)}
                          style={{
                            padding: '0.35rem 0.6rem',
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                          }}
                        >
                          Edit Decision
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── OFFICER REVIEW MODAL ── */}
      {selectedClaim && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', padding: '2rem', borderRadius: '16px', width: '500px', maxWidth: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Review Damage Compensation Claim</h3>
              <button onClick={() => setSelectedClaim(null)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>Claimant: <strong>{selectedClaim.applicantName}</strong> (NIC: {selectedClaim.nic})</div>
              <div style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>Category: <strong>{selectedClaim.damageCategory}</strong></div>
              <div style={{ fontSize: '0.85rem' }}>Claimed Loss: <strong style={{ color: '#dc2626' }}>Rs. {selectedClaim.claimAmount.toLocaleString()}</strong></div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                Approved Payout Amount (LKR) *
              </label>
              <input
                type="number"
                value={approvedAmount}
                onChange={(e) => setApprovedAmount(Number(e.target.value))}
                style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                Decision Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', background: '#fff', boxSizing: 'border-box' }}
              >
                <option value="Approved">Approved (Grant Payout)</option>
                <option value="UnderReview">Under Field Investigation</option>
                <option value="Disbursed">Disbursed (Funds Transferred)</option>
                <option value="Rejected">Rejected (Ineligible)</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '0.3rem' }}>
                Verification & Audit Notes
              </label>
              <textarea
                rows={3}
                placeholder="Grama Niladhari assessment, damage confirmation..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedClaim(null)}
                style={{ padding: '0.65rem 1.25rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', color: '#475569' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                style={{ padding: '0.65rem 1.5rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
              >
                ✓ Save Decision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
