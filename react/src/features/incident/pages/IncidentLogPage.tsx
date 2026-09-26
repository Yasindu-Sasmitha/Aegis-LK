import React, { useEffect, useState, useCallback } from 'react';
import { fetchIncidentLogs } from '../api/incidentApi';
import { MissionLogEntry } from '../types/incidentTypes';

const AGENT_KEYWORDS = ['Assessed:', 'Plausibility check', 'Dedup check', 'Agent assessment failed', 'assessment failed'];

function isAgentEntry(note: string): boolean {
  return AGENT_KEYWORDS.some((kw) => note.includes(kw));
}

function entryIcon(note: string): string {
  if (note.includes('Assessed:')) return '🔍';
  if (note.includes('Plausibility')) return '🌦️';
  if (note.includes('Dedup')) return '🧬';
  if (note.includes('rejected')) return '🚫';
  if (note.includes('hold')) return '⏸️';
  if (note.includes('approved')) return '✅';
  if (note.includes('unlinked')) return '🔓';
  if (note.includes('failed')) return '⚠️';
  return '📝';
}

export const IncidentLogPage: React.FC = () => {
  const [logs, setLogs] = useState<MissionLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 30;

  // Debounce search input so we don't fire a request on every keystroke
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
        console.error('Failed to load logs:', err);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>
            📋 Activity Log
          </h2>
          <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.875rem' }}>
            {total} {total === 1 ? 'entry' : 'entries'} — every agent run and officer action, across all incidents
          </p>
        </div>

        <input
          type="text"
          placeholder="Search logs…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '0.55rem 0.85rem',
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            fontSize: '0.875rem',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            width: 260,
          }}
        />
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
          {logs.map((log, idx) => (
            <div
              key={log.id}
              style={{
                padding: '0.9rem 1.1rem',
                borderBottom: idx < logs.length - 1 ? '1px solid #f1f5f9' : undefined,
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start',
              }}
            >
              <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: '0.1rem' }}>
                {entryIcon(log.note)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155', lineHeight: 1.5 }}>
                  {log.note}
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.3rem', fontSize: '0.7rem', color: '#94a3b8' }}>
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                  <span>·</span>
                  <span title={log.incidentId}>Incident {log.incidentId.slice(0, 8)}…</span>
                  {isAgentEntry(log.note) && (
                    <span style={{ color: '#38bdf8', fontWeight: 600 }}>AGENT</span>
                  )}
                </div>
              </div>
            </div>
          ))}
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