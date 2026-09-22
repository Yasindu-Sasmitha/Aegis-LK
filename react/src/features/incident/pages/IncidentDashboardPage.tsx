import React, { useEffect, useState } from 'react';
import { fetchIncidents } from '../api/incidentApi';
import { IncidentReport } from '../types/incidentTypes';

interface Props {
  onNavigate?: (tab: string) => void;
}

interface StatusCount {
  status: string;
  count: number;
  color: string;
  bg: string;
  icon: string;
}

export const IncidentDashboardPage: React.FC<Props> = ({ onNavigate }) => {
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // pageSize large enough to cover realistic totals for a dashboard summary;
    // for exact counts at scale this should move server-side, fine for now.
    fetchIncidents({ pageSize: 200 })
      .then((res) => {
        setIncidents(res.items);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load incidents for dashboard:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
        setLoading(false);
      });
  }, []);

  const countByStatus = (status: string) => incidents.filter((i) => i.status === status).length;
  const needsScreening = incidents.filter((i) => i.plausibilityScore === null && i.status === 'Reported').length;
  const highRiskUnscreened = incidents.filter((i) => i.plausibilityScore !== null && i.plausibilityScore < 40).length;

  const statusCounts: StatusCount[] = [
    { status: 'Reported', count: countByStatus('Reported'), color: '#92400e', bg: '#fef3c7', icon: '📥' },
    { status: 'Assessed', count: countByStatus('Assessed'), color: '#334155', bg: '#f1f5f9', icon: '🔍' },
    { status: 'OnHold', count: countByStatus('OnHold'), color: '#92400e', bg: '#fef3c7', icon: '⏸️' },
    { status: 'Rejected', count: countByStatus('Rejected'), color: '#991b1b', bg: '#fee2e2', icon: '🚫' },
    { status: 'MissionApproved', count: countByStatus('MissionApproved'), color: '#065f46', bg: '#d1fae5', icon: '✅' },
    { status: 'Closed', count: countByStatus('Closed'), color: '#334155', bg: '#f1f5f9', icon: '📁' },
  ];

  if (loading) {
    return (
      <div className="ae-card">
        <p style={{ margin: 0, color: '#64748b' }}>Loading dashboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ae-card" style={{ borderLeft: '4px solid #ef4444' }}>
        <p style={{ margin: 0, color: '#b91c1c' }}>⚠️ {error}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Hero summary */}
      <div
        style={{
          background: 'linear-gradient(135deg, #07162c 0%, #0c2242 100%)',
          borderRadius: 16,
          padding: '1.75rem 2rem',
          marginBottom: '1.5rem',
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', letterSpacing: '0.05em', color: '#93c5fd', fontWeight: 700, marginBottom: '0.35rem' }}>
              INCIDENT & RESCUE OPERATIONS
            </div>
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>
              {incidents.length} Total Incidents
            </h2>
            <p style={{ margin: '0.35rem 0 0', color: '#cbd5e1', fontSize: '0.875rem' }}>
              Screened by AI, triaged by officers, tracked end-to-end.
            </p>
          </div>
          <button
            onClick={() => onNavigate?.('all')}
            style={{
              padding: '0.7rem 1.4rem',
              borderRadius: 10,
              border: 'none',
              backgroundColor: '#38bdf8',
              color: '#07162c',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            View All Incidents →
          </button>
        </div>
      </div>

      {/* Attention callouts */}
      {(needsScreening > 0 || highRiskUnscreened > 0) && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {needsScreening > 0 && (
            <div className="ae-card" style={{ flex: 1, minWidth: 220, borderLeft: '4px solid #f59e0b' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#92400e', fontWeight: 700 }}>
                ⏳ {needsScreening} awaiting agent screening
              </p>
            </div>
          )}
          {highRiskUnscreened > 0 && (
            <div className="ae-card" style={{ flex: 1, minWidth: 220, borderLeft: '4px solid #ef4444' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#991b1b', fontWeight: 700 }}>
                ⚠️ {highRiskUnscreened} flagged low plausibility — needs officer review
              </p>
            </div>
          )}
        </div>
      )}

      {/* Status breakdown grid */}
      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155', margin: '0 0 0.85rem' }}>
        By Status
      </h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '1rem',
        }}
      >
        {statusCounts.map((s) => (
          <div
            key={s.status}
            className="ae-card"
            onClick={() => onNavigate?.(s.status)}
            style={{ cursor: 'pointer', textAlign: 'center' }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>{s.icon}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{s.count}</div>
            <div
              style={{
                marginTop: '0.35rem',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: s.color,
                backgroundColor: s.bg,
                display: 'inline-block',
                padding: '2px 10px',
                borderRadius: 8,
              }}
            >
              {s.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};