import React, { useEffect, useState } from 'react';
import { resourceApi } from '../api/resourceApi';
import type { DispatchItem, InventoryItem, ResourceSummary, Warehouse } from '../types/resourceTypes';

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  Active: { color: '#6ee7b7', bg: 'rgba(16,185,129,0.12)' },
  Low: { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  Critical: { color: '#fca5a5', bg: 'rgba(239,68,68,0.12)' },
  InTransit: { color: '#60a5fa', bg: 'rgba(59,130,246,0.12)' },
  Scheduled: { color: '#c084fc', bg: 'rgba(168,85,247,0.12)' },
  Delivered: { color: '#6ee7b7', bg: 'rgba(16,185,129,0.12)' },
};

export const ResourceDashboardPage: React.FC = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [dispatches, setDispatches] = useState<DispatchItem[]>([]);
  const [summary, setSummary] = useState<ResourceSummary | null>(null);

  useEffect(() => {
    const load = async () => {
      const [warehouseData, inventoryData, dispatchData, summaryData] = await Promise.all([
        resourceApi.getWarehouses(),
        resourceApi.getInventory(),
        resourceApi.getDispatches(),
        resourceApi.getSummary(),
      ]);

      setWarehouses(warehouseData);
      setInventory(inventoryData);
      setDispatches(dispatchData);
      setSummary(summaryData);
    };

    void load();
  }, []);

  const totalStock = warehouses.reduce((sum, item) => sum + item.availableStock, 0);
  const lowStockItems = inventory.filter((item) => item.quantity <= item.reorderLevel).length;

  return (
    <div style={{ minHeight: '100vh', color: '#e2e8f0' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#f8fafc' }}>📦 Resource Logistics Dashboard</h2>
        <p style={{ margin: '0.35rem 0 0', color: '#94a3b8' }}>Operational overview for warehouses, stock, and dispatches.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <SummaryCard title="Warehouses" value={summary?.warehouseCount ?? warehouses.length} accent="#60a5fa" />
        <SummaryCard title="Inventory" value={summary?.totalInventory ?? totalStock} accent="#34d399" />
        <SummaryCard title="Critical Items" value={summary?.criticalItems ?? lowStockItems} accent="#fbbf24" />
        <SummaryCard title="Active Dispatches" value={summary?.activeDispatches ?? dispatches.filter(d => d.status !== 'Delivered').length} accent="#c084fc" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1.5rem' }}>
        <div style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(148,163,184,0.15)', borderRadius: 12, padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc' }}>Warehouse Capacity</h3>
            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Live stock overview</span>
          </div>

          {warehouses.map((warehouse) => {
            const percent = Math.min((warehouse.availableStock / warehouse.capacity) * 100, 100);
            const statusStyle = STATUS_COLORS[warehouse.status] ?? STATUS_COLORS.Active;

            return (
              <div key={warehouse.id} style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <div>
                    <div style={{ color: '#f8fafc', fontWeight: 600 }}>{warehouse.name}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.72rem' }}>{warehouse.district}</div>
                  </div>
                  <span style={{ color: statusStyle.color, background: statusStyle.bg, borderRadius: 999, padding: '4px 8px', fontSize: '0.7rem', fontWeight: 600 }}>
                    {warehouse.status}
                  </span>
                </div>

                <div style={{ height: 10, borderRadius: 999, background: 'rgba(148,163,184,0.12)', overflow: 'hidden' }}>
                  <div style={{ width: `${percent}%`, height: '100%', background: warehouse.status === 'Critical' ? '#f87171' : warehouse.status === 'Low' ? '#fbbf24' : '#34d399', borderRadius: 999 }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', color: '#94a3b8', fontSize: '0.72rem' }}>
                  <span>{warehouse.availableStock} / {warehouse.capacity} units</span>
                  <span>{Math.round(percent)}%</span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(148,163,184,0.15)', borderRadius: 12, padding: '1rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', color: '#f8fafc' }}>Current Dispatches</h3>

          {dispatches.map((dispatch) => {
            const statusStyle = STATUS_COLORS[dispatch.status] ?? STATUS_COLORS.Scheduled;

            return (
              <div key={dispatch.id} style={{ padding: '0.8rem 0.6rem', borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                  <span style={{ fontWeight: 600, color: '#f8fafc' }}>{dispatch.destination}</span>
                  <span style={{ color: statusStyle.color, background: statusStyle.bg, borderRadius: 999, padding: '4px 8px', fontSize: '0.7rem' }}>{dispatch.status}</span>
                </div>
                <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{dispatch.vehicleCount} vehicles • ETA {new Date(dispatch.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

type SummaryCardProps = {
  title: string;
  value: number;
  accent: string;
};

function SummaryCard({ title, value, accent }: SummaryCardProps) {
  return (
    <div style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(148,163,184,0.15)', borderRadius: 12, padding: '1rem' }}>
      <div style={{ color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.5rem' }}>
        <span style={{ fontSize: '2rem', fontWeight: 700, color: '#f8fafc' }}>{value}</span>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: accent, display: 'inline-block' }} />
      </div>
    </div>
  );
}
