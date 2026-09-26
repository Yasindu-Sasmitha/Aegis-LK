import React, { useEffect, useState, useCallback } from 'react';
import type { PredictionItem, District } from '../types/weatherTypes';
import { fetchPredictions, fetchDistricts, recordPredictionOutcome } from '../api/weatherApi';
import { useAuth } from '../../../shared/auth/AuthContext';

const HAZARD_COLOR: Record<string, string> = {
  Flood: '#1d4ed8',
  Landslide: '#b45309',
  StrongWind: '#6d28d9',
};
const HAZARD_ICON: Record<string, string> = {
  Flood: '🌊',
  Landslide: '⛰️',
  StrongWind: '💨',
};

export const PredictionHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const isOfficerOrAdmin = user?.role === 'DisasterOfficer' || user?.role === 'Admin';

  const [predictions, setPredictions] = useState<PredictionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Sorting state
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterHazard, setFilterHazard] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortOption, setSortOption] = useState('newest');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Outcome recording modal state
  const [selectedPrediction, setSelectedPrediction] = useState<PredictionItem | null>(null);
  const [actualDisasterOccurred, setActualDisasterOccurred] = useState<boolean>(true);
  const [actualValue, setActualValue] = useState<string>('');
  const [outcomeNotes, setOutcomeNotes] = useState<string>('');
  const [recordingSubmitting, setRecordingSubmitting] = useState<boolean>(false);
  const [outcomeError, setOutcomeError] = useState<string | null>(null);
  const [outcomeSuccessMessage, setOutcomeSuccessMessage] = useState<string | null>(null);

  const getSortParams = (opt: string): { sortBy: string; sortOrder: 'asc' | 'desc' } => {
    switch (opt) {
      case 'oldest':
        return { sortBy: 'createdAt', sortOrder: 'asc' };
      case 'highest_risk':
        return { sortBy: 'riskProbabilityPct', sortOrder: 'desc' };
      case 'lowest_risk':
        return { sortBy: 'riskProbabilityPct', sortOrder: 'asc' };
      case 'highest_confidence':
        return { sortBy: 'confidencePct', sortOrder: 'desc' };
      case 'lowest_confidence':
        return { sortBy: 'confidencePct', sortOrder: 'asc' };
      case 'hazard_asc':
        return { sortBy: 'hazardType', sortOrder: 'asc' };
      case 'newest':
      default:
        return { sortBy: 'createdAt', sortOrder: 'desc' };
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { sortBy, sortOrder } = getSortParams(sortOption);
      const data = await fetchPredictions({
        districtId: filterDistrict || undefined,
        hazardType: filterHazard || undefined,
        status: filterStatus || undefined,
        page,
        pageSize,
        sortBy,
        sortOrder,
      });
      setPredictions(data.items);
      setTotal(data.total);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filterDistrict, filterHazard, filterStatus, sortOption, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetchDistricts().then(setDistricts); }, []);

  const totalPages = Math.ceil(total / pageSize);

  const openOutcomeModal = (pred: PredictionItem) => {
    setSelectedPrediction(pred);
    setActualDisasterOccurred(pred.riskProbabilityPct >= 50);
    setActualValue(pred.forecastValue != null ? String(pred.forecastValue) : '');
    setOutcomeNotes('');
    setOutcomeError(null);
  };

  const closeOutcomeModal = () => {
    setSelectedPrediction(null);
    setOutcomeError(null);
  };

  const handleRecordOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrediction) return;

    setRecordingSubmitting(true);
    setOutcomeError(null);

    try {
      const valNum = actualValue.trim() !== '' ? parseFloat(actualValue) : undefined;
      await recordPredictionOutcome(selectedPrediction.id, {
        actualDisasterOccurred,
        actualValue: valNum,
        notes: outcomeNotes.trim() || undefined,
      });

      setOutcomeSuccessMessage(`Outcome recorded for prediction #${selectedPrediction.id.substring(0, 8)}`);
      closeOutcomeModal();
      await load();
      setTimeout(() => setOutcomeSuccessMessage(null), 4000);
    } catch (err: any) {
      setOutcomeError(err.message || 'Failed to record outcome.');
    } finally {
      setRecordingSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '0.5rem 0' }}>
      {/* Hero Header */}
      <div className="ae-hero-band">
        <div className="ae-eyebrow">WEATHER INTELLIGENCE &bull; PREDICTIONS &amp; AUDIT</div>
        <h2 className="ae-headline">📈 Prediction History</h2>
        <p style={{ color: '#b7c4ff', margin: '0.35rem 0 0', fontSize: '0.875rem' }}>
          Real AI model prediction logs, hazard thresholds, confidence metrics, and ground truth outcomes
        </p>
      </div>

      {outcomeSuccessMessage && (
        <div style={{
          padding: '0.85rem 1.25rem', background: '#ecfdf5',
          borderRadius: 10, border: '1px solid #a7f3d0',
          color: '#065f46', marginBottom: '1.25rem', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          <span>✅</span>
          <span>{outcomeSuccessMessage}</span>
        </div>
      )}

      {/* Filters and Sorting Bar */}
      <div style={{
        display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem',
        background: '#ffffff', borderRadius: 12, padding: '1rem 1.25rem',
        border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        alignItems: 'center'
      }}>
        <select
          value={filterDistrict}
          onChange={e => { setFilterDistrict(e.target.value); setPage(1); }}
          style={{
            padding: '0.5rem 0.85rem', borderRadius: 8,
            background: '#ffffff', color: '#0f172a',
            border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <option value="">All Districts</option>
          {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <select
          value={filterHazard}
          onChange={e => { setFilterHazard(e.target.value); setPage(1); }}
          style={{
            padding: '0.5rem 0.85rem', borderRadius: 8,
            background: '#ffffff', color: '#0f172a',
            border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <option value="">All Hazard Types</option>
          <option value="Flood">🌊 Flood</option>
          <option value="Landslide">⛰️ Landslide</option>
          <option value="StrongWind">💨 Strong Wind</option>
        </select>

        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          style={{
            padding: '0.5rem 0.85rem', borderRadius: 8,
            background: '#ffffff', color: '#0f172a',
            border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <option value="">All Statuses</option>
          <option value="Completed">Completed</option>
          <option value="Pending">Pending</option>
        </select>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.825rem', color: '#475569', fontWeight: 600 }}>Sort by:</span>
          <select
            value={sortOption}
            onChange={e => { setSortOption(e.target.value); setPage(1); }}
            style={{
              padding: '0.5rem 0.85rem', borderRadius: 8,
              background: '#ffffff', color: '#0f172a',
              border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest_risk">Highest Risk %</option>
            <option value="lowest_risk">Lowest Risk %</option>
            <option value="highest_confidence">Highest Confidence %</option>
            <option value="lowest_confidence">Lowest Confidence %</option>
            <option value="hazard_asc">Hazard Name (A-Z)</option>
          </select>
        </div>

        <button
          onClick={() => load()}
          style={{
            padding: '0.5rem 1rem', borderRadius: 8,
            background: '#2563eb', color: '#ffffff',
            border: 'none', cursor: 'pointer',
            fontSize: '0.85rem', fontWeight: 600,
            boxShadow: '0 1px 2px rgba(37,99,235,0.2)'
          }}
        >
          🔄 Refresh
        </button>

        <span style={{ marginLeft: 'auto', color: '#0f172a', fontSize: '0.85rem', fontWeight: 700 }}>
          {total} prediction{total !== 1 ? 's' : ''}
        </span>
      </div>

      {loading && (
        <div style={{
          textAlign: 'center', padding: '3rem',
          background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0',
          color: '#0f172a', fontWeight: 600, fontSize: '0.95rem'
        }}>
          ⏳ Loading predictions…
        </div>
      )}

      {error && (
        <div style={{
          padding: '1rem 1.25rem', background: '#fef2f2',
          borderRadius: 10, border: '1px solid #fecaca',
          color: '#991b1b', marginBottom: '1.25rem', fontWeight: 600
        }}>
          ⚠️ {error}
        </div>
      )}

      {!loading && predictions.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '3.5rem 2rem',
          background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0',
          color: '#334155'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>
            No Predictions Found
          </div>
          <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
            No predictions match the selected filters. Run a prediction on the Forecast tab first.
          </div>
        </div>
      )}

      {/* Predictions Table */}
      {predictions.length > 0 && (
        <div style={{
          background: '#ffffff', borderRadius: 12,
          border: '1px solid #e2e8f0', overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                {[
                  'Hazard',
                  'District',
                  'Risk Probability',
                  'Confidence',
                  'Forecast vs Threshold',
                  'Created At',
                  'Agent Run',
                  'Outcome Status',
                  ...(isOfficerOrAdmin ? ['Action'] : []),
                ].map(h => (
                  <th key={h} style={{ padding: '0.85rem 1.1rem', textAlign: 'left', color: '#0f172a', fontWeight: 700 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {predictions.map((p, i) => {
                const hColor = HAZARD_COLOR[p.hazardType] ?? '#1d4ed8';
                const hIcon = HAZARD_ICON[p.hazardType] ?? '⚡';

                const riskBadge = p.riskProbabilityPct >= 70
                  ? { bg: '#fee2e2', color: '#991b1b', border: '#fecaca', label: 'High' }
                  : p.riskProbabilityPct >= 40
                  ? { bg: '#fef3c7', color: '#92400e', border: '#fde68a', label: 'Moderate' }
                  : { bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0', label: 'Low' };

                const confBadge = p.confidencePct >= 70
                  ? { bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0' }
                  : { bg: '#fffbeb', color: '#b45309', border: '#fde68a' };

                return (
                  <tr key={p.id} style={{
                    borderBottom: '1px solid #e2e8f0',
                    background: i % 2 === 0 ? '#ffffff' : '#f8fafc'
                  }}>
                    {/* Hazard */}
                    <td style={{ padding: '0.85rem 1.1rem' }}>
                      <span style={{ color: hColor, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>{hIcon}</span>
                        <span>{p.hazardType}</span>
                      </span>
                    </td>

                    {/* District */}
                    <td style={{ padding: '0.85rem 1.1rem', color: '#0f172a', fontWeight: 600 }}>
                      📍 {p.districtName ?? '—'}
                    </td>

                    {/* Risk Probability */}
                    <td style={{ padding: '0.85rem 1.1rem' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700,
                        background: riskBadge.bg, color: riskBadge.color, border: `1px solid ${riskBadge.border}`
                      }}>
                        {p.riskProbabilityPct.toFixed(1)}% ({riskBadge.label})
                      </span>
                    </td>

                    {/* Confidence */}
                    <td style={{ padding: '0.85rem 1.1rem' }}>
                      <span style={{
                        padding: '3px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700,
                        background: confBadge.bg, color: confBadge.color, border: `1px solid ${confBadge.border}`
                      }}>
                        {p.confidencePct.toFixed(1)}% {p.confidencePct < 70 ? '⚠️' : '✓'}
                      </span>
                    </td>

                    {/* Forecast vs Threshold */}
                    <td style={{ padding: '0.85rem 1.1rem', color: '#334155', fontWeight: 600 }}>
                      <span style={{ color: p.forecastValue >= p.historicalThreshold ? '#dc2626' : '#0f172a' }}>
                        {p.forecastValue.toFixed(1)} {p.unit}
                      </span>
                      <span style={{ color: '#94a3b8', margin: '0 4px' }}>/</span>
                      <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                        {p.historicalThreshold.toFixed(1)} {p.unit}
                      </span>
                    </td>

                    {/* Created At */}
                    <td style={{ padding: '0.85rem 1.1rem', color: '#334155', fontWeight: 500, fontSize: '0.8rem' }}>
                      {new Date(p.createdAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>

                    {/* Agent Run ID */}
                    <td style={{ padding: '0.85rem 1.1rem' }}>
                      <code
                        title={p.agentRunId}
                        style={{
                          background: '#f1f5f9', padding: '2px 6px', borderRadius: 4,
                          fontSize: '0.72rem', color: '#475569', cursor: 'help'
                        }}
                      >
                        {p.agentRunId.substring(0, 8)}…
                      </code>
                    </td>

                    {/* Outcome Status */}
                    <td style={{ padding: '0.85rem 1.1rem' }}>
                      {p.hasOutcome ? (
                        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700,
                            background: p.actualDisasterOccurred ? '#fee2e2' : '#ecfdf5',
                            color: p.actualDisasterOccurred ? '#991b1b' : '#065f46',
                            border: `1px solid ${p.actualDisasterOccurred ? '#fecaca' : '#a7f3d0'}`,
                            display: 'inline-block'
                          }}>
                            {p.actualDisasterOccurred ? '🚨 Disaster Occurred' : '✅ No Disaster'}
                          </span>
                          {p.actualValue != null && (
                            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              Actual: {p.actualValue} {p.unit}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{
                          padding: '2px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600,
                          background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0'
                        }}>
                          Pending Ground Truth
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    {isOfficerOrAdmin && (
                      <td style={{ padding: '0.85rem 1.1rem' }}>
                        {!p.hasOutcome ? (
                          <button
                            onClick={() => openOutcomeModal(p)}
                            style={{
                              padding: '0.35rem 0.75rem', borderRadius: 6,
                              background: '#2563eb', color: '#ffffff',
                              border: 'none', cursor: 'pointer',
                              fontSize: '0.75rem', fontWeight: 600,
                              boxShadow: '0 1px 2px rgba(37,99,235,0.2)'
                            }}
                          >
                            ✍️ Confirm Outcome
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            Confirmed
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'center', marginTop: '1.5rem', alignItems: 'center' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '0.5rem 1rem', borderRadius: 8,
              background: '#ffffff', color: '#0f172a',
              border: '1px solid #cbd5e1', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.85rem',
              opacity: page === 1 ? 0.4 : 1
            }}
          >
            ‹ Prev
          </button>
          <span style={{ color: '#0f172a', fontSize: '0.85rem', fontWeight: 700, padding: '0 0.5rem' }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding: '0.5rem 1rem', borderRadius: 8,
              background: '#ffffff', color: '#0f172a',
              border: '1px solid #cbd5e1', cursor: 'pointer',
              fontWeight: 600, fontSize: '0.85rem',
              opacity: page === totalPages ? 0.4 : 1
            }}
          >
            Next ›
          </button>
        </div>
      )}

      {/* Outcome Confirmation Modal */}
      {selectedPrediction && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem',
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: 14,
            width: '100%', maxWidth: 520,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden', border: '1px solid #e2e8f0'
          }}>
            <div style={{
              background: '#0f172a', color: '#ffffff',
              padding: '1.1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                  Confirm Post-Event Outcome
                </h3>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                  Prediction ID: {selectedPrediction.id}
                </div>
              </div>
              <button
                onClick={closeOutcomeModal}
                style={{
                  background: 'transparent', border: 'none', color: '#94a3b8',
                  fontSize: '1.25rem', cursor: 'pointer', lineHeight: 1
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordOutcome} style={{ padding: '1.5rem' }}>
              {outcomeError && (
                <div style={{
                  padding: '0.75rem 1rem', background: '#fef2f2',
                  border: '1px solid #fecaca', borderRadius: 8,
                  color: '#991b1b', fontSize: '0.85rem', marginBottom: '1.25rem', fontWeight: 600
                }}>
                  ⚠️ {outcomeError}
                </div>
              )}

              {/* Prediction Context Summary */}
              <div style={{
                background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: 8,
                border: '1px solid #e2e8f0', marginBottom: '1.25rem', fontSize: '0.85rem'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>District: </span>
                    <strong style={{ color: '#0f172a' }}>{selectedPrediction.districtName ?? selectedPrediction.districtId}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Hazard: </span>
                    <strong style={{ color: HAZARD_COLOR[selectedPrediction.hazardType] ?? '#0f172a' }}>
                      {HAZARD_ICON[selectedPrediction.hazardType]} {selectedPrediction.hazardType}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Predicted Risk: </span>
                    <strong style={{ color: '#0f172a' }}>{selectedPrediction.riskProbabilityPct.toFixed(1)}%</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Forecast / Threshold: </span>
                    <strong style={{ color: '#0f172a' }}>
                      {selectedPrediction.forecastValue.toFixed(1)} / {selectedPrediction.historicalThreshold.toFixed(1)} {selectedPrediction.unit}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Actual Outcome Question */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 700, color: '#0f172a', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  Did the disaster hazard actually occur in this district? *
                </label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{
                    flex: 1, padding: '0.75rem 1rem', borderRadius: 8,
                    border: `2px solid ${actualDisasterOccurred ? '#ef4444' : '#e2e8f0'}`,
                    background: actualDisasterOccurred ? '#fef2f2' : '#ffffff',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    fontWeight: 700, color: actualDisasterOccurred ? '#991b1b' : '#334155'
                  }}>
                    <input
                      type="radio"
                      name="occurred"
                      checked={actualDisasterOccurred}
                      onChange={() => setActualDisasterOccurred(true)}
                    />
                    <span>🚨 Yes, Disaster Occurred</span>
                  </label>

                  <label style={{
                    flex: 1, padding: '0.75rem 1rem', borderRadius: 8,
                    border: `2px solid ${!actualDisasterOccurred ? '#10b981' : '#e2e8f0'}`,
                    background: !actualDisasterOccurred ? '#ecfdf5' : '#ffffff',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    fontWeight: 700, color: !actualDisasterOccurred ? '#065f46' : '#334155'
                  }}>
                    <input
                      type="radio"
                      name="occurred"
                      checked={!actualDisasterOccurred}
                      onChange={() => setActualDisasterOccurred(false)}
                    />
                    <span>✅ No Disaster Occurred</span>
                  </label>
                </div>
              </div>

              {/* Actual Measured Value */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 700, color: '#0f172a', fontSize: '0.875rem', marginBottom: '0.35rem' }}>
                  Actual Recorded Value ({selectedPrediction.unit}) (Optional)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={actualValue}
                  onChange={e => setActualValue(e.target.value)}
                  placeholder={`e.g. ${selectedPrediction.forecastValue.toFixed(1)}`}
                  style={{
                    width: '100%', padding: '0.65rem 0.85rem', borderRadius: 8,
                    border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box'
                  }}
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '3px', display: 'block' }}>
                  Measured ground truth (rain gauge mm or peak anemometer km/h).
                </span>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: 700, color: '#0f172a', fontSize: '0.875rem', marginBottom: '0.35rem' }}>
                  Confirmation Notes / Verification Source (Optional)
                </label>
                <textarea
                  rows={3}
                  value={outcomeNotes}
                  onChange={e => setOutcomeNotes(e.target.value)}
                  placeholder="e.g. Confirmed by District Disaster Management Coordinating Unit (DDMCU) report..."
                  style={{
                    width: '100%', padding: '0.65rem 0.85rem', borderRadius: 8,
                    border: '1px solid #cbd5e1', fontSize: '0.875rem', boxSizing: 'border-box',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={closeOutcomeModal}
                  disabled={recordingSubmitting}
                  style={{
                    padding: '0.65rem 1.25rem', borderRadius: 8,
                    background: '#ffffff', color: '#334155',
                    border: '1px solid #cbd5e1', cursor: 'pointer',
                    fontWeight: 600, fontSize: '0.875rem'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingSubmitting}
                  style={{
                    padding: '0.65rem 1.4rem', borderRadius: 8,
                    background: '#2563eb', color: '#ffffff',
                    border: 'none', cursor: 'pointer',
                    fontWeight: 700, fontSize: '0.875rem',
                    boxShadow: '0 2px 4px rgba(37,99,235,0.25)',
                    opacity: recordingSubmitting ? 0.6 : 1
                  }}
                >
                  {recordingSubmitting ? 'Recording…' : 'Save Ground Truth'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
