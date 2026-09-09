import React, { useEffect, useState } from 'react';
import { fetchAidRequests, updateAidRequestStatus } from '../api/recoveryApi';
import { AidRequestTable } from '../components/AidRequestTable';
import { AidRequest } from '../types/recoveryTypes';

export const AidRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<AidRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await fetchAidRequests();
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateAidRequestStatus(id, status);
      loadRequests();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 0.5rem 0' }}>🤝 Citizen Aid Applications</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>Review, approve, and fulfill community relief requests.</p>
      {loading ? <div>Loading aid applications...</div> : <AidRequestTable requests={requests} onStatusChange={handleStatusChange} />}
    </div>
  );
};
