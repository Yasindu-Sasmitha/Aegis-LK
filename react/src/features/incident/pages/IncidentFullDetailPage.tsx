import React, { useEffect, useState, useCallback } from 'react';
import {
  fetchIncidentById,
  fetchReporterProfile,
  assessIncident,
  approveIncident,
  rejectIncident,
  holdIncident,
} from '../api/incidentApi';
import { IncidentReport, ReporterProfile } from '../types/incidentTypes';
import { useAuth } from '../../../shared/auth/AuthContext';
import { InfoHint } from '../components/InfoHint';

interface Props {
  incidentId: string;
  onBack?: () => void;
}

function statusChipClass(status: string): string {
  const map: Record<string, string> = {
    Reported: 'ae-chip-moderate',
    Assessed: 'ae-chip-neutral',
    OnHold: 'ae-chip-moderate',
    Rejected: 'ae-chip-high',
    MissionApproved: 'ae-chip-safe',
    Closed: 'ae-chip-neutral',
  };
  return map[status] ?? 'ae-chip-neutral';
}

function scoreChipClass(score: number | null, invert = false): string {
  if (score === null) return 'ae-chip-neutral';
  const high = invert ? score < 40 : score >= 70;
  const mid = score >= 40 && score < 70;
  if (high) return invert ? 'ae-chip-high' : 'ae-chip-safe';
  if (mid) return 'ae-chip-moderate';
  return invert ? 'ae-chip-safe' : 'ae-chip-high';
}

