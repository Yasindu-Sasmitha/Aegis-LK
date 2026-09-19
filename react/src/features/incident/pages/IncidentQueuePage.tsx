import React, { useEffect, useState, useCallback } from 'react';
import { fetchIncidents } from '../api/incidentApi';
import { IncidentReport, IncidentStatus } from '../types/incidentTypes';
import { useAuth } from '../../../shared/auth/AuthContext';

interface Props {
  onNavigate?: (tab: string, incidentId?: string) => void;
}

const STATUS_OPTIONS: { value: IncidentStatus | 'All'; label: string }[] = [
  { value: 'All', label: 'All statuses' },
  { value: 'Reported', label: 'Reported' },
  { value: 'Assessed', label: 'Assessed' },
  { value: 'OnHold', label: 'On Hold' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'MissionApproved', label: 'Mission Approved' },
  { value: 'Closed', label: 'Closed' },
];

const STATUS_CHIP_CLASS: Record<string, string> = {
  Reported: 'ae-chip-moderate',
  Assessed: 'ae-chip-neutral',
  OnHold: 'ae-chip-moderate',
  Rejected: 'ae-chip-high',
  MissionApproved: 'ae-chip-safe',
  Closed: 'ae-chip-neutral',
};

function plausibilityChipClass(score: number | null): string {
  if (score === null) return 'ae-chip-neutral';
  if (score >= 70) return 'ae-chip-safe';
  if (score >= 40) return 'ae-chip-moderate';
  return 'ae-chip-high';
}

function plausibilityLabel(score: number | null): string {
  if (score === null) return 'Not screened';
  return `${score}/100`;
}

export const IncidentQueuePage: React.FC<Props> = ({ onNavigate }) => {
  const { user } = useAuth();
  const isOfficerOrAdmin = user?.role === 'DisasterOfficer' || user?.role === 'Admin';

  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'All'>('All');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const loadIncidents = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchIncidents({
      status: statusFilter === 'All' ? undefined : statusFilter,
      page,
      pageSize,
    })
      .then((res) => {
        setIncidents(res.items);
        setTotal(res.total);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load incidents:', err);
        setError(err instanceof Error ? err.message : 'Failed to load incidents');
        setLoading(false);
      });
  }, [statusFilter, page]);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  const openIncident = (id: string) => {
    if (onNavigate) {
      onNavigate('detail', id);
    } else {
      window.dispatchEvent(new CustomEvent('aegis:navigate-incident', { detail: { tab: 'detail', incidentId: id } }));
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>
            🚨 Incident Queue
          </h2>
          <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.875rem' }}>
            {total} {total === 1 ? 'incident' : 'incidents'} reported
            {!isOfficerOrAdmin && ' (read-only view)'}
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as IncidentStatus | 'All');
            setPage(1);
          }}
          style={{
            padding: '0.55rem 0.85rem',
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            fontSize: '0.875rem',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            color: '#334155',
            backgroundColor: '#ffffff',
            cursor: 'pointer',
          }}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="ae-card" style={{ marginBottom: '1rem', borderLeft: '4px solid #ef4444' }}>
          <p style={{ margin: 0, color: '#b91c1c' }}>⚠️ {error}</p>
        </div>
      )}

      {loading ? (
        <div className="ae-card">
          <p style={{ margin: 0, color: '#64748b' }}>Loading incidents…</p>
        </div>
      ) : incidents.length === 0 ? (
        <div className="ae-card">
          <p style={{ margin: 0, color: '#64748b' }}>No incidents match this filter.</p>
        </div>
      ) : (
        <div className="ae-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Description</th>
                  <th style={thStyle}>Severity</th>
                  <th style={thStyle}>Plausibility</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Reported</th>
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((incident) => (
                  <tr
                    key={incident.id}
                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                    onClick={() => openIncident(incident.id)}
                  >
                    <td style={tdStyle}>{incident.disasterType}</td>
                    <td style={{ ...tdStyle, maxWidth: 320 }}>
                      <span style={{
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {incident.description}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {incident.severityAssessed ?? incident.severityReported}
                      {!incident.severityAssessed && (
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}> (reported)</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span className={`ae-chip ${plausibilityChipClass(incident.plausibilityScore)}`}>
                        {plausibilityLabel(incident.plausibilityScore)}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span className={`ae-chip ${STATUS_CHIP_CLASS[incident.status] ?? 'ae-chip-neutral'}`}>
                        {incident.status}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {new Date(incident.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', color: '#38bdf8', fontWeight: 600 }}>
                      View →
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.25rem' }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={pagerButtonStyle(page <= 1)}
          >
            ← Previous
          </button>
          <span style={{ padding: '0.5rem 0.75rem', color: '#64748b', fontSize: '0.875rem' }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={pagerButtonStyle(page >= totalPages)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.75rem 1rem',
  fontWeight: 600,
  color: '#64748b',
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
};

const tdStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  color: '#334155',
};

function pagerButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '0.5rem 1rem',
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    backgroundColor: disabled ? '#f1f5f9' : '#ffffff',
    color: disabled ? '#94a3b8' : '#334155',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}