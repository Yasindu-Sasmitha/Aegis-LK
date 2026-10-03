import React, { useEffect, useState, useCallback } from 'react';
import type { WeatherAlert, District } from '../types/weatherTypes';
import { fetchAlerts, fetchDistricts } from '../api/weatherApi';

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
const STATUS_STYLE: Record<string, { bg: string; color: string; border: string; label: string }> = {
  Published: { bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0', label: '✅ Published' },
  PendingReview: { bg: '#fffbeb', color: '#b45309', border: '#fde68a', label: '⏳ Pending Review' },
  Rejected: { bg: '#fef2f2', color: '#991b1b', border: '#fecaca', label: '❌ Rejected' },
};

export const AlertHistoryPage: React.FC = () => {
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [total, setTotal] = useState(0);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterHazard, setFilterHazard] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

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
  }, [filterStatus, filterDistrict, filterHazard, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetchDistricts().then(setDistricts); }, []);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div style={{ padding: '0.5rem 0' }}>
      {/* Hero Header */}
      <div className="ae-hero-band">
        <div className="ae-eyebrow">WEATHER INTELLIGENCE &bull; ALERT LOG</div>
        <h2 className="ae-headline">📜 Alert History</h2>
        <p style={{ color: '#b7c4ff', margin: '0.35rem 0 0', fontSize: '0.875rem' }}>
          Historical record of all weather alerts published, pending review, or rejected
        </p>
      </div>

      {/* Filters */}
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
          <option value="Published">Published</option>
          <option value="PendingReview">Pending Review</option>
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

      {loading && (
        <div style={{
          textAlign: 'center', padding: '3rem',
          background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0',
          color: '#0f172a', fontWeight: 600, fontSize: '0.95rem'
        }}>
          ⏳ Loading alert records…
        </div>
      )}

      {error && (
        <div style={{
          padding: '1rem 1.25rem', background: '#fef2f2',
          borderRadius: 10, border: '1px solid #fecaca',
          color: '#991b1b', marginBottom: '1.25rem', fontWeight: 600
        }}>
          ⚠️ {error}
        </div>
      )}

      {!loading && alerts.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '3.5rem 2rem',
          background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0',
          color: '#334155'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
            No Alert History
          </div>
          <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
            No alerts match the current filter selection.
          </div>
        </div>
      )}

      {/* Table */}
      {alerts.length > 0 && (
        <div style={{
          background: '#ffffff', borderRadius: 12,
          border: '1px solid #e2e8f0', overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {['Hazard', 'District', 'Severity', 'Status', 'Message', 'Created At', 'Published At'].map(h => (
                  <th key={h} style={{ padding: '0.85rem 1.25rem', textAlign: 'left', color: '#0f172a', fontWeight: 700 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alerts.map((a, i) => {
                const hColor = HAZARD_COLOR[a.hazardType] ?? '#1d4ed8';
                const hIcon = HAZARD_ICON[a.hazardType] ?? '⚡';
                const sStyle = STATUS_STYLE[a.status] ?? { bg: '#f1f5f9', color: '#334155', border: '#cbd5e1', label: a.status };
                const sevStyle = a.severity === 'High'
                  ? { bg: '#fee2e2', color: '#991b1b', border: '#fecaca' }
                  : { bg: '#fef3c7', color: '#92400e', border: '#fde68a' };

                return (
                  <tr key={a.id} style={{
                    borderBottom: '1px solid #e2e8f0',
                    background: i % 2 === 0 ? '#ffffff' : '#f8fafc'
                  }}>
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <span style={{ color: hColor, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>{hIcon}</span>
                        <span>{a.hazardType}</span>
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', color: '#0f172a', fontWeight: 600 }}>
                      📍 {a.districtName ?? '—'}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <span style={{
                        padding: '3px 9px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700,
                        background: sevStyle.bg, color: sevStyle.color, border: `1px solid ${sevStyle.border}`
                      }}>
                        {a.severity}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <span style={{
                        padding: '3px 9px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700,
                        background: sStyle.bg, color: sStyle.color, border: `1px solid ${sStyle.border}`
                      }}>
                        {sStyle.label}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', color: '#334155', maxWidth: 320, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {a.message}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', color: '#334155', fontWeight: 500 }}>
                      {new Date(a.createdAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', color: a.publishedAt ? '#047857' : '#64748b', fontWeight: a.publishedAt ? 600 : 400 }}>
                      {a.publishedAt
                        ? new Date(a.publishedAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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
