import React from 'react';
import { Shelter } from '../types/recoveryTypes';

interface Props {
  shelters: Shelter[];
  isOfficer: boolean;
  onOccupancyChange?: (shelterId: string, newOccupancy: number) => void;
}

export const ShelterList: React.FC<Props> = ({ shelters, isOfficer, onOccupancyChange }) => {
  if (shelters.length === 0) {
    return (
      <div style={{ padding: '3rem 2rem', textAlign: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#64748b' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⛺</div>
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontWeight: 700 }}>No Shelters Found</h3>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>No relief centers match your search or filter criteria.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
      {shelters.map((s) => {
        const pct = s.capacity > 0 ? Math.round((s.currentOccupancy / s.capacity) * 100) : 0;
        const isFull = s.status === 'Full' || pct >= 100;
        const isHigh = pct >= 80 && !isFull;

        return (
          <div
            key={s.id}
            style={{
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.5rem',
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  {s.name}
                </h3>
                <span
                  style={{
                    backgroundColor: isFull ? '#fee2e2' : isHigh ? '#fef3c7' : '#dcfce7',
                    color: isFull ? '#b91c1c' : isHigh ? '#b45309' : '#15803d',
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  {s.status}
                </span>
              </div>

              <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 1rem 0' }}>
                📍 {s.location}, <strong>{s.district}</strong>
              </p>

              {/* Occupancy Gauge */}
              <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #f1f5f9', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                  <span style={{ color: '#475569', fontWeight: 600 }}>Occupancy: {s.currentOccupancy} / {s.capacity} beds</span>
                  <strong style={{ color: isFull ? '#dc2626' : isHigh ? '#ea580c' : '#16a34a' }}>{pct}%</strong>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.min(pct, 100)}%`,
                      height: '100%',
                      backgroundColor: isFull ? '#ef4444' : isHigh ? '#f59e0b' : '#10b981',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
                  <span>Available Beds: {Math.max(0, s.capacity - s.currentOccupancy)}</span>
                  <span>{isFull ? '🔴 Capacity Reached' : '🟢 Space Available'}</span>
                </div>
              </div>

              <div style={{ fontSize: '0.85rem', color: '#334155', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div>👤 Coordinator: <strong>{s.contactPerson}</strong> (<span style={{ fontFamily: 'monospace' }}>{s.contactPhone}</span>)</div>
                <div>🛠 Facilities: <span style={{ color: '#64748b' }}>{s.facilities || 'Water, Food, Medical Post'}</span></div>
              </div>
            </div>

            {isOfficer && onOccupancyChange && s.status !== 'Inactive' && (
              <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.85rem' }}>
                <button
                  type="button"
                  onClick={() => onOccupancyChange(s.id, Math.max(0, s.currentOccupancy - 5))}
                  style={{ flex: 1, padding: '0.45rem', fontSize: '0.8rem', fontWeight: 600, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', color: '#334155' }}
                >
                  - 5 Evacuees
                </button>
                <button
                  type="button"
                  onClick={() => onOccupancyChange(s.id, Math.min(s.capacity, s.currentOccupancy + 5))}
                  style={{ flex: 1, padding: '0.45rem', fontSize: '0.8rem', fontWeight: 600, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', cursor: 'pointer', color: '#1d4ed8' }}
                >
                  + 5 Evacuees
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
