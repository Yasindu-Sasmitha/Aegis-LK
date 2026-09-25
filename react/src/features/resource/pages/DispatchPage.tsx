import React, { useEffect, useState } from 'react';
import { resourceApi, type DispatchPlanResult } from '../api/resourceApi';
import type { DispatchItem } from '../types/resourceTypes';

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  Scheduled: { color: '#c084fc', bg: 'rgba(168,85,247,0.12)' },
  InTransit: { color: '#60a5fa', bg: 'rgba(59,130,246,0.12)' },
  Delivered: { color: '#6ee7b7', bg: 'rgba(16,185,129,0.12)' },
};

const DEFAULT_LOCATION = { lat: 6.927079, lng: 79.861244 };

export const DispatchPage: React.FC = () => {
  const [dispatches, setDispatches] = useState<DispatchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [district, setDistrict] = useState('Colombo');
  const [teamsRequired, setTeamsRequired] = useState(3);
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [planResult, setPlanResult] = useState<DispatchPlanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await resourceApi.getDispatches();
      setDispatches(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleGeneratePlan = async () => {
    setPlanLoading(true);
    setError(null);

    try {
      const result = await resourceApi.generateDispatchPlan({
        missionId: `mission-${Date.now()}`,
        teamsRequired,
        district,
        location,
      });
      setPlanResult(result);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate dispatch plan.');
    } finally {
      setPlanLoading(false);
    }
  };

  const updateStatus = async (id: string, status: DispatchItem['status']) => {
    await resourceApi.updateDispatchStatus(id, status);
    await load();
  };

  return (
    <div style={{ color: '#e2e8f0' }}>
      <h2 style={{ margin: '0 0 1rem', color: '#f8fafc' }}>🚚 Dispatch Tracking & AI Planning</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem', background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(148,163,184,0.15)', borderRadius: 12, padding: '1rem' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', color: '#cbd5e1', fontSize: '0.82rem' }}>
          District
          <input
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            style={{ background: '#0f172a', color: '#f8fafc', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, padding: '0.55rem 0.7rem' }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', color: '#cbd5e1', fontSize: '0.82rem' }}>
          Teams required
          <input
            type="number"
            min={1}
            value={teamsRequired}
            onChange={(e) => setTeamsRequired(Math.max(1, Number(e.target.value) || 1))}
            style={{ background: '#0f172a', color: '#f8fafc', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, padding: '0.55rem 0.7rem' }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', color: '#cbd5e1', fontSize: '0.82rem' }}>
          Latitude
          <input
            type="number"
            step="0.000001"
            value={location.lat}
            onChange={(e) => setLocation((prev) => ({ ...prev, lat: Number(e.target.value) }))}
            style={{ background: '#0f172a', color: '#f8fafc', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, padding: '0.55rem 0.7rem' }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', color: '#cbd5e1', fontSize: '0.82rem' }}>
          Longitude
          <input
            type="number"
            step="0.000001"
            value={location.lng}
            onChange={(e) => setLocation((prev) => ({ ...prev, lng: Number(e.target.value) }))}
            style={{ background: '#0f172a', color: '#f8fafc', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, padding: '0.55rem 0.7rem' }}
          />
        </label>

        <div style={{ display: 'flex', alignItems: 'end' }}>
          <button
            onClick={() => void handleGeneratePlan()}
            disabled={planLoading}
            style={{ width: '100%', background: '#10b981', color: '#062b1d', border: 'none', borderRadius: 10, padding: '0.7rem 1rem', fontWeight: 700, cursor: planLoading ? 'wait' : 'pointer' }}
          >
            {planLoading ? 'Generating…' : 'Generate AI Dispatch Plan'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: '1rem', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', borderRadius: 10, padding: '0.75rem 1rem' }}>
          {error}
        </div>
      )}

      {planResult?.dispatchPlan && (
        <div style={{ marginBottom: '1.5rem', background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(148,163,184,0.15)', borderRadius: 12, padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, color: '#f8fafc' }}>🤖 AI Recommendation</h3>
            <span style={{ color: '#6ee7b7', background: 'rgba(16,185,129,0.12)', borderRadius: 999, padding: '4px 8px', fontSize: '0.72rem', fontWeight: 600 }}>
              {planResult.resourceRequestStatus}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem', color: '#cbd5e1', fontSize: '0.82rem' }}>
            <div><strong style={{ color: '#f8fafc' }}>Warehouse:</strong> {planResult.dispatchPlan.warehouseName}</div>
            <div><strong style={{ color: '#f8fafc' }}>District:</strong> {planResult.dispatchPlan.district}</div>
            <div><strong style={{ color: '#f8fafc' }}>Vehicles:</strong> {planResult.dispatchPlan.vehicleCount}</div>
            <div><strong style={{ color: '#f8fafc' }}>ETA:</strong> {planResult.estimatedArrival} min</div>
          </div>

          <div style={{ marginTop: '0.75rem', color: '#cbd5e1' }}>
            <strong style={{ color: '#f8fafc' }}>Route Summary:</strong> {planResult.dispatchPlan.routeSummary}
          </div>

          <div style={{ marginTop: '0.75rem' }}>
            <strong style={{ color: '#f8fafc' }}>Items:</strong>
            <ul style={{ margin: '0.4rem 0 0 1.2rem', color: '#cbd5e1', padding: 0 }}>
              {planResult.dispatchPlan.items.map((item) => (
                <li key={`${item.itemName}-${item.quantity}`}>{item.itemName}: {item.quantity}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(148,163,184,0.15)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'rgba(30,41,59,0.8)' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.85rem 1rem', color: '#cbd5e1' }}>Destination</th>
              <th style={{ textAlign: 'left', padding: '0.85rem 1rem', color: '#cbd5e1' }}>Request</th>
              <th style={{ textAlign: 'left', padding: '0.85rem 1rem', color: '#cbd5e1' }}>Vehicles</th>
              <th style={{ textAlign: 'left', padding: '0.85rem 1rem', color: '#cbd5e1' }}>ETA</th>
              <th style={{ textAlign: 'left', padding: '0.85rem 1rem', color: '#cbd5e1' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '0.85rem 1rem', color: '#cbd5e1' }}>Action</th>
            </tr>
          </thead>

          <tbody>
            {dispatches.map((dispatch) => {
              const style = STATUS_COLORS[dispatch.status] ?? STATUS_COLORS.Scheduled;

              return (
                <tr key={dispatch.id} style={{ borderTop: '1px solid rgba(148,163,184,0.12)' }}>
                  <td style={{ padding: '0.85rem 1rem', color: '#f8fafc' }}>{dispatch.destination}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1' }}>{dispatch.requestId}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1' }}>{dispatch.vehicleCount}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1' }}>{new Date(dispatch.eta).toLocaleString()}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ padding: '4px 8px', borderRadius: 999, fontSize: '0.7rem', background: style.bg, color: style.color, fontWeight: 600 }}>
                      {dispatch.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <select
                      value={dispatch.status}
                      onChange={(e) => void updateStatus(dispatch.id, e.target.value as DispatchItem['status'])}
                      style={{ background: '#0f172a', color: '#f8fafc', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, padding: '0.4rem 0.6rem' }}
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="InTransit">In Transit</option>
                      <option value="Delivered">Delivered</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {loading && <div style={{ padding: '1rem', color: '#94a3b8' }}>Loading dispatches…</div>}
      </div>
    </div>
  );
};
