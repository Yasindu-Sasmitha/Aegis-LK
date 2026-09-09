import React, { useEffect, useState } from 'react';
import { fetchReports } from '../api/recoveryApi';
import { RecoveryReport } from '../types/recoveryTypes';

export const RecoveryReportsPage: React.FC = () => {
  const [reports, setReports] = useState<RecoveryReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchReports();
        setReports(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 0.5rem 0' }}>📊 Recovery Audit & Summary Reports</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Post-disaster auditing, budget expenditure breakdown, and relief statistics.</p>

      {loading ? (
        <div>Loading reports...</div>
      ) : reports.length === 0 ? (
        <div style={{ padding: '2rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          No historical recovery reports generated yet. Reports are generated after recovery plan execution.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {reports.map((r) => (
            <div key={r.id} style={{ border: '1px solid #e2e8f0', padding: '1.25rem', borderRadius: '8px', backgroundColor: '#ffffff' }}>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>{r.title}</h3>
              <p style={{ margin: '0 0 0.75rem 0', color: '#475569' }}>{r.reportSummary}</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div>Sheltered Count: <strong>{r.totalSheltered}</strong></div>
                <div>Fulfilled Aid Requests: <strong>{r.totalAidRequestsFulfilled}</strong></div>
                <div>Compensation Disbursed: <strong>Rs. {r.totalCompensationDisbursed.toLocaleString()}</strong></div>
                <div>Budget Spent: <strong>Rs. {r.totalBudgetSpent.toLocaleString()}</strong></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
