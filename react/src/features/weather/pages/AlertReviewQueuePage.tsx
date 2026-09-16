import React, { useEffect, useState, useCallback } from 'react';
import type { WeatherAlert, District } from '../types/weatherTypes';
import { fetchAlerts, reviewAlert, fetchDistricts } from '../api/weatherApi';

const HAZARD_COLOR: Record<string, string> = {
  Flood: '#1d4ed8',
  Landslide: '#b45309',
  StrongWind: '#6d28d9',
  'Strong Wind': '#6d28d9',
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
    <div style={{ padding: '0.5rem 0' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 24, zIndex: 1000,
          padding: '0.85rem 1.35rem', borderRadius: 10,
          background: toast.ok ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${toast.ok ? '#10b981' : '#ef4444'}`,
          color: toast.ok ? '#065f46' : '#991b1b', fontSize: '0.875rem', fontWeight: 600,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
        }}>
          {toast.ok ? '✅' : '⚠️'} {toast.msg}
        </div>
      )}

      {/* Hero Header */}
      <div className="ae-hero-band">
        <div className="ae-eyebrow">WEATHER INTELLIGENCE &bull; DISASTER OPERATIONS</div>
        <h2 className="ae-headline">🔔 Alert Review Queue</h2>
        <p style={{ color: '#b7c4ff', margin: '0.35rem 0 0', fontSize: '0.875rem' }}>
          Approve or reject alerts flagged by the AI agent for human review
        </p>
      </div>

      {/* Filters Bar */}
      <div style={{
        display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem',
        background: '#ffffff', borderRadius: 12, padding: '1rem 1.25rem',
        border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        alignItems: 'center'
      }}>
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          style={{
            padding: '0.5rem 0.85rem', borderRadius: 8,
            background: '#ffffff', color: '#0f172a',
            border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <option value="">All Statuses</option>
          <option value="PendingReview">Pending Review</option>
          <option value="Published">Published</option>
          <option value="Rejected">Rejected</option>
        </select>

        <select
          value={filterDistrict}
          onChange={e => { setFilterDistrict(e.target.value); setPage(1); }}
          style={{
            padding: '0.5rem 0.85rem', borderRadius: 8,
            background: '#ffffff', color: '#0f172a',
            border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <option value="">All Districts</option>
          {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <select
          value={filterHazard}
          onChange={e => { setFilterHazard(e.target.value); setPage(1); }}
          style={{
            padding: '0.5rem 0.85rem', borderRadius: 8,
            background: '#ffffff', color: '#0f172a',
            border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <option value="">All Hazard Types</option>
          <option value="Flood">🌊 Flood</option>
          <option value="Landslide">⛰️ Landslide</option>
          <option value="StrongWind">💨 Strong Wind</option>
        </select>

        <button
          onClick={() => load()}
          style={{
            padding: '0.5rem 1rem', borderRadius: 8,
            background: '#2563eb', color: '#ffffff',
            border: 'none', cursor: 'pointer',
            fontSize: '0.85rem', fontWeight: 600,
            boxShadow: '0 1px 2px rgba(37,99,235,0.2)'
          }}
        >
          🔄 Refresh
        </button>

        <span style={{ marginLeft: 'auto', color: '#0f172a', fontSize: '0.85rem', fontWeight: 700 }}>
          {total} alert{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div style={{
          textAlign: 'center', padding: '3rem',
          background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0',
          color: '#0f172a', fontWeight: 600, fontSize: '0.95rem'
        }}>
          ⏳ Loading alerts…
        </div>
      )}
      {error && (
        <div style={{
          padding: '1rem 1.25rem', background: '#fef2f2',
          border: '1px solid #fecaca', borderRadius: 10,
          color: '#991b1b', marginBottom: '1.25rem', fontWeight: 600
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Alert Cards */}
      {!loading && alerts.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '3.5rem 2rem',
          background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0',
          color: '#334155'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
            Queue is Clear
          </div>
          <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
            No alerts match the current filters.
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {alerts.map(alert => {
          const hColor = HAZARD_COLOR[alert.hazardType] ?? '#1d4ed8';
          const hIcon = HAZARD_ICON[alert.hazardType] ?? '⚡';
          const isPending = alert.status === 'PendingReview';

          // Status and severity styles with dark readable colors
          const sevStyle = alert.severity === 'High'
            ? { bg: '#fee2e2', color: '#991b1b', border: '#fecaca' }
            : { bg: '#fef3c7', color: '#92400e', border: '#fde68a' };

          const statStyle = isPending
            ? { bg: '#fffbeb', color: '#b45309', border: '#fde68a', label: '⏳ Pending Review' }
            : alert.status === 'Published'
            ? { bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0', label: '✅ Published' }
            : { bg: '#fef2f2', color: '#991b1b', border: '#fecaca', label: '❌ Rejected' };

          return (
            <div key={alert.id} style={{
              background: '#ffffff',
              border: isPending ? '1.5px solid #f59e0b' : '1px solid #e2e8f0',
              borderRadius: 12, padding: '1.25rem 1.5rem',
              display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.25rem', alignItems: 'center',
              boxShadow: isPending ? '0 4px 14px rgba(245, 158, 11, 0.09)' : '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.45rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.15rem' }}>{hIcon}</span>
                  <span style={{ color: hColor, fontWeight: 800, fontSize: '0.95rem' }}>{alert.hazardType}</span>
                  <span style={{
                    fontSize: '0.72rem', padding: '3px 9px', borderRadius: 6, fontWeight: 700,
                    background: sevStyle.bg, color: sevStyle.color, border: `1px solid ${sevStyle.border}`
                  }}>
                    {alert.severity} Severity
                  </span>
                  {/* Status badge */}
                  <span style={{
                    fontSize: '0.72rem', padding: '3px 9px', borderRadius: 6, fontWeight: 700,
                    background: statStyle.bg, color: statStyle.color, border: `1px solid ${statStyle.border}`
                  }}>
                    {statStyle.label}
                  </span>
                </div>

                <div style={{ color: '#0f172a', fontSize: '0.825rem', marginBottom: '0.45rem', fontWeight: 600 }}>
                  📍 {alert.districtName ?? alert.districtId}
                  <span style={{ marginLeft: 16, color: '#475569', fontWeight: 500 }}>
                    🕐 Created: {new Date(alert.createdAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                  {alert.publishedAt && (
                    <span style={{ marginLeft: 16, color: '#047857', fontWeight: 600 }}>
                      📢 Published: {new Date(alert.publishedAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  )}
                </div>

                <p style={{ color: '#1e293b', fontSize: '0.875rem', margin: 0, lineHeight: 1.6, fontWeight: 500 }}>
                  {alert.message}
                </p>
              </div>

              {/* Action Buttons (only for PendingReview) */}
              {isPending && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 125 }}>
                  <button
                    onClick={() => handleReview(alert.id, 'Approved')}
                    disabled={actionLoading !== null}
                    style={{
                      padding: '0.55rem 1rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: '#10b981', color: '#ffffff', fontWeight: 700, fontSize: '0.825rem',
                      boxShadow: '0 2px 4px rgba(16,185,129,0.25)',
                      opacity: actionLoading ? 0.5 : 1, transition: 'all 0.2s'
                    }}
                  >
                    {actionLoading === alert.id + 'Approved' ? '…' : '✅ Approve'}
                  </button>
                  <button
                    onClick={() => handleReview(alert.id, 'Rejected')}
                    disabled={actionLoading !== null}
                    style={{
                      padding: '0.55rem 1rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: '#ef4444', color: '#ffffff', fontWeight: 700, fontSize: '0.825rem',
                      boxShadow: '0 2px 4px rgba(239,68,68,0.25)',
                      opacity: actionLoading ? 0.5 : 1, transition: 'all 0.2s'
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
        <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'center', marginTop: '1.5rem', alignItems: 'center' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '0.5rem 1rem', borderRadius: 8,
              background: '#ffffff', color: '#0f172a',
              border: '1px solid #cbd5e1', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.85rem',
              opacity: page === 1 ? 0.4 : 1
            }}
          >
            ‹ Prev
          </button>
          <span style={{ color: '#0f172a', fontSize: '0.85rem', fontWeight: 700, padding: '0 0.5rem' }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding: '0.5rem 1rem', borderRadius: 8,
              background: '#ffffff', color: '#0f172a',
              border: '1px solid #cbd5e1', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.85rem',
              opacity: page === totalPages ? 0.4 : 1
            }}
          >
            Next ›
          </button>
        </div>
      )}
    </div>
  );
};

