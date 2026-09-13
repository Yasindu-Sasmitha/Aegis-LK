import React, { useEffect, useState, useCallback } from 'react';
import type { District, ForecastResponse, PredictResponse, HazardResult } from '../types/weatherTypes';
import { fetchDistricts, fetchForecast, runPrediction } from '../api/weatherApi';

const HAZARD_CONFIG: Record<string, { color: string; bg: string; chip: string; icon: string; label: string }> = {
  Flood: { color: '#1d4ed8', bg: '#eff4ff', chip: 'ae-chip-moderate', icon: '🌊', label: 'Flood Risk' },
  Landslide: { color: '#d97706', bg: '#fffbeb', chip: 'ae-chip-moderate', icon: '⛰️', label: 'Landslide Risk' },
  StrongWind: { color: '#0369a1', bg: '#f0f9ff', chip: 'ae-chip-neutral', icon: '💨', label: 'Strong Wind' },
  'Strong Wind': { color: '#0369a1', bg: '#f0f9ff', chip: 'ae-chip-neutral', icon: '💨', label: 'Strong Wind' },
};

const STATUS_CONFIG: Record<string, { chip: string; label: string }> = {
  Published: { chip: 'ae-chip-safe', label: 'Published' },
  PendingReview: { chip: 'ae-chip-moderate', label: 'Pending Review' },
  NoAlertNeeded: { chip: 'ae-chip-neutral', label: 'No Alert' },
  SkippedDuplicate: { chip: 'ae-chip-neutral', label: 'Duplicate Skipped' },
};

function RiskBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ background: '#eceef0', borderRadius: 6, height: 8, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(value, 100)}%`, background: color, borderRadius: 6, transition: 'width 0.6s ease' }} />
    </div>
  );
}

function ForecastChart({ data, threshold, unit, barColor, overColor }: {
  data: number[]; threshold: number | null; unit: string; barColor: string; overColor: string;
}) {
  const max = Math.max(...data, threshold ?? 0, 1);
  const days = ['Day 1', 'Day 2', 'Day 3'];
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', height: 84 }}>
      {data.map((val, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <span className="ae-card-sub" style={{ fontSize: 10 }}>{val.toFixed(1)}{unit}</span>
          <div style={{
            width: '100%', height: `${(val / max) * 56}px`, minHeight: 4,
            background: threshold !== null && val > threshold ? overColor : barColor,
            borderRadius: '4px 4px 0 0', transition: 'height 0.4s ease',
          }} />
          <span className="ae-card-sub" style={{ fontSize: 10 }}>{days[i]}</span>
        </div>
      ))}
    </div>
  );
}

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
    <div className="ae-page">
      <div className="ae-hero-band">
        <div className="ae-eyebrow">WEATHER INTELLIGENCE</div>
        <h2 className="ae-headline">Forecast &amp; Live Hazard Risk</h2>
        <p style={{ color: '#b7c4ff', margin: '0.35rem 0 0', fontSize: '0.85rem' }}>
          Live Open-Meteo forecast, compared against seeded thresholds, assessed by the Weather Prediction Agent.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem' }}>
        {/* District panel */}
        <div className="ae-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--ae-surface-container)' }}>
            <input
              className="ae-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search district or province"
            />
          </div>
          <div style={{ maxHeight: 520, overflowY: 'auto' }}>
            {filtered.map(d => (
              <button
                key={d.id}
                className={`ae-list-row ${selectedDistrict?.id === d.id ? 'is-active' : ''}`}
                onClick={() => loadForecast(d)}
              >
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{d.name}</div>
                  <div className="ae-card-sub">{d.province}</div>
                </div>
                {d.isLandslideProne && <span className="ae-chip ae-chip-moderate">Landslide</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Forecast + prediction panel */}
        <div>
          {!selectedDistrict && (
            <div className="ae-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, borderStyle: 'dashed' }}>
              <div style={{ textAlign: 'center', color: 'var(--ae-on-surface-variant)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🗺️</div>
                <div>Select a district to view its live forecast</div>
              </div>
            </div>
          )}

          {selectedDistrict && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="ae-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 className="ae-card-title" style={{ fontSize: '1.1rem', margin: 0 }}>{selectedDistrict.name}</h3>
                  <span className="ae-card-sub">{selectedDistrict.province} Province</span>
                  {selectedDistrict.isLandslideProne && (
                    <span className="ae-chip ae-chip-moderate" style={{ marginLeft: 8 }}>Landslide-Prone</span>
                  )}
                </div>
                <button
                  className="ae-btn-primary"
                  onClick={handlePredict}
                  disabled={loadingPrediction || loadingForecast || !forecast}
                >
                  {loadingPrediction ? 'Analysing…' : 'Run AI Prediction'}
                </button>
              </div>

              {loadingForecast && (
                <div className="ae-card" style={{ textAlign: 'center', color: 'var(--ae-on-surface-variant)' }}>
                  Fetching live forecast from Open-Meteo…
                </div>
              )}
              {forecastError && (
                <div className="ae-card" style={{ background: 'var(--ae-error-bg)', borderColor: '#fecaca', color: '#b91c1c' }}>
                  {forecastError}
                </div>
              )}

              {forecast && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="ae-card">
                    <div className="ae-card-title">3-Day Rainfall</div>
                    <div className="ae-card-sub" style={{ marginBottom: '0.75rem' }}>mm per day</div>
                    <ForecastChart data={forecast.rainfallMmNext3Days} threshold={forecast.floodThresholdMm} unit="mm" barColor="#93c5fd" overColor="#1d4ed8" />
                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--ae-on-surface-variant)' }}>
                      <span>Total: <strong style={{ color: '#1d4ed8' }}>{forecast.rainfallMmNext3Days.reduce((a, b) => a + b, 0).toFixed(1)} mm</strong></span>
                      {forecast.floodThresholdMm && <span>Flood threshold: <strong style={{ color: '#dc2626' }}>{forecast.floodThresholdMm} mm</strong></span>}
                    </div>
                  </div>

                  <div className="ae-card">
                    <div className="ae-card-title">3-Day Wind Speed</div>
                    <div className="ae-card-sub" style={{ marginBottom: '0.75rem' }}>km/h max per day</div>
                    <ForecastChart data={forecast.windSpeedKmhNext3Days} threshold={forecast.highWindThresholdKmh} unit="" barColor="#7dd3fc" overColor="#0369a1" />
                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--ae-on-surface-variant)' }}>
                      <span>Peak: <strong style={{ color: '#0369a1' }}>{Math.max(...forecast.windSpeedKmhNext3Days).toFixed(0)} km/h</strong></span>
                      {forecast.highWindThresholdKmh && <span>Wind threshold: <strong style={{ color: '#0369a1' }}>{forecast.highWindThresholdKmh} km/h</strong></span>}
                    </div>
                  </div>
                </div>
              )}

              {predictionError && (
                <div className="ae-card" style={{ background: 'var(--ae-error-bg)', borderColor: '#fecaca', color: '#b91c1c' }}>
                  Agent error: {predictionError}
                </div>
              )}

              {prediction && (
                <div>
                  <div className="ae-card-sub" style={{ marginBottom: '0.5rem' }}>
                    Agent run: <code style={{ fontFamily: 'var(--ae-font-mono)', fontSize: '0.75rem' }}>{prediction.agentRunId}</code>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                    {prediction.results.map((r: HazardResult, i: number) => {
                      const cfg = HAZARD_CONFIG[r.hazardType] ?? { color: '#64748b', bg: '#f8fafc', chip: 'ae-chip-neutral', icon: '⚡', label: r.hazardType };
                      const sCfg = STATUS_CONFIG[r.alertStatus] ?? { chip: 'ae-chip-neutral', label: r.alertStatus };
                      return (
                        <div key={i} className="ae-card" style={{ background: cfg.bg }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '1.1rem' }}>{cfg.icon}</span>
                            <span className={`ae-chip ${sCfg.chip}`}>{sCfg.label}</span>
                          </div>
                          <div className="ae-card-title">{cfg.label}</div>
                          <div style={{ color: cfg.color, fontFamily: 'var(--ae-font-display)', fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0 0.5rem' }}>
                            {r.riskProbabilityPct.toFixed(0)}<span style={{ fontSize: '0.85rem' }}>%</span>
                          </div>
                          <RiskBar value={r.riskProbabilityPct} color={cfg.color} />
                          <div className="ae-card-sub" style={{ marginTop: '0.35rem' }}>Risk probability</div>
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