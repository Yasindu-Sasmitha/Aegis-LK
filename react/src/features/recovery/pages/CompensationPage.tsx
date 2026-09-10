import React, { useEffect, useState } from 'react';
import { fetchCompensations, approveCompensation } from '../api/recoveryApi';
import { CompensationTable } from '../components/CompensationTable';
import { Compensation } from '../types/recoveryTypes';

export const CompensationPage: React.FC = () => {
  const [claims, setClaims] = useState<Compensation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadClaims = async () => {
    setLoading(true);
    try {
      const data = await fetchCompensations();
      setClaims(Array.isArray(data) ? data : (data as any).items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClaims();
  }, []);

  const handleApprove = async (id: string, approvedAmount: number, status: string, notes: string) => {
    try {
      await approveCompensation(id, approvedAmount, status, notes, 'Recovery Officer');
      loadClaims();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 0.5rem 0' }}>💳 Disaster Damage Compensation</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Review housing & livelihood loss compensation claims.</p>
      {loading ? <div>Loading claims...</div> : <CompensationTable claims={claims} onApprove={handleApprove} />}
    </div>
  );
};
