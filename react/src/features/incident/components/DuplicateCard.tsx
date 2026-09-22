import React, { useState } from 'react';
import { IncidentReport } from '../types/incidentTypes';
import { unlinkIncident } from '../api/incidentApi';

interface Props {
  duplicate: IncidentReport;
  onViewDetail: (id: string) => void;
  onUnlinked: () => void; // parent refreshes the duplicates list after a successful unlink
}

function confidenceChipClass(confidence: number | null): string {
  if (confidence === null) return 'ae-chip-neutral';
  if (confidence >= 70) return 'ae-chip-high';
  if (confidence >= 40) return 'ae-chip-moderate';
  return 'ae-chip-safe';
}

export const DuplicateCard: React.FC<Props> = ({ duplicate, onViewDetail, onUnlinked }) => {
  const [unlinking, setUnlinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNotADuplicate = async () => {
    if (unlinking) return;
    setUnlinking(true);
    setError(null);
    try {
      await unlinkIncident(duplicate.id);
      onUnlinked();
    } catch (err) {
      console.error('Failed to unlink incident:', err);
      setError(err instanceof Error ? err.message : 'Failed to unlink');
      setUnlinking(false);
    }
  };

  return (
    <div
      className="ae-card"
      style={{
        display: 'flex',
        gap: '0.85rem',
        padding: '0.85rem',
        marginBottom: '0.75rem',
        alignItems: 'flex-start',
      }}
    >
      {duplicate.photoUrl ? (
        <img
          src={duplicate.photoUrl}
          alt="Duplicate report"
          style={{
            width: 72,
            height: 72,
            borderRadius: 8,
            objectFit: 'cover',
            flexShrink: 0,
            border: '1px solid #e2e8f0',
          }}
        />
      ) : (
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 8,
            flexShrink: 0,
            backgroundColor: '#f1f5f9',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            color: '#94a3b8',
          }}
        >
          📷
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
          <p
            style={{
              margin: 0,
              fontSize: '0.85rem',
              color: '#334155',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {duplicate.description}
          </p>
          <span className={`ae-chip ${confidenceChipClass(duplicate.dedupConfidence)}`} style={{ flexShrink: 0 }}>
            {duplicate.dedupConfidence !== null ? `${duplicate.dedupConfidence}% match` : 'Unscored'}
          </span>
        </div>

        {duplicate.dedupReasoning && (
          <p
            style={{
              margin: '0.4rem 0 0',
              fontSize: '0.75rem',
              color: '#64748b',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            🤖 {duplicate.dedupReasoning}
          </p>
        )}

        {error && (
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: '#b91c1c' }}>⚠️ {error}</p>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
          <button
            onClick={() => onViewDetail(duplicate.id)}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            See Detail
          </button>
          <button
            onClick={handleNotADuplicate}
            disabled={unlinking}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: 6,
              border: '1px solid #fecaca',
              backgroundColor: unlinking ? '#f1f5f9' : '#fef2f2',
              color: unlinking ? '#94a3b8' : '#b91c1c',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: unlinking ? 'not-allowed' : 'pointer',
            }}
          >
            {unlinking ? 'Unlinking…' : 'Not a duplicate'}
          </button>
        </div>
      </div>
    </div>
  );
};