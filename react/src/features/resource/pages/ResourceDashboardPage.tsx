import React, { useEffect, useMemo, useState } from 'react';
import { fetchDispatchPlans, fetchInventoryItems, fetchWarehouses } from '../api/resourceApi';
import type { DispatchPlan, InventoryItem, Warehouse } from '../types/resourceTypes';
import { getItemTypeLabel } from '../types/resourceTypes';

const INVENTORY_STATUS_STORAGE_KEY = 'aegis-inventory-status-map';

const readStoredStatusMap = (): Record<string, 'healthy' | 'low-stock' | 'critical' | 'out-of-stock'> => {
  try {
    const raw = localStorage.getItem(INVENTORY_STATUS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

interface Props {
  onNavigate?: (tab: string) => void;
  refreshKey?: number;
}

export const ResourceDashboardPage: React.FC<Props> = ({ onNavigate, refreshKey = 0 }) => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [approvedPlans, setApprovedPlans] = useState<DispatchPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [warehousesRes, inventoryRes, dispatchRes] = await Promise.all([
          fetchWarehouses({ page: 1, pageSize: 100 }),
          fetchInventoryItems({ page: 1, pageSize: 100 }),
          fetchDispatchPlans(),
        ]);

        setWarehouses(Array.isArray(warehousesRes?.items) ? warehousesRes.items : []);
        setInventory(Array.isArray(inventoryRes?.items) ? inventoryRes.items : []);
        setApprovedPlans((Array.isArray(dispatchRes) ? dispatchRes : []).filter((plan) => plan.approvalStatus === 'Approved'));
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
    const statusMap = readStoredStatusMap();
    const lowStock = inventory.filter((item) => {
      const override = statusMap[item.id];
      if (override === 'healthy') return false;
      if (override === 'out-of-stock' || override === 'low-stock' || override === 'critical') return true;
      return item.isLowStock;
    }).length;
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
            <span style={{ fontSize: '2.15rem', lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>📦</span>
            <h1 style={{ margin: 0, fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.1 }}>Resource & Logistics Command</h1>
          </div>
          <p style={{ margin: 0, color: '#cbd5e1', maxWidth: '720px', fontSize: '1.02rem', lineHeight: 1.6, fontWeight: 500 }}>
            Real-time visibility across warehouses, stock levels, and logistics readiness for emergency response operations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap' }}>
          <button onClick={() => navigateTo('warehouses')} style={{ padding: '0.8rem 1.1rem', borderRadius: '10px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '0.96rem' }}>
            🏬 Manage Warehouses
          </button>
          <button onClick={() => navigateTo('inventory')} style={{ padding: '0.8rem 1.1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '0.96rem' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
              <div style={{ background: card.tint, width: '48px', height: '48px', borderRadius: '12px', display: 'grid', placeItems: 'center', fontSize: '1.5rem' }}>{card.icon}</div>
              <span style={{ color: '#64748b', fontSize: '0.86rem', fontWeight: 700 }}>{card.label}</span>
            </div>
            <div style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1.1 }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.25rem' }}>
        <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 8px 20px rgba(15,23,42,0.06)', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Warehouses</h3>
            <button onClick={() => navigateTo('warehouses')} style={{ border: 'none', background: 'transparent', color: '#2563eb', fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem' }}>View all →</button>
          </div>

          {warehouses.length === 0 ? (
            <div style={{ color: '#64748b', padding: '1rem 0' }}>No warehouses found.</div>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {warehouses.slice(0, 5).map((warehouse) => (
                <div key={warehouse.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.9rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{warehouse.name}</div>
                    <div style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: 500 }}>{warehouse.district}</div>
                  </div>
                  <div style={{ textAlign: 'right', color: '#475569', fontSize: '0.82rem', fontWeight: 600 }}>
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
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Low Stock Watchlist</h3>
            <button onClick={() => navigateTo('inventory')} style={{ border: 'none', background: 'transparent', color: '#2563eb', fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem' }}>Open →</button>
          </div>

          {(() => {
            const statusMap = readStoredStatusMap();
            const lowStockItems = inventory.filter((item) => {
              const override = statusMap[item.id];
              if (override === 'healthy') return false;
              if (override === 'out-of-stock' || override === 'low-stock' || override === 'critical') return true;
              return item.isLowStock;
            });

            return lowStockItems.length === 0 ? (
              <div style={{ color: '#64748b', padding: '1rem 0' }}>No critical low-stock items.</div>
            ) : (
              <div style={{ display: 'grid', gap: '0.7rem' }}>
                {lowStockItems.slice(0, 5).map((item) => (
                  <div key={item.id} style={{ background: '#fff8e7', border: '1px solid #f7d77a', borderRadius: '12px', padding: '0.8rem 1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.6rem' }}>
                      <strong style={{ fontSize: '1rem', fontWeight: 800 }}>{item.itemName}</strong>
                      <span style={{ background: '#fef3c7', color: '#92400e', padding: '0.2rem 0.5rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 800 }}>Low stock</span>
                    </div>
                    <div style={{ color: '#475569', fontSize: '0.82rem', marginTop: '0.25rem', fontWeight: 500 }}>
                      {item.warehouseName} • {getItemTypeLabel(item.itemType)} • {item.quantityAvailable} {item.unit}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      <div style={{ marginTop: '2rem', background: '#fff', borderRadius: '16px', boxShadow: '0 8px 20px rgba(15,23,42,0.06)', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Approved Dispatch Plans</h3>
          <span style={{ color: '#64748b', fontSize: '0.82rem', fontWeight: 700 }}>{approvedPlans.length} plan(s)</span>
        </div>

        {approvedPlans.length === 0 ? (
          <div style={{ color: '#64748b', padding: '0.5rem 0 0' }}>No approved dispatch plans yet.</div>
        ) : (
          <div style={{ display: 'grid', gap: '0.8rem' }}>
            {approvedPlans.map((plan) => (
              <div key={plan.id} style={{ border: '1px solid #d1fae5', background: '#f0fdf4', borderRadius: '12px', padding: '0.9rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <strong>{plan.missionId}</strong>
                  <span style={{ background: '#dcfce7', color: '#166534', padding: '0.25rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700 }}>Approved</span>
                </div>
                <div style={{ color: '#475569', fontSize: '0.82rem', lineHeight: 1.7 }}>
                  <div><strong>District:</strong> {plan.district}</div>
                  <div><strong>Warehouse:</strong> {plan.warehouseName}</div>
                  <div><strong>Teams:</strong> {plan.teamsRequired}</div>
                  <div><strong>ETA:</strong> {plan.estimatedArrivalMinutes} min</div>
                </div>
                <div style={{ marginTop: '0.7rem', display: 'grid', gap: '0.2rem' }}>
                  {plan.items.map((item) => (
                    <div key={`${plan.id}-${item.itemName}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#0f172a' }}>
                      <span>{item.itemName}</span>
                      <strong>{item.quantity}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
