import React, { useEffect, useState } from 'react';
import type { AnalyticsResponse, HazardAccuracy } from '../types/weatherTypes';
import { fetchAnalytics } from '../api/weatherApi';

const HAZARD_COLOR: Record<string, string> = {
  Flood: '#3b82f6',
  Landslide: '#f59e0b',
  StrongWind: '#a78bfa',
  'Strong Wind': '#a78bfa',
};
const HAZARD_ICON: Record<string, string> = {
  Flood: '🌊',
  Landslide: '⛰️',
  StrongWind: '💨',
  'Strong Wind': '💨',
};

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12, padding: '1.25rem', textAlign: 'center'
    }}>
      <div style={{ color: color ?? '#f1f5f9', fontSize: '2rem', fontWeight: 700, marginBottom: '0.25rem' }}>
        {value}
      </div>
      <div style={{ color: '#f1f5f9', fontSize: '0.85rem', fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.2rem' }}>{sub}</div>}
    </div>
  );
}

function HazardAccuracyBar({ h }: { h: HazardAccuracy }) {
  const color = HAZARD_COLOR[h.hazardType] ?? '#94a3b8';
  const icon = HAZARD_ICON[h.hazardType] ?? '⚡';
  const pct = h.accuracyPct;
  const hasData = h.withOutcomeRecorded > 0;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 10, padding: '1rem 1.25rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1.1rem' }}>{icon}</span>
          <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.9rem' }}>{h.hazardType}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ color: color, fontWeight: 700, fontSize: '1.2rem' }}>
            {hasData ? `${pct.toFixed(1)}%` : 'N/A'}
          </span>
          <div style={{ color: '#64748b', fontSize: '0.7rem' }}>
            {h.correct}/{h.withOutcomeRecorded} correct
          </div>
        </div>
      </div>

      {/* Accuracy bar */}
      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 6, height: 10, overflow: 'hidden' }}>
        {hasData && (
          <div style={{
            height: '100%', width: `${pct}%`,
            background: pct >= 80
              ? `linear-gradient(90deg,${color},#10b981)`
              : pct >= 60
              ? `linear-gradient(90deg,${color},#f59e0b)`
              : `linear-gradient(90deg,${color},#ef4444)`,
            borderRadius: 6, transition: 'width 0.8s ease'
          }} />
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.72rem', color: '#475569' }}>
        <span>Total predictions: {h.total}</span>
        <span>Outcomes recorded: {h.withOutcomeRecorded}</span>
      </div>
    </div>
  );
}

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAnalytics();
      setData(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const overallAccuracyColor =
    !data || data.withOutcomeRecorded === 0 ? '#64748b'
    : data.accuracyPct >= 80 ? '#10b981'
    : data.accuracyPct >= 60 ? '#f59e0b'
    : '#ef4444';

  return (
    <div style={{ padding: '1.5rem 2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ margin: 0, color: '#f1f5f9', fontSize: '1.4rem', fontWeight: 700 }}>
            📊 Prediction Accuracy Analytics
          </h2>
          <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
            Compares AI predictions against recorded actual outcomes
          </p>
        </div>
        <button onClick={load} style={{ padding: '0.5rem 1rem', borderRadius: 8, background: 'rgba(37,99,235,0.2)', color: '#93c5fd', border: '1px solid rgba(37,99,235,0.3)', cursor: 'pointer', fontSize: '0.82rem' }}>
          🔄 Refresh
        </button>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Loading analytics…</div>}
      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', marginBottom: '1rem' }}>
          ⚠️ {error}
        </div>
      )}

      {data && (
        <>
          {/* Summary Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <StatCard
              label="Total Predictions"
              value={data.totalPredictions}
              sub="All agent runs"
            />
            <StatCard
              label="Outcomes Recorded"
              value={data.withOutcomeRecorded}
              sub={`${data.totalPredictions > 0 ? ((data.withOutcomeRecorded / data.totalPredictions) * 100).toFixed(0) : 0}% coverage`}
              color="#93c5fd"
            />
            <StatCard
              label="Correct Predictions"
              value={data.correctPredictions}
              sub="Prediction matched outcome"
              color="#6ee7b7"
            />
            <StatCard
              label="Overall Accuracy"
              value={data.withOutcomeRecorded === 0 ? 'N/A' : `${data.accuracyPct.toFixed(1)}%`}
              sub={data.withOutcomeRecorded === 0 ? 'No outcomes yet' : 'vs recorded outcomes'}
              color={overallAccuracyColor}
            />
          </div>

          {/* No outcomes note */}
          {data.withOutcomeRecorded === 0 && (
            <div style={{
              padding: '1.25rem', background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, marginBottom: '1.5rem',
              color: '#fcd34d', fontSize: '0.85rem'
            }}>
              ℹ️ <strong>No outcome data recorded yet.</strong> Accuracy metrics will appear here once the
              ForecastHistory table is populated (when actual disaster events are confirmed by officers).
              The prediction counts above reflect all agent runs to date.
            </div>
          )}

          {/* Per-Hazard Accuracy */}
          {data.byHazardType.length > 0 && (
            <div>
              <h3 style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.75rem' }}>
                Accuracy by Hazard Type
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {data.byHazardType.map(h => (
                  <HazardAccuracyBar key={h.hazardType} h={h} />
                ))}
              </div>
            </div>
          )}

          {/* Methodology note */}
          <div style={{
            marginTop: '1.5rem', padding: '1rem 1.25rem',
            background: 'rgba(255,255,255,0.03)', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.06)', fontSize: '0.78rem', color: '#475569', lineHeight: 1.6
          }}>
            <strong style={{ color: '#64748b' }}>Accuracy methodology:</strong> A prediction is "correct" when
            the agent's risk probability ≥ 50% matches a confirmed disaster event, or &lt; 50% matches no event.
            Outcomes are recorded in the ForecastHistory table when an officer confirms post-event.
          </div>
        </>
      )}
    </div>
  );
};
