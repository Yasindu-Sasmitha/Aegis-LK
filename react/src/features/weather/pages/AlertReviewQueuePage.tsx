import React, { useEffect, useState, useCallback } from 'react';
import type { WeatherAlert, District } from '../types/weatherTypes';
import { fetchAlerts, reviewAlert, fetchDistricts } from '../api/weatherApi';

const HAZARD_COLOR: Record<string, string> = {
  Flood: '#3b82f6',
  Landslide: '#f59e0b',
  StrongWind: '#a78bfa',
  'Strong Wind': '#a78bfa',
};
const HAZARD_ICON: Record<string, string> = {
  Flood: '🌊',
  Landslide: '⛰️',
  StrongWind: '💨',
  'Strong Wind': '💨',
};

export const AlertReviewQueuePage: React.FC = () => {
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [total, setTotal] = useState(0);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState('PendingReview');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterHazard, setFilterHazard] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAlerts({
        status: filterStatus || undefined,
        districtId: filterDistrict || undefined,
        hazardType: filterHazard || undefined,
        page,
        pageSize,
      });
      setAlerts(data.items);
      setTotal(data.total);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterDistrict, filterHazard, page, pageSize]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetchDistricts().then(setDistricts); }, []);

  const handleReview = async (id: string, decision: 'Approved' | 'Rejected') => {
    setActionLoading(id + decision);
    try {
      await reviewAlert(id, decision);
      showToast(`Alert ${decision === 'Approved' ? 'approved and published' : 'rejected'} successfully.`, true);
      load();
    } catch (e: any) {
      showToast(e.message, false);
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div style={{ padding: '1.5rem 2rem' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 24, zIndex: 1000,
          padding: '0.75rem 1.25rem', borderRadius: 10,
          background: toast.ok ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${toast.ok ? '#10b981' : '#ef4444'}`,
          color: toast.ok ? '#6ee7b7' : '#fca5a5', fontSize: '0.875rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
        }}>
          {toast.ok ? '✅' : '⚠️'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0, color: '#f1f5f9', fontSize: '1.4rem', fontWeight: 700 }}>
          🔔 Alert Review Queue
        </h2>
        <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
          Approve or reject alerts flagged by the AI agent for human review
        </p>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem',
        background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '0.75rem 1rem',
        border: '1px solid rgba(255,255,255,0.06)'
      }}>
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          style={{ padding: '0.4rem 0.75rem', borderRadius: 6, background: '#1e293b', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.82rem' }}
        >
          <option value="">All Statuses</option>
          <option value="PendingReview">Pending Review</option>
          <option value="Published">Published</option>
          <option value="Rejected">Rejected</option>
        </select>

        <select
          value={filterDistrict}
          onChange={e => { setFilterDistrict(e.target.value); setPage(1); }}
          style={{ padding: '0.4rem 0.75rem', borderRadius: 6, background: '#1e293b', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.82rem' }}
        >
          <option value="">All Districts</option>
          {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <select
          value={filterHazard}
          onChange={e => { setFilterHazard(e.target.value); setPage(1); }}
          style={{ padding: '0.4rem 0.75rem', borderRadius: 6, background: '#1e293b', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.82rem' }}
        >
          <option value="">All Hazard Types</option>
          <option value="Flood">🌊 Flood</option>
          <option value="Landslide">⛰️ Landslide</option>
          <option value="StrongWind">💨 Strong Wind</option>
        </select>

        <button onClick={() => load()} style={{ padding: '0.4rem 0.75rem', borderRadius: 6, background: 'rgba(37,99,235,0.2)', color: '#93c5fd', border: '1px solid rgba(37,99,235,0.3)', cursor: 'pointer', fontSize: '0.82rem' }}>
          🔄 Refresh
        </button>

        <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: '0.8rem', alignSelf: 'center' }}>
          {total} alert{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Loading alerts…</div>
      )}
      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#fca5a5', marginBottom: '1rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Alert Cards */}
      {!loading && alerts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#475569' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
          No alerts match the current filters.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {alerts.map(alert => {
          const hColor = HAZARD_COLOR[alert.hazardType] ?? '#94a3b8';
          const hIcon = HAZARD_ICON[alert.hazardType] ?? '⚡';
          const isPending = alert.status === 'PendingReview';
          return (
            <div key={alert.id} style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${isPending ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.07)'}`,
              borderRadius: 12, padding: '1rem 1.25rem',
              display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'start'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '1rem' }}>{hIcon}</span>
                  <span style={{ color: hColor, fontWeight: 700, fontSize: '0.9rem' }}>{alert.hazardType}</span>
                  <span style={{
                    fontSize: '0.68rem', padding: '2px 8px', borderRadius: 4,
                    background: alert.severity === 'High' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                    color: alert.severity === 'High' ? '#fca5a5' : '#fcd34d'
                  }}>
                    {alert.severity}
                  </span>
                  {/* Status badge */}
                  <span style={{
                    fontSize: '0.68rem', padding: '2px 8px', borderRadius: 4, marginLeft: 4,
                    background: isPending ? 'rgba(245,158,11,0.1)' : alert.status === 'Published' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    color: isPending ? '#fcd34d' : alert.status === 'Published' ? '#6ee7b7' : '#fca5a5'
                  }}>
                    {isPending ? '⏳ Pending Review' : alert.status === 'Published' ? '✅ Published' : '❌ Rejected'}
                  </span>
                </div>

                <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginBottom: '0.35rem' }}>
                  📍 {alert.districtName ?? alert.districtId}
                  <span style={{ marginLeft: 16, color: '#475569' }}>
                    🕐 {new Date(alert.createdAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                  {alert.publishedAt && (
                    <span style={{ marginLeft: 16, color: '#475569' }}>
                      📢 Published: {new Date(alert.publishedAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  )}
                </div>

                <p style={{ color: '#cbd5e1', fontSize: '0.82rem', margin: 0, lineHeight: 1.5 }}>
                  {alert.message}
                </p>
              </div>

              {/* Action Buttons (only for PendingReview) */}
              {isPending && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 120 }}>
                  <button
                    onClick={() => handleReview(alert.id, 'Approved')}
                    disabled={actionLoading !== null}
                    style={{
                      padding: '0.45rem 1rem', borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: 'rgba(16,185,129,0.2)', color: '#6ee7b7', fontWeight: 600, fontSize: '0.8rem',
                      opacity: actionLoading ? 0.5 : 1, transition: 'opacity 0.2s'
                    }}
                  >
                    {actionLoading === alert.id + 'Approved' ? '…' : '✅ Approve'}
                  </button>
                  <button
                    onClick={() => handleReview(alert.id, 'Rejected')}
                    disabled={actionLoading !== null}
                    style={{
                      padding: '0.45rem 1rem', borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: 'rgba(239,68,68,0.15)', color: '#fca5a5', fontWeight: 600, fontSize: '0.8rem',
                      opacity: actionLoading ? 0.5 : 1, transition: 'opacity 0.2s'
                    }}
                  >
                    {actionLoading === alert.id + 'Rejected' ? '…' : '❌ Reject'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1.25rem' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ padding: '0.4rem 0.75rem', borderRadius: 6, background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', opacity: page === 1 ? 0.4 : 1 }}
          >
            ‹ Prev
          </button>
          <span style={{ color: '#64748b', alignSelf: 'center', fontSize: '0.82rem' }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ padding: '0.4rem 0.75rem', borderRadius: 6, background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', opacity: page === totalPages ? 0.4 : 1 }}
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  );
};
