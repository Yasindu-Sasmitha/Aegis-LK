import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

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
  const [allPlans, setAllPlans] = useState<DispatchPlan[]>([]);
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

        const plans = Array.isArray(dispatchRes) ? dispatchRes : [];
        setAllPlans(plans);
        setApprovedPlans(plans.filter((plan) => plan.approvalStatus === 'Approved'));
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

  const stockByDistrict = useMemo(() => {
    const byDistrict: Record<string, number> = {};
    inventory.forEach((item) => {
      const warehouse = warehouses.find((w) => w.id === item.warehouseId);
      if (!warehouse) return;
      byDistrict[warehouse.district] =
        (byDistrict[warehouse.district] ?? 0) + (item.quantityAvailable || 0);
    });
    return Object.entries(byDistrict)
      .map(([district, totalUnits]) => ({ district, totalUnits }))
      .sort((a, b) => b.totalUnits - a.totalUnits)
      .slice(0, 10);
  }, [inventory, warehouses]);

  const dispatchStatusData = useMemo(() => {
    const counts = { PendingApproval: 0, Approved: 0, Rejected: 0 };
    allPlans.forEach((p) => {
      if (p.approvalStatus in counts) {
        counts[p.approvalStatus as keyof typeof counts] += 1;
      }
    });
    const total = allPlans.length;
    return {
      total,
      slices: [
        { name: 'Pending', value: counts.PendingApproval, color: '#f59e0b' },
        { name: 'Approved', value: counts.Approved, color: '#10b981' },
        { name: 'Rejected', value: counts.Rejected, color: '#ef4444' },
      ].filter((d) => d.value > 0),
    };
  }, [allPlans]);

  // Helper: aggregate stock per warehouse for the Warehouses cards
  const stockByWarehouse = useMemo(() => {
    const map: Record<string, number> = {};
    inventory.forEach((item) => {
      map[item.warehouseId] = (map[item.warehouseId] ?? 0) + (item.quantityAvailable || 0);
    });
    return map;
  }, [inventory]);

  const lowStockItems = useMemo(() => {
    const statusMap = readStoredStatusMap();
    return inventory.filter((item) => {
      const override = statusMap[item.id];
      if (override === 'healthy') return false;
      if (override === 'out-of-stock' || override === 'low-stock' || override === 'critical') return true;
      return item.isLowStock;
    });
  }, [inventory]);

  const navigateTo = (tab: string) => {
    if (onNavigate) onNavigate(tab);
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: '1.6rem', marginBottom: '0.35rem' }}>⏳</div>
        <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>Loading Resource Operations Center...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.25rem 1.5rem', color: '#0f172a' }}>
      {/* ─── Compact Hero ─────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '14px',
        padding: '1.1rem 1.4rem',
        color: '#fff',
        marginBottom: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.9rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>📦</span>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
              Resource &amp; Logistics Command
            </h1>
          </div>
          <p style={{ margin: 0, color: '#cbd5e1', maxWidth: '700px', fontSize: '0.86rem', lineHeight: 1.5 }}>
            Real-time visibility across warehouses, stock levels, and logistics readiness.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigateTo('warehouses')}
            style={{ padding: '0.5rem 0.85rem', borderRadius: '8px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}
          >
            🏬 Manage Warehouses
          </button>
          <button
            onClick={() => navigateTo('inventory')}
            style={{ padding: '0.5rem 0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}
          >
            📊 Manage Inventory
          </button>
        </div>
      </div>

      {/* ─── KPI Cards ────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: '0.6rem',
        marginBottom: '1rem',
      }}>
        {[
          { label: 'Warehouses', value: stats.warehousesCount, icon: '🏬', tint: '#dbeafe', accent: '#0284c7' },
          { label: 'Inventory Items', value: stats.inventoryCount, icon: '📦', tint: '#dcfce7', accent: '#16a34a' },
          { label: 'Low Stock', value: stats.lowStock, icon: '⚠️', tint: '#fef3c7', accent: '#d97706' },
          { label: 'Total Units', value: stats.totalUnits, icon: '📈', tint: '#ede9fe', accent: '#7c3aed' },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              background: '#fff',
              borderRadius: '10px',
              boxShadow: '0 2px 8px rgba(15,23,42,0.05)',
              padding: '0.6rem 0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              borderLeft: `3px solid ${card.accent}`,
            }}
          >
            <div style={{ background: card.tint, width: '32px', height: '32px', borderRadius: '8px', display: 'grid', placeItems: 'center', fontSize: '0.95rem', flexShrink: 0 }}>
              {card.icon}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ color: '#64748b', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', marginBottom: '0.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {card.label}
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, color: '#0f172a' }}>
                {card.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Charts Row ───────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(15,23,42,0.05)', padding: '0.9rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>Stock Levels by District (Top 10)</h3>
            <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 600 }}>Total units</span>
          </div>
          {stockByDistrict.length === 0 ? (
            <div style={{ color: '#64748b', padding: '1rem 0', textAlign: 'center', fontSize: '0.85rem' }}>No inventory data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stockByDistrict} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="district" fontSize={10} angle={-25} textAnchor="end" height={55} interval={0} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Bar dataKey="totalUnits" fill="#0284c7" name="Total Units" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 8px rgba(15,23,42,0.05)', padding: '0.9rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>Dispatch Status</h3>
            <span style={{ color: '#64748b', fontSize: '0.7rem', fontWeight: 600 }}>{dispatchStatusData.total} total</span>
          </div>
          {dispatchStatusData.total === 0 ? (
            <div style={{ color: '#64748b', padding: '1rem 0', textAlign: 'center', fontSize: '0.85rem' }}>No dispatch plans yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={dispatchStatusData.slices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {dispatchStatusData.slices.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ADVANCED WAREHOUSES + LOW STOCK ROW                                */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>

        {/* ─── Warehouses — Advanced Cards ───────────────────────────────── */}
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(15,23,42,0.05)',
          padding: '1rem',
          borderTop: '3px solid #0284c7',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                display: 'grid',
                placeItems: 'center',
                fontSize: '0.85rem',
                color: '#fff',
                boxShadow: '0 2px 6px rgba(2,132,199,0.3)',
              }}>
                🏬
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Warehouses</h3>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                  {warehouses.length} total · {stats.totalUnits.toLocaleString()} units
                </div>
              </div>
            </div>
            <button
              onClick={() => navigateTo('warehouses')}
              style={{
                border: '1px solid #0284c7',
                background: '#f0f9ff',
                color: '#0284c7',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.72rem',
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
              }}
            >
              View all →
            </button>
          </div>

          {warehouses.length === 0 ? (
            <div style={{ color: '#64748b', padding: '0.5rem 0', fontSize: '0.85rem' }}>No warehouses found.</div>
          ) : (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {warehouses.slice(0, 5).map((warehouse, idx) => {
                const totalStock = stockByWarehouse[warehouse.id] ?? 0;
                const itemCount = warehouse.inventoryItemCount ?? 0;
                const vehicleCount = warehouse.vehicleCount ?? 0;
                const healthColor = totalStock > 500 ? '#10b981' : totalStock > 100 ? '#f59e0b' : '#ef4444';
                const healthLabel = totalStock > 500 ? 'Healthy' : totalStock > 100 ? 'Moderate' : 'Low';

                return (
                  <div
                    key={warehouse.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '0.6rem 0.75rem',
                      background: 'linear-gradient(90deg, #f8fafc 0%, #ffffff 100%)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.75rem',
                      position: 'relative',
                      transition: 'all 0.15s ease',
                      borderLeft: `3px solid ${healthColor}`,
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
                        <span style={{
                          background: '#e0f2fe',
                          color: '#0284c7',
                          fontSize: '0.6rem',
                          fontWeight: 800,
                          padding: '0.1rem 0.35rem',
                          borderRadius: '4px',
                          letterSpacing: '0.03em',
                        }}>
                          #{idx + 1}
                        </span>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#0f172a' }}>
                          {warehouse.name}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', color: '#64748b', fontSize: '0.7rem', fontWeight: 500 }}>
                        <span>📍 {warehouse.district}</span>
                        <span>·</span>
                        <span>📦 {itemCount}</span>
                        <span>·</span>
                        <span>🚚 {vehicleCount}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.15rem', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                        {totalStock.toLocaleString()}
                      </div>
                      <div style={{
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        color: healthColor,
                        background: `${healthColor}18`,
                        padding: '0.05rem 0.35rem',
                        borderRadius: '4px',
                        letterSpacing: '0.03em',
                        textTransform: 'uppercase',
                      }}>
                        {healthLabel}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── Low Stock Watchlist — Advanced Cards ─────────────────────── */}
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(15,23,42,0.05)',
          padding: '1rem',
          borderTop: '3px solid #d97706',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                background: 'linear-gradient(135deg, #d97706, #ef4444)',
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                display: 'grid',
                placeItems: 'center',
                fontSize: '0.85rem',
                color: '#fff',
                boxShadow: '0 2px 6px rgba(217,119,6,0.3)',
              }}>
                ⚠️
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Low Stock Watchlist</h3>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                  {lowStockItems.length} item{lowStockItems.length === 1 ? '' : 's'} need attention
                </div>
              </div>
            </div>
            <button
              onClick={() => navigateTo('inventory')}
              style={{
                border: '1px solid #d97706',
                background: '#fffbeb',
                color: '#d97706',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.72rem',
                padding: '0.35rem 0.65rem',
                borderRadius: '6px',
              }}
            >
              Open →
            </button>
          </div>

          {lowStockItems.length === 0 ? (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #86efac',
              borderRadius: '10px',
              padding: '1rem',
              textAlign: 'center',
              color: '#166534',
              fontSize: '0.82rem',
              fontWeight: 600,
            }}>
              ✅ All warehouses operating within safe stock levels.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {lowStockItems.slice(0, 5).map((item) => {
                const threshold = item.reorderThreshold ?? 100;
                const pct = Math.min(100, Math.round((item.quantityAvailable / threshold) * 100));
                const isCritical = pct < 30;

                return (
                  <div
                    key={item.id}
                    style={{
                      border: isCritical ? '1px solid #fecaca' : '1px solid #fde68a',
                      borderRadius: '10px',
                      padding: '0.6rem 0.75rem',
                      background: isCritical
                        ? 'linear-gradient(90deg, #fef2f2 0%, #ffffff 100%)'
                        : 'linear-gradient(90deg, #fffbeb 0%, #ffffff 100%)',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#0f172a', marginBottom: '0.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.itemName}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.68rem', fontWeight: 500 }}>
                          📍 {item.warehouseName} · {getItemTypeLabel(item.itemType)}
                        </div>
                      </div>
                      <span style={{
                        background: isCritical ? '#fee2e2' : '#fef3c7',
                        color: isCritical ? '#991b1b' : '#92400e',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        letterSpacing: '0.03em',
                        textTransform: 'uppercase',
                        flexShrink: 0,
                      }}>
                        {isCritical ? 'Critical' : 'Low'}
                      </span>
                    </div>

                    {/* Stock level progress bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ flex: 1, height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: isCritical
                            ? 'linear-gradient(90deg, #dc2626, #ef4444)'
                            : 'linear-gradient(90deg, #d97706, #f59e0b)',
                          borderRadius: '3px',
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        color: isCritical ? '#991b1b' : '#92400e',
                        flexShrink: 0,
                        minWidth: '60px',
                        textAlign: 'right',
                      }}>
                        {item.quantityAvailable} / {threshold}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Approved Dispatch Plans ──────────────────────────────────────── */}
      <div style={{
        marginTop: '0.75rem',
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(15,23,42,0.05)',
        padding: '1rem',
        borderTop: '3px solid #10b981',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              display: 'grid',
              placeItems: 'center',
              fontSize: '0.85rem',
              color: '#fff',
              boxShadow: '0 2px 6px rgba(16,185,129,0.3)',
            }}>
              ✓
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>Approved Dispatch Plans</h3>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                {approvedPlans.length} plan{approvedPlans.length === 1 ? '' : 's'} ready for execution
              </div>
            </div>
          </div>
        </div>

        {approvedPlans.length === 0 ? (
          <div style={{ color: '#64748b', padding: '0.5rem 0', fontSize: '0.85rem' }}>No approved dispatch plans yet.</div>
        ) : (
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {approvedPlans.map((plan) => (
              <div
                key={plan.id}
                style={{
                  border: '1px solid #d1fae5',
                  background: 'linear-gradient(90deg, #f0fdf4 0%, #ffffff 100%)',
                  borderRadius: '10px',
                  padding: '0.65rem 0.8rem',
                  borderLeft: '3px solid #10b981',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <strong style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#0f172a' }}>
                    {plan.missionId.substring(0, 12)}…
                  </strong>
                  <span style={{
                    background: '#dcfce7',
                    color: '#166534',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                  }}>
                    ✓ Approved
                  </span>
                </div>
                <div style={{ color: '#475569', fontSize: '0.72rem', lineHeight: 1.55 }}>
                  <span><strong>District:</strong> {plan.district}</span> ·
                  <span> <strong>Warehouse:</strong> {plan.warehouseName}</span> ·
                  <span> <strong>Teams:</strong> {plan.teamsRequired}</span> ·
                  <span> <strong>ETA:</strong> {plan.estimatedArrivalMinutes} min</span>
                </div>
                <div style={{ marginTop: '0.4rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {plan.items.map((item) => (
                    <span
                      key={`${plan.id}-${item.itemName}`}
                      style={{
                        background: '#dcfce7',
                        color: '#166534',
                        padding: '0.1rem 0.5rem',
                        borderRadius: '999px',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                      }}
                    >
                      {item.itemName}: {item.quantity}
                    </span>
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