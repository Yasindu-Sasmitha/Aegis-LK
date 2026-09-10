import React, { useEffect, useState, useCallback } from 'react';
import type { District, ForecastResponse, PredictResponse, HazardResult } from '../types/weatherTypes';
import { fetchDistricts, fetchForecast, runPrediction } from '../api/weatherApi';

// ── Utility Helpers ───────────────────────────────────────────────────────────

const HAZARD_CONFIG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  Flood: { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', icon: '🌊', label: 'Flood Risk' },
  Landslide: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: '⛰️', label: 'Landslide Risk' },
  StrongWind: { color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', icon: '💨', label: 'Strong Wind' },
  'Strong Wind': { color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', icon: '💨', label: 'Strong Wind' },
};

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  Published: { color: '#10b981', label: '✅ Published' },
  PendingReview: { color: '#f59e0b', label: '⏳ Pending Review' },
  NoAlertNeeded: { color: '#6b7280', label: '✔ No Alert' },
  SkippedDuplicate: { color: '#6b7280', label: '⊘ Duplicate Skipped' },
};

function RiskBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${Math.min((value / max) * 100, 100)}%`,
        background: color, borderRadius: 6, transition: 'width 0.6s ease'
      }} />
    </div>
  );
}

function RainfallChart({ data, threshold }: { data: number[]; threshold: number | null }) {
  const max = Math.max(...data, threshold ?? 0, 1);
  const days = ['Day 1', 'Day 2', 'Day 3'];
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80 }}>
      {data.map((val, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{ color: '#94a3b8', fontSize: 10 }}>{val.toFixed(1)}</span>
          <div style={{
            width: '100%', height: `${(val / max) * 60}px`,
            background: val > (threshold ?? Infinity)
              ? 'linear-gradient(180deg,#ef4444,#dc2626)'
              : 'linear-gradient(180deg,#3b82f6,#1d4ed8)',
            borderRadius: '4px 4px 0 0', minHeight: 4, transition: 'height 0.4s ease'
          }} />
          <span style={{ color: '#64748b', fontSize: 10 }}>{days[i]}</span>
        </div>
      ))}
      {threshold !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 4 }}>
          <div style={{ width: 2, height: 60, background: '#ef4444', opacity: 0.6 }} />
          <span style={{ color: '#ef4444', fontSize: 9, whiteSpace: 'nowrap' }}>⚠ {threshold}mm</span>
        </div>
      )}
    </div>
  );
}

function WindChart({ data, threshold }: { data: number[]; threshold: number | null }) {
  const max = Math.max(...data, threshold ?? 0, 1);
  const days = ['Day 1', 'Day 2', 'Day 3'];
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80 }}>
      {data.map((val, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span style={{ color: '#94a3b8', fontSize: 10 }}>{val.toFixed(0)}</span>
          <div style={{
            width: '100%', height: `${(val / max) * 60}px`,
            background: val > (threshold ?? Infinity)
              ? 'linear-gradient(180deg,#a78bfa,#7c3aed)'
              : 'linear-gradient(180deg,#6ee7b7,#059669)',
            borderRadius: '4px 4px 0 0', minHeight: 4
          }} />
          <span style={{ color: '#64748b', fontSize: 10 }}>{days[i]}</span>
        </div>
      ))}
      {threshold !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 4 }}>
          <div style={{ width: 2, height: 60, background: '#a78bfa', opacity: 0.6 }} />
          <span style={{ color: '#a78bfa', fontSize: 9, whiteSpace: 'nowrap' }}>⚠ {threshold}km/h</span>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export const WeatherDashboardPage: React.FC = () => {
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [prediction, setPrediction] = useState<PredictResponse | null>(null);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchDistricts().then(setDistricts).catch(console.error);
  }, []);

  const loadForecast = useCallback(async (district: District) => {
    setSelectedDistrict(district);
    setForecast(null);
    setPrediction(null);
    setForecastError(null);
    setPredictionError(null);
    setLoadingForecast(true);
    try {
      const data = await fetchForecast(district.id);
      setForecast(data);
    } catch (e: any) {
      setForecastError(e.message);
    } finally {
      setLoadingForecast(false);
    }
  }, []);

  const handlePredict = async () => {
    if (!selectedDistrict) return;
    setPrediction(null);
    setPredictionError(null);
    setLoadingPrediction(true);
    try {
      const data = await runPrediction(selectedDistrict.id);
      setPrediction(data);
    } catch (e: any) {
      setPredictionError(e.message);
    } finally {
      setLoadingPrediction(false);
    }
  };

  const filtered = districts.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.province.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '1.5rem 2rem', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, color: '#f1f5f9', fontSize: '1.4rem', fontWeight: 700 }}>
          🌦️ Weather Intelligence Dashboard
        </h2>
        <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
          Live Open-Meteo forecast + AI hazard prediction per district
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem' }}>
        {/* District Panel */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍  Search district or province…"
              style={{
                width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#f1f5f9', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            {filtered.map(d => (
              <button
                key={d.id}
                onClick={() => loadForecast(d)}
                style={{
                  width: '100%', padding: '0.75rem 1rem', textAlign: 'left',
                  background: selectedDistrict?.id === d.id ? 'rgba(37,99,235,0.2)' : 'transparent',
                  border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)',
                  color: '#f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', transition: 'background 0.2s'
                }}
              >
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{d.name}</div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{d.province}</div>
                </div>
                {d.isLandslideProne && (
                  <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: 4, background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>
                    ⛰ Landslide
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Forecast + Prediction Panel */}
        <div>
          {!selectedDistrict && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300,
              background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.1)'
            }}>
              <div style={{ textAlign: 'center', color: '#475569' }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🗺️</div>
                <div>Select a district to view its live forecast</div>
              </div>
            </div>
          )}

          {selectedDistrict && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* District header */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(124,58,237,0.1))',
                border: '1px solid rgba(37,99,235,0.3)', borderRadius: 12, padding: '1rem 1.25rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: '1.1rem' }}>
                    📍 {selectedDistrict.name}
                  </h3>
                  <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{selectedDistrict.province} Province</span>
                  {selectedDistrict.isLandslideProne && (
                    <span style={{ marginLeft: 8, fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>
                      ⛰ Landslide-Prone
                    </span>
                  )}
                </div>
                <button
                  onClick={handlePredict}
                  disabled={loadingPrediction || loadingForecast || !forecast}
                  style={{
                    padding: '0.6rem 1.25rem', background: loadingPrediction ? '#374151' : 'linear-gradient(135deg,#2563eb,#7c3aed)',
                    color: '#fff', border: 'none', borderRadius: 8, cursor: loadingPrediction ? 'not-allowed' : 'pointer',
                    fontWeight: 600, fontSize: '0.85rem', transition: 'opacity 0.2s',
                    opacity: (!forecast || loadingPrediction) ? 0.6 : 1
                  }}
                >
                  {loadingPrediction ? '🤖 Analysing…' : '🤖 Run AI Prediction'}
                </button>
              </div>

              {/* Forecast Cards */}
              {loadingForecast && (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏳</div>
                  Fetching live forecast from Open-Meteo…
                </div>
              )}
              {forecastError && (
                <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                  ⚠️ {forecastError}
                </div>
              )}

              {forecast && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* Rainfall Card */}
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>🌧️</span>
                      <div>
                        <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.9rem' }}>3-Day Rainfall</div>
                        <div style={{ color: '#64748b', fontSize: '0.75rem' }}>mm per day</div>
                      </div>
                    </div>
                    <RainfallChart data={forecast.rainfallMmNext3Days} threshold={forecast.floodThresholdMm} />
                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
                      <span style={{ color: '#94a3b8' }}>
                        Total: <strong style={{ color: '#3b82f6' }}>{forecast.rainfallMmNext3Days.reduce((a, b) => a + b, 0).toFixed(1)} mm</strong>
                      </span>
                      {forecast.floodThresholdMm && (
                        <span style={{ color: '#94a3b8' }}>
                          Flood threshold: <strong style={{ color: '#ef4444' }}>{forecast.floodThresholdMm} mm</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Wind Card */}
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 12, padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>💨</span>
                      <div>
                        <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.9rem' }}>3-Day Wind Speed</div>
                        <div style={{ color: '#64748b', fontSize: '0.75rem' }}>km/h max per day</div>
                      </div>
                    </div>
                    <WindChart data={forecast.windSpeedKmhNext3Days} threshold={forecast.highWindThresholdKmh} />
                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
                      <span style={{ color: '#94a3b8' }}>
                        Peak: <strong style={{ color: '#a78bfa' }}>{Math.max(...forecast.windSpeedKmhNext3Days).toFixed(0)} km/h</strong>
                      </span>
                      {forecast.highWindThresholdKmh && (
                        <span style={{ color: '#94a3b8' }}>
                          Wind threshold: <strong style={{ color: '#a78bfa' }}>{forecast.highWindThresholdKmh} km/h</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Prediction Error */}
              {predictionError && (
                <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                  ⚠️ Agent error: {predictionError}
                </div>
              )}

              {/* Prediction Results */}
              {prediction && (
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                    🤖 Agent Run ID: <code style={{ color: '#a78bfa', fontSize: '0.75rem' }}>{prediction.agentRunId}</code>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                    {prediction.results.map((r: HazardResult, i: number) => {
                      const cfg = HAZARD_CONFIG[r.hazardType] ?? { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', icon: '⚡', label: r.hazardType };
                      const sCfg = STATUS_CONFIG[r.alertStatus] ?? { color: '#6b7280', label: r.alertStatus };
                      return (
                        <div key={i} style={{
                          background: cfg.bg, border: `1px solid ${cfg.color}40`,
                          borderRadius: 12, padding: '1rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '1.25rem' }}>{cfg.icon}</span>
                            <span style={{ fontSize: '0.7rem', color: sCfg.color }}>{sCfg.label}</span>
                          </div>
                          <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>{cfg.label}</div>
                          <div style={{ color: cfg.color, fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                            {r.riskProbabilityPct.toFixed(0)}<span style={{ fontSize: '0.85rem' }}>%</span>
                          </div>
                          <RiskBar value={r.riskProbabilityPct} color={cfg.color} />
                          <div style={{ color: '#64748b', fontSize: '0.7rem', marginTop: '0.35rem' }}>Risk probability</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
