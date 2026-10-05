import React, { useEffect, useState, useCallback } from 'react';
import { fetchIncidentLogs } from '../api/incidentApi';
import { MissionLogEntry } from '../types/incidentTypes';

interface IncidentLogPageProps {
  onNavigate?: (tab: string, incidentId?: string) => void;
}

// Visual label per action category (the backend derives `action` from the note).
const ACTION_STYLE: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  Reported: { icon: '📝', label: 'Reported', color: '#0369a1', bg: '#e0f2fe' },
  Photo: { icon: '📷', label: 'Photo added', color: '#475569', bg: '#f1f5f9' },
  Assessment: { icon: '🔍', label: 'Assessment', color: '#6d28d9', bg: '#ede9fe' },
  Plausibility: { icon: '🌦️', label: 'Plausibility', color: '#0e7490', bg: '#cffafe' },
  Dedup: { icon: '🧬', label: 'Dedup', color: '#be185d', bg: '#fce7f3' },
  Approved: { icon: '✅', label: 'Approved', color: '#047857', bg: '#d1fae5' },
  Dispatch: { icon: '🚚', label: 'Dispatch', color: '#047857', bg: '#ecfdf5' },
  Rejected: { icon: '🚫', label: 'Rejected', color: '#b91c1c', bg: '#fee2e2' },
  Held: { icon: '⏸️', label: 'On hold', color: '#b45309', bg: '#fef3c7' },
  Unlinked: { icon: '🔓', label: 'Unlinked', color: '#475569', bg: '#f1f5f9' },
  Rescreened: { icon: '🔄', label: 'Re-screen', color: '#0369a1', bg: '#e0f2fe' },
  Closed: { icon: '📁', label: 'Closed', color: '#334155', bg: '#e2e8f0' },
  Recovery: { icon: '🏗️', label: 'Recovery', color: '#4d7c0f', bg: '#ecfccb' },
  Other: { icon: '📄', label: 'Other', color: '#475569', bg: '#f1f5f9' },
};

const ACTOR_ICON: Record<string, string> = {
  officer: '👮',
  citizen: '🧑',
  agent: '🤖',
  system: '⚙️',
};

function shortId(id?: string | null): string {
  return id ? `${id.slice(0, 8)}…` : '';
}

export const IncidentLogPage: React.FC<IncidentLogPageProps> = ({ onNavigate }) => {
  const [logs, setLogs] = useState<MissionLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 30;

  // Debounce so we don't fire a request on every keystroke
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchIncidentLogs({ search: debouncedSearch || undefined, page, pageSize })
      .then((res) => {
        setLogs(res.items);
        setTotal(res.total);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load logs');
        setLoading(false);
      });
  }, [debouncedSearch, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>📋 Activity Log</h2>
          <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.875rem' }}>
            {total} {total === 1 ? 'entry' : 'entries'} — who did what, across all incidents
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search by name, action, note…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '0.55rem 0.85rem',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: '0.875rem',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              width: 280,
            }}
          />
          <button onClick={load} style={pagerButtonStyle(false)} title="Refresh">
            ↻ Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="ae-card" style={{ marginBottom: '1rem', borderLeft: '4px solid #ef4444' }}>
          <p style={{ margin: 0, color: '#b91c1c' }}>⚠️ {error}</p>
        </div>
      )}

      {loading ? (
        <div className="ae-card">
          <p style={{ margin: 0, color: '#64748b' }}>Loading logs…</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="ae-card">
          <p style={{ margin: 0, color: '#64748b' }}>
            {debouncedSearch ? 'No log entries match your search.' : 'No log entries yet.'}
          </p>
        </div>
      ) : (
        <div className="ae-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', textAlign: 'left', color: '#64748b' }}>
                  <th style={thStyle}>Time</th>
                  <th style={thStyle}>Action</th>
                  <th style={thStyle}>Who</th>
                  <th style={thStyle}>Details</th>
                  <th style={thStyle}>Incident</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const style = ACTION_STYLE[log.action ?? 'Other'] ?? ACTION_STYLE.Other;
                  const actorType = log.actorType ?? 'system';
                  return (
                    <tr key={log.id} style={{ borderTop: '1px solid #f1f5f9', verticalAlign: 'top' }}>
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: '#64748b' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.15rem 0.55rem',
                            borderRadius: 999,
                            fontWeight: 700,
                            fontSize: '0.72rem',
                            color: log.failed ? '#b91c1c' : style.color,
                            background: log.failed ? '#fee2e2' : style.bg,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {log.failed ? '⚠️' : style.icon} {style.label}
                          {log.failed ? ' failed' : ''}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>
                          {ACTOR_ICON[actorType]} {log.actorName ?? 'System / not recorded'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                          {log.actorRole ?? (actorType === 'agent' ? 'AI agent' : actorType)}
                          {log.actorUserId ? ` · ${shortId(log.actorUserId)}` : ''}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, color: '#334155', lineHeight: 1.5, minWidth: 260 }}>{log.note}</td>
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => onNavigate?.('detail', log.incidentId)}
                          title={log.incidentId}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            color: '#0284c7',
                            fontWeight: 600,
                            cursor: onNavigate ? 'pointer' : 'default',
                            textDecoration: onNavigate ? 'underline' : 'none',
                            fontSize: '0.82rem',
                          }}
                        >
                          {shortId(log.incidentId)}
                        </button>
                      </td>
                    </tr>
                  );
                })}
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
  padding: '0.65rem 0.9rem',
  fontSize: '0.7rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const tdStyle: React.CSSProperties = { padding: '0.7rem 0.9rem' };

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