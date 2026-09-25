import React, { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import { fetchIncidents } from '../api/incidentApi';
import { IncidentReport } from '../types/incidentTypes';

interface Props {
  onNavigate?: (tab: string) => void;
}

interface StatusCount {
  status: string;
  count: number;
  color: string;
  bg: string;
  icon: string;
}

const STATUS_ORDER = ['Reported', 'Assessed', 'OnHold', 'Rejected', 'MissionApproved', 'Closed'];

const STATUS_LINE_COLORS: Record<string, string> = {
  Reported: '#f59e0b',
  Assessed: '#8b5cf6',
  OnHold: '#eab308',
  Rejected: '#ef4444',
  MissionApproved: '#10b981',
  Closed: '#64748b',
};

// Lighter, gradient-friendly fills for the status bar chart (paired with a
// slightly darker top color via an SVG gradient, defined per-bar at render time).
const STATUS_BAR_COLORS: Record<string, { light: string; dark: string }> = {
  Reported: { light: '#fde68a', dark: '#f59e0b' },
  Assessed: { light: '#e2e8f0', dark: '#94a3b8' },
  OnHold: { light: '#fef08a', dark: '#eab308' },
  Rejected: { light: '#fecaca', dark: '#ef4444' },
  MissionApproved: { light: '#a7f3d0', dark: '#10b981' },
  Closed: { light: '#e2e8f0', dark: '#64748b' },
};

function formatDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Buckets each status separately by day across an arbitrary date range
// (inclusive), filling zero-count gaps so every line spans the same days.
function buildDailyTrendByStatus(
  incidents: IncidentReport[],
  startDate: Date,
  endDate: Date
): { label: string; date: string; counts: Record<string, number> }[] {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  const days: { label: string; date: string; counts: Record<string, number> }[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateKey = formatDateInput(d);
    const counts: Record<string, number> = {};
    STATUS_ORDER.forEach((s) => (counts[s] = 0));
    days.push({
      label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      date: dateKey,
      counts,
    });
  }

  const dayIndex: Record<string, number> = {};
  days.forEach((d, i) => (dayIndex[d.date] = i));

  for (const incident of incidents) {
    const key = new Date(incident.createdAt).toISOString().slice(0, 10);
    const idx = dayIndex[key];
    if (idx !== undefined && incident.status in days[idx].counts) {
      days[idx].counts[incident.status] += 1;
    }
  }

  return days;
}

// Converts a series of points into a smooth Catmull-Rom-to-Bezier path,
// giving rounded curves instead of sharp straight-line joins.
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return points.length === 1 ? `M ${points[0].x} ${points[0].y}` : '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export const IncidentDashboardPage: React.FC<Props> = ({ onNavigate }) => {
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [trendStart, setTrendStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 13);
    return formatDateInput(d);
  });
  const [trendEnd, setTrendEnd] = useState<string>(() => formatDateInput(new Date()));

  const [visibleStatuses, setVisibleStatuses] = useState<Set<string>>(new Set(STATUS_ORDER));

  const toggleStatus = (status: string) => {
    setVisibleStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        // keep at least one line visible
        if (next.size > 1) next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  const setQuickRange = (daysBack: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (daysBack - 1));
    setTrendStart(formatDateInput(start));
    setTrendEnd(formatDateInput(end));
  };

  useEffect(() => {
    // pageSize large enough to cover realistic totals for a dashboard summary;
    // for exact counts at scale this should move server-side, fine for now.
    fetchIncidents({ pageSize: 500 })
      .then((res) => {
        setIncidents(res.items);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load incidents for dashboard:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
        setLoading(false);
      });
  }, []);

  const countByStatus = (status: string) => incidents.filter((i) => i.status === status).length;
  const needsScreening = incidents.filter((i) => i.plausibilityScore === null && i.status === 'Reported').length;
  const highRiskUnscreened = incidents.filter((i) => i.plausibilityScore !== null && i.plausibilityScore < 40).length;
  const screened = incidents.filter((i) => i.plausibilityScore !== null).length;
  const avgPlausibility = (() => {
    const scored = incidents.filter((i) => i.plausibilityScore !== null);
    if (scored.length === 0) return null;
    return Math.round(scored.reduce((sum, i) => sum + (i.plausibilityScore ?? 0), 0) / scored.length);
  })();
  const maxCount = Math.max(1, ...STATUS_ORDER.map(countByStatus));

  const statusCounts: StatusCount[] = [
    { status: 'Reported', count: countByStatus('Reported'), color: '#92400e', bg: '#fef3c7', icon: '📥' },
    { status: 'Assessed', count: countByStatus('Assessed'), color: '#334155', bg: '#f1f5f9', icon: '🔍' },
    { status: 'OnHold', count: countByStatus('OnHold'), color: '#92400e', bg: '#fef3c7', icon: '⏸️' },
    { status: 'Rejected', count: countByStatus('Rejected'), color: '#991b1b', bg: '#fee2e2', icon: '🚫' },
    { status: 'MissionApproved', count: countByStatus('MissionApproved'), color: '#065f46', bg: '#d1fae5', icon: '✅' },
    { status: 'Closed', count: countByStatus('Closed'), color: '#334155', bg: '#f1f5f9', icon: '📁' },
  ];

  const handleExportPdf = () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Aegis-LK — Incident & Rescue Operations Report', 14, y);
      y += 6;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Generated ${new Date().toLocaleString()}`, 14, y);
      doc.setTextColor(0);
      y += 12;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Summary', 14, y);
      y += 6;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total incidents: ${incidents.length}`, 14, y);
      y += 5;
      STATUS_ORDER.forEach((s) => {
        doc.text(`  ${s}: ${countByStatus(s)}`, 14, y);
        y += 5;
      });
      y += 5;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Incident List', 14, y);
      y += 7;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      const headers = ['ID', 'Type', 'Status', 'Reported', 'Approved By'];
      const colX = [14, 55, 90, 120, 155];
      headers.forEach((h, i) => doc.text(h, colX[i], y));
      y += 5;
      doc.setLineWidth(0.2);
      doc.line(14, y - 3, pageWidth - 14, y - 3);
      doc.setFont('helvetica', 'normal');

      for (const incident of incidents) {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(incident.id.slice(0, 8), colX[0], y);
        doc.text(incident.disasterType.slice(0, 14), colX[1], y);
        doc.text(incident.status, colX[2], y);
        doc.text(new Date(incident.createdAt).toLocaleDateString(), colX[3], y);
        doc.text(
          incident.rescueMission ? incident.rescueMission.approvedByOfficerId.slice(0, 8) : '—',
          colX[4],
          y
        );
        y += 5;
      }

      doc.save(`aegis-lk-incident-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="ae-card">
        <p style={{ margin: 0, color: '#64748b' }}>Loading dashboard…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ae-card" style={{ borderLeft: '4px solid #ef4444' }}>
        <p style={{ margin: 0, color: '#b91c1c' }}>⚠️ {error}</p>
      </div>
    );
  }

  const start = new Date(trendStart);
  const end = new Date(trendEnd);
  const trend = buildDailyTrendByStatus(incidents, start, end);
  // Note: axis scale intentionally stays based on ALL statuses, not just visible
  // ones, so toggling lines on/off doesn't rescale the chart and shift remaining
  // lines around — makes comparisons stable as you toggle.
  const maxCountAcrossAll = Math.max(1, ...trend.flatMap((t) => STATUS_ORDER.map((s) => t.counts[s])));
  const chartWidth = 700;
  const chartHeight = 220;
  const paddingLeft = 40;
  const paddingBottom = 30;
  const paddingTop = 10;
  const paddingRight = 10;
  const plotWidth = chartWidth - paddingLeft - paddingRight;
  const plotHeight = chartHeight - paddingTop - paddingBottom;
  const stepX = plotWidth / (trend.length - 1 || 1);
  const yTickCount = 4;
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) =>
    Math.round((maxCountAcrossAll / yTickCount) * i)
  );
  const labelEvery = Math.max(1, Math.ceil(trend.length / 8));

  return (
    <div>
      {/* Hero summary */}
      <div
        style={{
          background: 'linear-gradient(135deg, #07162c 0%, #0c2242 100%)',
          borderRadius: 16,
          padding: '1.75rem 2rem',
          marginBottom: '1.5rem',
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', letterSpacing: '0.05em', color: '#93c5fd', fontWeight: 700, marginBottom: '0.35rem' }}>
              INCIDENT & RESCUE OPERATIONS
            </div>
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>
              {incidents.length} Total Incidents
            </h2>
            <p style={{ margin: '0.35rem 0 0', color: '#cbd5e1', fontSize: '0.875rem' }}>
              Screened by AI, triaged by officers, tracked end-to-end.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleExportPdf}
              disabled={exporting || incidents.length === 0}
              style={{
                padding: '0.7rem 1.4rem',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.25)',
                backgroundColor: exporting ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: exporting || incidents.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {exporting ? 'Generating…' : '⬇️ Download PDF Report'}
            </button>
            <button
              onClick={() => onNavigate?.('all')}
              style={{
                padding: '0.7rem 1.4rem',
                borderRadius: 10,
                border: 'none',
                backgroundColor: '#38bdf8',
                color: '#07162c',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              View All Incidents →
            </button>
          </div>
        </div>
      </div>

      {/* Attention callouts */}
      {(needsScreening > 0 || highRiskUnscreened > 0) && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {needsScreening > 0 && (
            <div className="ae-card" style={{ flex: 1, minWidth: 220, borderLeft: '4px solid #f59e0b' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#92400e', fontWeight: 700 }}>
                ⏳ {needsScreening} awaiting agent screening
              </p>
            </div>
          )}
          {highRiskUnscreened > 0 && (
            <div className="ae-card" style={{ flex: 1, minWidth: 220, borderLeft: '4px solid #ef4444' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#991b1b', fontWeight: 700 }}>
                ⚠️ {highRiskUnscreened} flagged low plausibility — needs officer review
              </p>
            </div>
          )}
        </div>
      )}

      {/* Quick stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="ae-card">
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>{screened}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Screened by AI</div>
        </div>
        <div className="ae-card">
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
            {avgPlausibility !== null ? `${avgPlausibility}/100` : '—'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Avg Plausibility</div>
        </div>
        <div className="ae-card">
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>{countByStatus('MissionApproved')}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Missions Approved</div>
        </div>
      </div>

      {/* Status breakdown grid (clickable, jumps to that status tab) */}
      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155', margin: '0 0 0.85rem' }}>
        By Status
      </h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {statusCounts.map((s) => (
          <div
            key={s.status}
            className="ae-card"
            onClick={() => onNavigate?.(s.status)}
            style={{ cursor: 'pointer', textAlign: 'center' }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>{s.icon}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{s.count}</div>
            <div
              style={{
                marginTop: '0.35rem',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: s.color,
                backgroundColor: s.bg,
                display: 'inline-block',
                padding: '2px 10px',
                borderRadius: 8,
              }}
            >
              {s.status}
            </div>
          </div>
        ))}
      </div>

      {/* Both charts side by side on wide screens via .ae-charts-grid */}
      <div className="ae-charts-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '1.5rem' }}>
        {/* Status breakdown bar chart */}
        <div className="ae-card">
          <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 700, color: '#334155' }}>
            Incidents by Status
          </h3>
          <svg width="100%" height={220} viewBox="0 0 600 220" style={{ overflow: 'visible' }}>
            <defs>
              {STATUS_ORDER.map((status) => (
                <linearGradient key={status} id={`bar-gradient-${status}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={STATUS_BAR_COLORS[status].dark} stopOpacity={0.85} />
                  <stop offset="100%" stopColor={STATUS_BAR_COLORS[status].light} stopOpacity={0.85} />
                </linearGradient>
              ))}
            </defs>
            {STATUS_ORDER.map((status, idx) => {
              const count = countByStatus(status);
              const barWidth = 70;
              const gap = 20;
              const x = idx * (barWidth + gap) + 20;
              const barHeight = (count / maxCount) * 150;
              const y = 170 - barHeight;
              return (
                <g key={status}>
                  <rect x={x} y={y} width={barWidth} height={barHeight} fill={`url(#bar-gradient-${status})`} rx={6} />
                  <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize="12" fontWeight="700" fill="#334155">
                    {count}
                  </text>
                  <text x={x + barWidth / 2} y={190} textAnchor="middle" fontSize="10" fill="#64748b">
                    {status}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Incident volume over time — one curve per status, with date-range controls */}
        <div className="ae-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#334155' }}>
              Incident Volume by Status
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => setQuickRange(14)} style={quickRangeButtonStyle}>Last 14 days</button>
              <button onClick={() => setQuickRange(30)} style={quickRangeButtonStyle}>Last month</button>
              <input
                type="date"
                value={trendStart}
                max={trendEnd}
                onChange={(e) => setTrendStart(e.target.value)}
                style={dateInputStyle}
              />
              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>to</span>
              <input
                type="date"
                value={trendEnd}
                min={trendStart}
                max={formatDateInput(new Date())}
                onChange={(e) => setTrendEnd(e.target.value)}
                style={dateInputStyle}
              />
            </div>
          </div>

          {/* Legend — click a status to toggle its line on/off */}
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {STATUS_ORDER.map((s) => {
              const active = visibleStatuses.has(s);
              return (
                <button
                  key={s}
                  onClick={() => toggleStatus(s)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.75rem',
                    color: active ? '#334155' : '#cbd5e1',
                    background: active ? '#f8fafc' : 'transparent',
                    border: '1px solid ' + (active ? '#e2e8f0' : '#f1f5f9'),
                    borderRadius: 20,
                    padding: '0.25rem 0.65rem',
                    cursor: 'pointer',
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%',
                    backgroundColor: active ? STATUS_LINE_COLORS[s] : '#e2e8f0',
                    display: 'inline-block',
                  }} />
                  {s}
                </button>
              );
            })}
          </div>

          <svg width="100%" height={chartHeight + 20} viewBox={`0 0 ${chartWidth} ${chartHeight + 20}`} style={{ overflow: 'visible' }}>
            {/* Y-axis gridlines + labels */}
            {yTicks.map((tick, i) => {
              const y = paddingTop + plotHeight - (tick / maxCountAcrossAll) * plotHeight;
              return (
                <g key={i}>
                  <line x1={paddingLeft} y1={y} x2={chartWidth - paddingRight} y2={y} stroke="#f1f5f9" strokeWidth={1} />
                  <text x={paddingLeft - 8} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{tick}</text>
                </g>
              );
            })}

            {/* Y-axis title */}
            <text
              x={12}
              y={paddingTop + plotHeight / 2}
              textAnchor="middle"
              fontSize="9"
              fill="#64748b"
              transform={`rotate(-90, 12, ${paddingTop + plotHeight / 2})`}
            >
              Incidents Reported
            </text>

            {/* One smooth line per status — only for toggled-on statuses */}
            {STATUS_ORDER.filter((s) => visibleStatuses.has(s)).map((status) => {
              const points = trend.map((t, i) => ({
                x: paddingLeft + i * stepX,
                y: paddingTop + plotHeight - (t.counts[status] / maxCountAcrossAll) * plotHeight,
              }));
              return (
                <path
                  key={status}
                  d={smoothPath(points)}
                  fill="none"
                  stroke={STATUS_LINE_COLORS[status]}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              );
            })}

            {/* X-axis labels */}
            {trend.map((t, i) => (
              i % labelEvery === 0 || i === trend.length - 1 ? (
                <text
                  key={i}
                  x={paddingLeft + i * stepX}
                  y={chartHeight}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#94a3b8"
                >
                  {t.label}
                </text>
              ) : null
            ))}

            {/* X-axis title */}
            <text x={paddingLeft + plotWidth / 2} y={chartHeight + 16} textAnchor="middle" fontSize="9" fill="#64748b">
              Date
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
};

const quickRangeButtonStyle: React.CSSProperties = {
  padding: '0.4rem 0.75rem',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  backgroundColor: '#ffffff',
  color: '#334155',
  fontSize: '0.75rem',
  fontWeight: 600,
  cursor: 'pointer',
};

const dateInputStyle: React.CSSProperties = {
  padding: '0.35rem 0.5rem',
  borderRadius: 6,
  border: '1px solid #cbd5e1',
  fontSize: '0.75rem',
  fontFamily: "'Plus Jakarta Sans', sans-serif",
};