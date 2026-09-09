import React from 'react';
import { Shelter } from '../types/recoveryTypes';

interface Props {
  shelters: Shelter[];
  onOccupancyChange?: (shelterId: string, newOccupancy: number) => void;
}

export const ShelterList: React.FC<Props> = ({ shelters, onOccupancyChange }) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
      {shelters.map((s) => {
        const pct = Math.round((s.currentOccupancy / s.capacity) * 100);
        const badgeColor = s.status === 'Active' ? '#10b981' : s.status === 'Full' ? '#ef4444' : '#6b7280';

        return (
          <div
            key={s.id}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '1.25rem',
              backgroundColor: '#ffffff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', fontWeight: 600 }}>{s.name}</h3>
              <span
                style={{
                  backgroundColor: badgeColor,
                  color: '#fff',
                  fontSize: '0.75rem',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                }}
              >
                {s.status}
              </span>
            </div>
            <p style={{ color: '#4b5563', fontSize: '0.875rem', margin: '0 0 0.75rem 0' }}>
              📍 {s.location} ({s.district})
            </p>

            <div style={{ margin: '1rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span>Occupancy: {s.currentOccupancy} / {s.capacity}</span>
                <span style={{ fontWeight: 'bold' }}>{pct}%</span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(pct, 100)}%`,
                    height: '100%',
                    backgroundColor: pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#3b82f6',
                  }}
                />
              </div>
            </div>

            <div style={{ fontSize: '0.85rem', color: '#374151', borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem' }}>
              <p style={{ margin: '2px 0' }}>👤 Contact: <strong>{s.contactPerson}</strong> ({s.contactPhone})</p>
              <p style={{ margin: '2px 0' }}>🛠 Facilities: {s.facilities}</p>
            </div>

            {onOccupancyChange && s.status !== 'Inactive' && (
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => onOccupancyChange(s.id, Math.max(0, s.currentOccupancy - 5))}
                  style={{ flex: 1, padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  - 5 Occupants
                </button>
                <button
                  onClick={() => onOccupancyChange(s.id, Math.min(s.capacity, s.currentOccupancy + 5))}
                  style={{ flex: 1, padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  + 5 Occupants
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
