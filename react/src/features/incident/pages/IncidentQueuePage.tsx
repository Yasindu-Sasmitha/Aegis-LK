import React, { useEffect, useState, useCallback } from 'react';
import { fetchIncidents } from '../api/incidentApi';
import { IncidentReport, IncidentStatus } from '../types/incidentTypes';
import { useAuth } from '../../../shared/auth/AuthContext';
import { IncidentDetailPanel } from '../components/IncidentDetailPanel';

interface Props {
  onNavigate?: (tab: string, incidentId?: string) => void;
  fixedStatus?: IncidentStatus; // when set, this tab is locked to one status and the dropdown is hidden
  title?: string; // e.g. "Reported Incidents" — defaults to "Incident Queue"
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

export const IncidentQueuePage: React.FC<Props> = ({ onNavigate, fixedStatus, title }) => {
  const { user } = useAuth();
  const isOfficerOrAdmin = user?.role === 'DisasterOfficer' || user?.role === 'Admin';

  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'All'>(fixedStatus ?? 'All');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pageSize = 10;

  const effectiveStatus = fixedStatus ?? statusFilter;

  const loadIncidents = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchIncidents({
      status: effectiveStatus === 'All' ? undefined : effectiveStatus,
      page,
      pageSize,
    })
      .then((res) => {
        setIncidents(res.items);
        setTotal(res.total);
        setLoading(false);
        // Keep the selection if it's still present in the refreshed list; otherwise clear it
        // (e.g. after a status filter change makes the previously-selected incident disappear).
        setSelectedId((prev) => (prev && res.items.some((i) => i.id === prev) ? prev : null));
      })
      .catch((err) => {
        console.error('Failed to load incidents:', err);
        setError(err instanceof Error ? err.message : 'Failed to load incidents');
        setLoading(false);
      });
  }, [effectiveStatus, page]);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  const selectedIncident = incidents.find((i) => i.id === selectedId) ?? null;

  const openFullDetails = (id: string) => {
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
            🚨 {title ?? 'Incident Queue'}
          </h2>
          <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.875rem' }}>
            {total} {total === 1 ? 'incident' : 'incidents'}
            {!isOfficerOrAdmin && ' (read-only view)'}
          </p>
        </div>

        {!fixedStatus && (
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
        )}
      </div>

      {error && (
        <div className="ae-card" style={{ marginBottom: '1rem', borderLeft: '4px solid #ef4444' }}>
          <p style={{ margin: 0, color: '#b91c1c' }}>⚠️ {error}</p>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '3fr 2fr',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* Left column — stacked incident cards */}
        <div>
          {loading ? (
            <div className="ae-card">
              <p style={{ margin: 0, color: '#64748b' }}>Loading incidents…</p>
            </div>
          ) : incidents.length === 0 ? (
            <div className="ae-card">
              <p style={{ margin: 0, color: '#64748b' }}>No incidents match this filter.</p>
            </div>
          ) : (
            incidents.map((incident) => {
              const isSelected = incident.id === selectedId;
              return (
                <div
                  key={incident.id}
                  className="ae-card"
                  onClick={() => setSelectedId(incident.id)}
                  style={{
                    marginBottom: '0.85rem',
                    cursor: 'pointer',
                    border: isSelected ? '2px solid #38bdf8' : '1px solid #e2e8f0',
                    boxShadow: isSelected ? '0 0 0 3px rgba(56,189,248,0.15)' : undefined,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                        {incident.disasterType}
                      </span>
                      <span style={{ marginLeft: '0.6rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                        {new Date(incident.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <span className={`ae-chip ${STATUS_CHIP_CLASS[incident.status] ?? 'ae-chip-neutral'}`}>
                      {incident.status}
                    </span>
                  </div>

                  <p
                    style={{
                      margin: '0 0 0.6rem',
                      fontSize: '0.85rem',
                      color: '#475569',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {incident.description}
                  </p>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className={`ae-chip ${plausibilityChipClass(incident.plausibilityScore)}`}>
                      {plausibilityLabel(incident.plausibilityScore)}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {incident.severityAssessed ?? incident.severityReported}
                      {!incident.severityAssessed && ' (reported)'}
                    </span>
                  </div>
                </div>
              );
            })
          )}

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
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

        {/* Right column — selected incident's full-detail button + duplicates */}
        <div style={{ position: 'sticky', top: '1rem' }}>
          <IncidentDetailPanel incident={selectedIncident} onViewFullDetails={openFullDetails} />
        </div>
      </div>
    </div>
  );
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