import React, { useEffect, useState } from 'react';
import { resourceApi } from '../api/resourceApi';
import type { InventoryItem } from '../types/resourceTypes';

export const InventoryPage: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  useEffect(() => {
    void resourceApi.getInventory().then(setInventory);
  }, []);

  return (
    <div style={{ color: '#e2e8f0' }}>
      <h2 style={{ margin: '0 0 1rem', color: '#f8fafc' }}>📦 Inventory</h2>

      <div style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(148,163,184,0.15)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'rgba(30,41,59,0.8)' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.85rem 1rem', color: '#cbd5e1' }}>Item</th>
              <th style={{ textAlign: 'left', padding: '0.85rem 1rem', color: '#cbd5e1' }}>Warehouse</th>
              <th style={{ textAlign: 'left', padding: '0.85rem 1rem', color: '#cbd5e1' }}>Qty</th>
              <th style={{ textAlign: 'left', padding: '0.85rem 1rem', color: '#cbd5e1' }}>Reorder</th>
              <th style={{ textAlign: 'left', padding: '0.85rem 1rem', color: '#cbd5e1' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((item) => {
              const isLow = item.quantity <= item.reorderLevel;
              return (
                <tr key={item.id} style={{ borderTop: '1px solid rgba(148,163,184,0.12)' }}>
                  <td style={{ padding: '0.85rem 1rem', color: '#f8fafc' }}>{item.itemName}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1' }}>{item.warehouseId}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1' }}>{item.quantity} {item.unit}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1' }}>{item.reorderLevel}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ padding: '4px 8px', borderRadius: 999, fontSize: '0.7rem', background: isLow ? 'rgba(251,191,36,0.12)' : 'rgba(16,185,129,0.12)', color: isLow ? '#fbbf24' : '#6ee7b7' }}>
                      {isLow ? 'Low stock' : 'Healthy'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