export const IncidentFullDetailPage: React.FC<Props> = ({ incidentId, onBack }) => {
  const { user } = useAuth();
  const isOfficerOrAdmin = user?.role === 'DisasterOfficer' || user?.role === 'Admin';

  const [incident, setIncident] = useState<IncidentReport | null>(null);
  const [reporter, setReporter] = useState<ReporterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [holdReason, setHoldReason] = useState('');
  const [showHoldForm, setShowHoldForm] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchIncidentById(incidentId)
      .then((data) => {
        setIncident(data);
        setLoading(false);
        return fetchReporterProfile(data.reportedByUserId).catch(() => null);
      })
      .then((profile) => {
        if (profile) setReporter(profile);
      })
      .catch((err) => {
        console.error('Failed to load incident:', err);
        setError(err instanceof Error ? err.message : 'Failed to load incident');
        setLoading(false);
      });
  }, [incidentId]);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = async (fn: () => Promise<IncidentReport>, key: string) => {
    setActionBusy(key);
    setActionError(null);
    try {
      const updated = await fn();
      setIncident(updated);
      setShowRejectForm(false);
      setShowHoldForm(false);
      setRejectReason('');
      setHoldReason('');
    } catch (err) {
      console.error(`Action ${key} failed:`, err);
      setActionError(err instanceof Error ? err.message : `Failed to ${key}`);
    } finally {
      setActionBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="ae-card">
        <p style={{ margin: 0, color: '#64748b' }}>Loading incident…</p>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="ae-card" style={{ borderLeft: '4px solid #ef4444' }}>
        <p style={{ margin: 0, color: '#b91c1c' }}>⚠️ {error ?? 'Incident not found'}</p>
      </div>
    );
  }

  const canAssess = isOfficerOrAdmin && incident.status === 'Reported';
  const canApproveOrTriage = isOfficerOrAdmin && ['Assessed', 'OnHold', 'Reported'].includes(incident.status);
  const isFinal = ['Rejected', 'MissionApproved', 'Closed'].includes(incident.status);

  const d = 0.01;
  const bbox = `${incident.longitude - d},${incident.latitude - d},${incident.longitude + d},${incident.latitude + d}`;
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${incident.latitude},${incident.longitude}`;

  return (
    <div>
      {onBack && (
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', marginBottom: '1rem', padding: 0 }}
        >
          ← Back to list
        </button>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* ── LEFT COLUMN: main info + map ── */}
        <div>
          <div className="ae-card" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
                  {incident.disasterType}
                </h2>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Reported {new Date(incident.createdAt).toLocaleString()}
                  {incident.updatedAt && ` · Updated ${new Date(incident.updatedAt).toLocaleString()}`}
                </p>
              </div>
              <span className={`ae-chip ${statusChipClass(incident.status)}`} style={{ fontSize: '0.8rem' }}>
                {incident.status}
              </span>
            </div>

            <p style={{ fontSize: '0.95rem', color: '#334155', lineHeight: 1.6, margin: '0 0 1rem' }}>
              {incident.description}
            </p>

            {incident.photoUrl ? (
              <img
                src={incident.photoUrl}
                alt="Incident photo"
                style={{ width: '100%', maxHeight: 360, objectFit: 'cover', borderRadius: 10, marginBottom: '1rem' }}
              />
            ) : (
              <div style={{
                width: '100%', height: 140, borderRadius: 10, marginBottom: '1rem',
                backgroundColor: '#f1f5f9', border: '1px dashed #cbd5e1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#94a3b8', fontSize: '0.85rem',
              }}>
                📷 No photo attached
              </div>
            )}

            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: '#94a3b8' }}>Severity reported: </span>
                <strong style={{ color: '#334155' }}>{incident.severityReported}</strong>
              </div>
              {incident.severityAssessed && (
                <div>
                  <span style={{ color: '#94a3b8' }}>Severity assessed: </span>
                  <strong style={{ color: '#334155' }}>{incident.severityAssessed}</strong>
                </div>
              )}
              {incident.rejectionReason && (
                <div>
                  <span style={{ color: '#94a3b8' }}>Rejection reason: </span>
                  <strong style={{ color: '#991b1b' }}>{incident.rejectionReason}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Map — bottom of left column */}
          <div className="ae-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '0.85rem 1rem 0.6rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>📍 Location</h3>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                {incident.latitude.toFixed(4)}, {incident.longitude.toFixed(4)}
              </p>
            </div>
            <iframe
              title="Incident location map"
              src={osmEmbedUrl}
              width="100%"
              height="320"
              frameBorder="0"
              loading="lazy"
              style={{ display: 'block', border: 0 }}
            />
            <div style={{ padding: '0.5rem 1rem' }}>
              <a
                href={`https://www.openstreetmap.org/?mlat=${incident.latitude}&mlon=${incident.longitude}#map=15/${incident.latitude}/${incident.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600, textDecoration: 'none' }}
              >
                View larger map →
              </a>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: reporter contact, agent cards, actions ── */}
        <div>
          <div className="ae-card" style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>
              📞 Reporter Contact
            </h3>
            {reporter ? (
              <>
                <p style={{ margin: '0 0 0.3rem', fontSize: '0.85rem', color: '#334155' }}>{reporter.fullName}</p>
                {reporter.phoneNumber ? (
                  <a href={`tel:${reporter.phoneNumber}`} style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 600 }}>
                    {reporter.phoneNumber}
                  </a>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>No phone number on file</p>
                )}
                {reporter.district && (
                  <p style={{ margin: '0.3rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>📍 {reporter.district}</p>
                )}
              </>
            ) : (
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>Reporter details unavailable</p>
            )}
          </div>

          {incident.rescueMission && (
            <div className="ae-card" style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>
                🚁 Rescue Mission
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                Teams required: <strong>{incident.rescueMission.teamsRequired}</strong>
              </p>
            </div>
          )}

          {/* ── Agent 1: Assessment ── */}
          <div className="ae-card" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center' }}>
                🔍 Assessment Agent
                <InfoHint text="Reads the report's disaster type, description and location, then estimates real-world severity and how many rescue teams are likely needed. Runs when an officer clicks 'Assess'." />
              </h3>
              {incident.severityAssessed && (
                <span className="ae-chip ae-chip-neutral">{incident.severityAssessed}</span>
              )}
            </div>
            {incident.severityAssessed ? (
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>
                Assessed severity: <strong>{incident.severityAssessed}</strong>
                {incident.rescueMission && <> · Teams required: <strong>{incident.rescueMission.teamsRequired}</strong></>}
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                Not yet assessed — click "Assess" below to run this agent.
              </p>
            )}
          </div>

          {/* ── Agent 2: Plausibility ── */}
          <div className="ae-card" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center' }}>
                🌦️ Plausibility Agent
                <InfoHint text="Checks real rainfall data for the district against what was reported, to flag reports that seem inconsistent with actual weather. A score, not a hoax detector — always a signal for officer attention, never a hard pass/fail." />
              </h3>
              <span className={`ae-chip ${scoreChipClass(incident.plausibilityScore)}`}>
                {incident.plausibilityScore !== null ? `${incident.plausibilityScore}/100` : 'Not screened'}
              </span>
            </div>
            {incident.plausibilityReasoning ? (
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: 1.6 }}>
                {incident.plausibilityReasoning}
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                Runs automatically in the background shortly after a report is created.
              </p>
            )}
          </div>

          {/* ── Agent 3: Dedup ── */}
          <div className="ae-card" style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center' }}>
                🧬 Dedup Agent
                <InfoHint text="Searches nearby recent reports to check if this is the same real-world event as one already logged, so officers don't triage the same disaster twice. If wrong, an officer can reverse it from the duplicates list." />
              </h3>
              {incident.linkedIncidentId && (
                <span className={`ae-chip ${scoreChipClass(incident.dedupConfidence, true)}`}>
                  {incident.dedupConfidence}% match
                </span>
              )}
            </div>
            {incident.linkedIncidentId ? (
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: 1.6 }}>
                {incident.dedupReasoning ?? 'Linked as a duplicate.'}
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                Not linked as a duplicate of any other report — treated as its own primary incident.
              </p>
            )}
          </div>

          {/* Officer actions — right column */}
          {isOfficerOrAdmin && !isFinal && (
            <div className="ae-card">
              <h3 style={{ margin: '0 0 0.85rem', fontSize: '0.95rem', fontWeight: 700, color: '#334155' }}>
                ⚡ Officer Actions
              </h3>

              {actionError && (
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: '#b91c1c' }}>⚠️ {actionError}</p>
              )}

              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                {canAssess && (
                  <button
                    onClick={() => runAction(() => assessIncident(incidentId).then(() => fetchIncidentById(incidentId)), 'assess')}
                    disabled={actionBusy !== null}
                    style={actionButtonStyle('#0c2242', '#ffffff', actionBusy === 'assess')}
                  >
                    {actionBusy === 'assess' ? 'Assessing…' : '🔍 Assess'}
                  </button>
                )}

                {canApproveOrTriage && user && (
                  <button
                    onClick={() => runAction(() => approveIncident(incidentId, { approvedByOfficerId: user.id }), 'approve')}
                    disabled={actionBusy !== null}
                    style={actionButtonStyle('#059669', '#ffffff', actionBusy === 'approve')}
                  >
                    {actionBusy === 'approve' ? 'Approving…' : '✅ Approve Mission'}
                  </button>
                )}

                {canApproveOrTriage && incident.status !== 'OnHold' && (
                  <button
                    onClick={() => setShowHoldForm((s) => !s)}
                    disabled={actionBusy !== null}
                    style={actionButtonStyle('#fef3c7', '#92400e', false)}
                  >
                    ⏸️ Hold
                  </button>
                )}

                {canApproveOrTriage && (
                  <button
                    onClick={() => setShowRejectForm((s) => !s)}
                    disabled={actionBusy !== null}
                    style={actionButtonStyle('#fee2e2', '#991b1b', false)}
                  >
                    🚫 Reject
                  </button>
                )}
              </div>

              {showHoldForm && (
                <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid #e2e8f0' }}>
                  <input type="text" placeholder="Reason (optional)" value={holdReason} onChange={(e) => setHoldReason(e.target.value)} style={inputStyle} />
                  <button
                    onClick={() => runAction(() => holdIncident(incidentId, { reason: holdReason || null }), 'hold')}
                    disabled={actionBusy !== null}
                    style={{ ...actionButtonStyle('#f59e0b', '#ffffff', actionBusy === 'hold'), marginTop: '0.5rem' }}
                  >
                    {actionBusy === 'hold' ? 'Placing on hold…' : 'Confirm Hold'}
                  </button>
                </div>
              )}

              {showRejectForm && (
                <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid #e2e8f0' }}>
                  <input type="text" placeholder="Reason (required)" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} style={inputStyle} />
                  <button
                    onClick={() => rejectReason.trim() && runAction(() => rejectIncident(incidentId, { reason: rejectReason }), 'reject')}
                    disabled={actionBusy !== null || !rejectReason.trim()}
                    style={{ ...actionButtonStyle('#ef4444', '#ffffff', actionBusy === 'reject' || !rejectReason.trim()), marginTop: '0.5rem' }}
                  >
                    {actionBusy === 'reject' ? 'Rejecting…' : 'Confirm Reject'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function actionButtonStyle(bg: string, color: string, disabled: boolean): React.CSSProperties {
  return {
    padding: '0.55rem 1.1rem',
    borderRadius: 8,
    border: 'none',
    backgroundColor: disabled ? '#f1f5f9' : bg,
    color: disabled ? '#94a3b8' : color,
    fontSize: '0.85rem',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.55rem 0.75rem',
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  fontSize: '0.85rem',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};