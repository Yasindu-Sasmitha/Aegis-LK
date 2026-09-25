import React, { useEffect, useState } from 'react';
import { resourceApi } from '../api/resourceApi';
import type { DeliveryItem } from '../types/resourceTypes';

export const DeliveryPage: React.FC = () => {
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await resourceApi.getDeliveries();
      setDeliveries(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const completeDelivery = async (id: string) => {
    await resourceApi.completeDelivery(id);
    await load();
  };

  return (
    <div style={{ color: '#e2e8f0' }}>
      <h2 style={{ margin: '0 0 1rem', color: '#f8fafc' }}>📦 Delivery Tracking</h2>

      <div style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(148,163,184,0.15)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'rgba(30,41,59,0.8)' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.85rem 1rem', color: '#cbd5e1' }}>Dispatch</th>
              <th style={{ textAlign: 'left', padding: '0.85rem 1rem', color: '#cbd5e1' }}>Item</th>
              <th style={{ textAlign: 'left', padding: '0.85rem 1rem', color: '#cbd5e1' }}>Qty</th>
              <th style={{ textAlign: 'left', padding: '0.85rem 1rem', color: '#cbd5e1' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '0.85rem 1rem', color: '#cbd5e1' }}>Action</th>
            </tr>
          </thead>

          <tbody>
            {deliveries.map((delivery) => (
              <tr key={delivery.id} style={{ borderTop: '1px solid rgba(148,163,184,0.12)' }}>
                <td style={{ padding: '0.85rem 1rem', color: '#f8fafc' }}>{delivery.dispatchId}</td>
                <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1' }}>{delivery.itemName}</td>
                <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1' }}>{delivery.quantity}</td>
                <td style={{ padding: '0.85rem 1rem' }}>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: 999,
                      fontSize: '0.7rem',
                      background: delivery.delivered ? 'rgba(16,185,129,0.12)' : 'rgba(251,191,36,0.12)',
                      color: delivery.delivered ? '#6ee7b7' : '#fbbf24',
                    }}
                  >
                    {delivery.delivered ? 'Delivered' : 'Pending'}
                  </span>
                </td>
                <td style={{ padding: '0.85rem 1rem' }}>
                  {!delivery.delivered && (
                    <button
                      onClick={() => completeDelivery(delivery.id)}
                      style={{
                        background: '#10b981',
                        color: '#03130d',
                        border: 'none',
                        borderRadius: 8,
                        padding: '0.45rem 0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Mark Delivered
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {loading && <div style={{ padding: '1rem', color: '#94a3b8' }}>Loading deliveries…</div>}
      </div>
    </div>
  );
};