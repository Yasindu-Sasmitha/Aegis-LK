import React, { useEffect, useState } from 'react';
import { resourceApi } from '../api/resourceApi';
import type { Warehouse } from '../types/resourceTypes';

export const WarehousePage: React.FC = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => {
    void resourceApi.getWarehouses().then(setWarehouses);
  }, []);

  return (
    <div style={{ color: '#e2e8f0' }}>
      <h2 style={{ margin: '0 0 1rem', color: '#f8fafc' }}>🏭 Warehouses</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
        {warehouses.map((warehouse) => {
          const percent = Math.min((warehouse.availableStock / warehouse.capacity) * 100, 100);
          return (
            <div key={warehouse.id} style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(148,163,184,0.15)', borderRadius: 12, padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>{warehouse.name}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{warehouse.district}</div>
                </div>
                <span style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: 999, background: warehouse.status === 'Critical' ? 'rgba(239,68,68,0.12)' : warehouse.status === 'Low' ? 'rgba(251,191,36,0.12)' : 'rgba(16,185,129,0.12)', color: warehouse.status === 'Critical' ? '#fca5a5' : warehouse.status === 'Low' ? '#fbbf24' : '#6ee7b7' }}>
                  {warehouse.status}
                </span>
              </div>

              <div style={{ height: 8, borderRadius: 999, background: 'rgba(148,163,184,0.12)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${percent}%`, background: warehouse.status === 'Critical' ? '#f87171' : warehouse.status === 'Low' ? '#fbbf24' : '#34d399', borderRadius: 999 }} />
              </div>

              <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', color: '#cbd5e1', fontSize: '0.8rem' }}>
                <div><strong>Capacity</strong><div>{warehouse.capacity}</div></div>
                <div><strong>Available</strong><div>{warehouse.availableStock}</div></div>
              </div>
              <div style={{ marginTop: '0.75rem', color: '#94a3b8', fontSize: '0.72rem' }}>Updated: {new Date(warehouse.updatedAt).toLocaleString()}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
