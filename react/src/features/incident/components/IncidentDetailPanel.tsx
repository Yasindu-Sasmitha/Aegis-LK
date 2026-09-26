import React, { useEffect, useState, useCallback } from 'react';
import { IncidentReport } from '../types/incidentTypes';
import { fetchRelatedReports } from '../api/incidentApi';
import { DuplicateCard } from './DuplicateCard';

interface Props {
  incident: IncidentReport | null;
  onViewFullDetails: (id: string) => void;
}

export const IncidentDetailPanel: React.FC<Props> = ({ incident, onViewFullDetails }) => {
  const [duplicates, setDuplicates] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDuplicates = useCallback(() => {
    if (!incident) {
      setDuplicates([]);
      return;
    }
    setLoading(true);
    setError(null);
    fetchRelatedReports(incident.id)
      .then((related) => {
        setDuplicates(related);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load related reports:', err);
        setError(err instanceof Error ? err.message : 'Failed to load duplicates');
        setLoading(false);
      });
  }, [incident]);

  useEffect(() => {
    loadDuplicates();
  }, [loadDuplicates]);

  if (!incident) {
    return (
      <div className="ae-card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: '#94a3b8' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👈</div>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>Select an incident from the list to view its details.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary + See Full Details */}
      <div className="ae-card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
              {incident.disasterType}
            </h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              Reported {new Date(incident.createdAt).toLocaleString()}
            </p>
          </div>
          <span className="ae-chip ae-chip-neutral">{incident.status}</span>
        </div>

        <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#334155', lineHeight: 1.5 }}>
          {incident.description}
        </p>

        <button
          onClick={() => onViewFullDetails(incident.id)}
          style={{
            width: '100%',
            padding: '0.65rem 1rem',
            borderRadius: 8,
            border: 'none',
            backgroundColor: '#0c2242',
            color: '#ffffff',
            fontSize: '0.875rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          See Full Details →
        </button>
      </div>

      {/* Duplicates */}
      <div>
        <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>
          🧬 Related Reports {duplicates.length > 0 && `(${duplicates.length})`}
        </h4>

        {loading ? (
          <div className="ae-card">
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>Loading duplicates…</p>
          </div>
        ) : error ? (
          <div className="ae-card" style={{ borderLeft: '4px solid #ef4444' }}>
            <p style={{ margin: 0, color: '#b91c1c', fontSize: '0.85rem' }}>⚠️ {error}</p>
          </div>
        ) : duplicates.length === 0 ? (
          <div className="ae-card">
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem' }}>
              No duplicate reports linked to this incident.
            </p>
          </div>
        ) : (
          duplicates.map((dup) => (
            <DuplicateCard
              key={dup.id}
              duplicate={dup}
              onViewDetail={onViewFullDetails}
              onUnlinked={loadDuplicates}
            />
          ))
        )}
      </div>
    </div>
  );
};