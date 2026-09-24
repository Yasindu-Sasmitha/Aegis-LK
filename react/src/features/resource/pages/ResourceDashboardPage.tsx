import React, { useEffect, useMemo, useState } from 'react';
import { fetchInventoryItems, fetchWarehouses } from '../api/resourceApi';
import type { InventoryItem, Warehouse } from '../types/resourceTypes';
import { getItemTypeLabel } from '../types/resourceTypes';

interface Props {
  onNavigate?: (tab: string) => void;
  refreshKey?: number;
}

export const ResourceDashboardPage: React.FC<Props> = ({ onNavigate, refreshKey = 0 }) => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [warehousesRes, inventoryRes] = await Promise.all([
          fetchWarehouses({ page: 1, pageSize: 100 }),
          fetchInventoryItems({ page: 1, pageSize: 100 }),
        ]);

        setWarehouses(Array.isArray(warehousesRes?.items) ? warehousesRes.items : []);
        setInventory(Array.isArray(inventoryRes?.items) ? inventoryRes.items : []);
      } catch (error) {
        console.error('Failed to load resource dashboard:', error);
      } finally {
        setLoading(false);
      }
    }

    setLoading(true);
    loadData();
  }, [refreshKey]);

  const stats = useMemo(() => {
    const lowStock = inventory.filter(item => item.isLowStock).length;
    const totalUnits = inventory.reduce((sum, item) => sum + (item.quantityAvailable || 0), 0);

    return {
      warehousesCount: warehouses.length,
      inventoryCount: inventory.length,
      lowStock,
      totalUnits,
    };
  }, [inventory, warehouses]);

  const navigateTo = (tab: string) => {
    if (onNavigate) onNavigate(tab);
  };

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
        <p style={{ fontWeight: 600 }}>Loading Resource Operations Center...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem', color: '#0f172a' }}>
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '18px',
        padding: '2rem',
        color: '#fff',
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.75rem' }}>📦</span>
            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>Resource & Logistics Command</h1>
          </div>
          <p style={{ margin: 0, color: '#cbd5e1', maxWidth: '700px' }}>
            Real-time visibility across warehouses, stock levels, and logistics readiness for emergency response operations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap' }}>
          <button onClick={() => navigateTo('warehouses')} style={{ padding: '0.75rem 1rem', borderRadius: '10px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
            🏬 Manage Warehouses
          </button>
          <button onClick={() => navigateTo('inventory')} style={{ padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
            📊 Manage Inventory
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Warehouses', value: stats.warehousesCount, icon: '🏬', tint: '#dbeafe' },
          { label: 'Inventory Items', value: stats.inventoryCount, icon: '📦', tint: '#dcfce7' },
          { label: 'Low Stock', value: stats.lowStock, icon: '⚠️', tint: '#fef3c7' },
          { label: 'Total Units', value: stats.totalUnits, icon: '📈', tint: '#ede9fe' },
        ].map((card) => (
          <div key={card.label} style={{ background: '#fff', borderRadius: '14px', boxShadow: '0 8px 20px rgba(15,23,42,0.06)', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ background: card.tint, width: '42px', height: '42px', borderRadius: '10px', display: 'grid', placeItems: 'center', fontSize: '1.2rem' }}>{card.icon}</div>
              <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 700 }}>{card.label}</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.04em' }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.25rem' }}>
        <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 8px 20px rgba(15,23,42,0.06)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Warehouses</h3>
            <button onClick={() => navigateTo('warehouses')} style={{ border: 'none', background: 'transparent', color: '#2563eb', fontWeight: 700, cursor: 'pointer' }}>View all →</button>
          </div>

          {warehouses.length === 0 ? (
            <div style={{ color: '#64748b', padding: '1rem 0' }}>No warehouses found.</div>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {warehouses.slice(0, 5).map((warehouse) => (
                <div key={warehouse.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.9rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{warehouse.name}</div>
                    <div style={{ color: '#64748b', fontSize: '0.82rem' }}>{warehouse.district}</div>
                  </div>
                  <div style={{ textAlign: 'right', color: '#475569', fontSize: '0.8rem' }}>
                    <div>{warehouse.inventoryItemCount ?? 0} items</div>
                    <div>{warehouse.vehicleCount ?? 0} vehicles</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 8px 20px rgba(15,23,42,0.06)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Low Stock Watchlist</h3>
            <button onClick={() => navigateTo('inventory')} style={{ border: 'none', background: 'transparent', color: '#2563eb', fontWeight: 700, cursor: 'pointer' }}>Open →</button>
          </div>

          {inventory.filter(item => item.isLowStock).length === 0 ? (
            <div style={{ color: '#64748b', padding: '1rem 0' }}>No critical low-stock items.</div>
          ) : (
            <div style={{ display: 'grid', gap: '0.7rem' }}>
              {inventory.filter(item => item.isLowStock).slice(0, 5).map((item) => (
                <div key={item.id} style={{ background: '#fff8e7', border: '1px solid #f7d77a', borderRadius: '12px', padding: '0.8rem 1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.6rem' }}>
                    <strong>{item.itemName}</strong>
                    <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.2rem 0.5rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700 }}>Low stock</span>
                  </div>
                  <div style={{ color: '#475569', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    {item.warehouseName} • {getItemTypeLabel(item.itemType)} • {item.quantityAvailable} {item.unit}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
