import React, { useEffect, useState } from 'react';
import type { AnalyticsResponse, HazardAccuracy } from '../types/weatherTypes';
import { fetchAnalytics } from '../api/weatherApi';

const HAZARD_COLOR: Record<string, string> = {
  Flood: '#1d4ed8',
  Landslide: '#b45309',
  StrongWind: '#6d28d9',
  'Strong Wind': '#6d28d9',
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
      background: '#ffffff', border: '1px solid #e2e8f0',
      borderRadius: 12, padding: '1.4rem 1.25rem', textAlign: 'center',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    }}>
      <div style={{ color: color ?? '#0f172a', fontSize: '2.1rem', fontWeight: 800, marginBottom: '0.35rem', letterSpacing: '-0.02em' }}>
        {value}
      </div>
      <div style={{ color: '#0f172a', fontSize: '0.875rem', fontWeight: 700 }}>{label}</div>
      {sub && <div style={{ color: '#475569', fontSize: '0.75rem', marginTop: '0.3rem', fontWeight: 500 }}>{sub}</div>}
    </div>
  );
}

function HazardAccuracyBar({ h }: { h: HazardAccuracy }) {
  const color = HAZARD_COLOR[h.hazardType] ?? '#1d4ed8';
  const icon = HAZARD_ICON[h.hazardType] ?? '⚡';
  const pct = h.accuracyPct;
  const hasData = h.withOutcomeRecorded > 0;

  return (
    <div style={{
      background: '#ffffff', border: '1px solid #e2e8f0',
      borderRadius: 12, padding: '1.25rem 1.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.25rem' }}>{icon}</span>
          <span style={{ color: '#0f172a', fontWeight: 700, fontSize: '0.95rem' }}>{h.hazardType}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ color: color, fontWeight: 800, fontSize: '1.3rem' }}>
            {hasData ? `${pct.toFixed(1)}%` : 'N/A'}
          </span>
          <div style={{ color: '#334155', fontSize: '0.78rem', fontWeight: 600 }}>
            {h.correct}/{h.withOutcomeRecorded} correct
          </div>
        </div>
      </div>

      {/* Accuracy bar */}
      <div style={{ background: '#e2e8f0', borderRadius: 6, height: 10, overflow: 'hidden' }}>
        {hasData && (
          <div style={{
            height: '100%', width: `${pct}%`,
            background: pct >= 80
              ? `linear-gradient(90deg, ${color}, #10b981)`
              : pct >= 60
              ? `linear-gradient(90deg, ${color}, #f59e0b)`
              : `linear-gradient(90deg, ${color}, #ef4444)`,
            borderRadius: 6, transition: 'width 0.8s ease'
          }} />
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.78rem', color: '#475569', fontWeight: 500 }}>
        <span>Total predictions: <strong style={{ color: '#0f172a' }}>{h.total}</strong></span>
        <span>Outcomes recorded: <strong style={{ color: '#0f172a' }}>{h.withOutcomeRecorded}</strong></span>
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
    !data || data.withOutcomeRecorded === 0 ? '#475569'
    : data.accuracyPct >= 80 ? '#059669'
    : data.accuracyPct >= 60 ? '#d97706'
    : '#dc2626';

  return (
    <div style={{ padding: '0.5rem 0' }}>
      {/* Hero Header */}
      <div className="ae-hero-band">
        <div className="ae-eyebrow">WEATHER INTELLIGENCE &bull; ACCURACY AUDIT</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="ae-headline">📊 Prediction Accuracy Analytics</h2>
            <p style={{ color: '#b7c4ff', margin: '0.35rem 0 0', fontSize: '0.875rem' }}>
              Compares AI predictions against recorded actual outcomes
            </p>
          </div>
          <button
            onClick={load}
            style={{
              padding: '0.55rem 1.15rem', borderRadius: 8,
              background: '#38bdf8', color: '#07162c',
              border: 'none', cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: 700,
              boxShadow: '0 2px 8px rgba(56,189,248,0.3)'
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {loading && (
        <div style={{
          textAlign: 'center', padding: '3rem',
          background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0',
          color: '#0f172a', fontWeight: 600, fontSize: '0.95rem'
        }}>
          ⏳ Loading analytics…
        </div>
      )}

      {error && (
        <div style={{
          padding: '1rem 1.25rem', background: '#fef2f2', borderRadius: 10,
          border: '1px solid #fecaca', color: '#991b1b', marginBottom: '1.25rem', fontWeight: 600
        }}>
          ⚠️ {error}
        </div>
      )}

      {data && (
        <>
          {/* Summary Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <StatCard
              label="Total Predictions"
              value={data.totalPredictions}
              sub="All agent runs"
              color="#0f172a"
            />
            <StatCard
              label="Outcomes Recorded"
              value={data.withOutcomeRecorded}
              sub={`${data.totalPredictions > 0 ? ((data.withOutcomeRecorded / data.totalPredictions) * 100).toFixed(0) : 0}% coverage`}
              color="#1d4ed8"
            />
            <StatCard
              label="Correct Predictions"
              value={data.correctPredictions}
              sub="Prediction matched outcome"
              color="#059669"
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
              padding: '1.25rem 1.5rem', background: '#fffbeb',
              border: '1px solid #fde68a', borderRadius: 12, marginBottom: '1.5rem',
              color: '#92400e', fontSize: '0.875rem', lineHeight: 1.6
            }}>
              ℹ️ <strong style={{ color: '#78350f' }}>No outcome data recorded yet.</strong> Accuracy metrics will appear here once the
              ForecastHistory table is populated (when actual disaster events are confirmed by officers).
              The prediction counts above reflect all agent runs to date.
            </div>
          )}

          {/* Per-Hazard Accuracy */}
          {data.byHazardType.length > 0 && (
            <div>
              <h3 style={{ color: '#0f172a', fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 0.85rem' }}>
                Accuracy by Hazard Type
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {data.byHazardType.map(h => (
                  <HazardAccuracyBar key={h.hazardType} h={h} />
                ))}
              </div>
            </div>
          )}

          {/* Methodology note */}
          <div style={{
            marginTop: '1.75rem', padding: '1.25rem 1.5rem',
            background: '#ffffff', borderRadius: 12,
            border: '1px solid #e2e8f0', fontSize: '0.825rem', color: '#334155', lineHeight: 1.65,
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
          }}>
            <strong style={{ color: '#0f172a' }}>Accuracy methodology:</strong> A prediction is considered "correct" when
            the agent's risk probability ≥ 50% matches a confirmed disaster event, or &lt; 50% matches no event.
            Outcomes are recorded in the ForecastHistory table when an authorized officer confirms post-event observations.
          </div>
        </>
      )}
    </div>
  );
};

