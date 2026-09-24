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

// Buckets incidents by day for the trend line, filling in zero-count gaps so
// the line doesn't skip days with no reports.
function buildDailyTrend(incidents: IncidentReport[], days: number): { label: string; count: number }[] {
  const buckets: Record<string, number> = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    buckets[d.toISOString().slice(0, 10)] = 0;
  }

  for (const incident of incidents) {
    const key = new Date(incident.createdAt).toISOString().slice(0, 10);
    if (key in buckets) buckets[key] += 1;
  }

  return Object.entries(buckets).map(([date, count]) => ({
    label: new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    count,
  }));
}

export const IncidentDashboardPage: React.FC<Props> = ({ onNavigate }) => {
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

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

      {/* Status breakdown bar chart */}
      <div className="ae-card">
        <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 700, color: '#334155' }}>
          Incidents by Status
        </h3>
        <svg width="100%" height={220} viewBox="0 0 600 220" style={{ overflow: 'visible' }}>
          {STATUS_ORDER.map((status, idx) => {
            const count = countByStatus(status);
            const barWidth = 70;
            const gap = 20;
            const x = idx * (barWidth + gap) + 20;
            const barHeight = (count / maxCount) * 150;
            const y = 170 - barHeight;
            const s = statusCounts.find((sc) => sc.status === status);
            return (
              <g key={status}>
                <rect x={x} y={y} width={barWidth} height={barHeight} fill={s?.color ?? '#94a3b8'} rx={4} />
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

      {/* Incident volume over time — line chart */}
      <div className="ae-card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', fontWeight: 700, color: '#334155' }}>
          Incident Volume — Last 14 Days
        </h3>
        {(() => {
          const trend = buildDailyTrend(incidents, 14);
          const maxTrend = Math.max(1, ...trend.map((t) => t.count));
          const chartWidth = 600;
          const chartHeight = 180;
          const padding = 30;
          const stepX = (chartWidth - padding * 2) / (trend.length - 1 || 1);

          const points = trend.map((t, i) => {
            const x = padding + i * stepX;
            const y = chartHeight - padding - (t.count / maxTrend) * (chartHeight - padding * 2);
            return { x, y, count: t.count, label: t.label };
          });

          const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
          const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`;

          return (
            <svg width="100%" height={chartHeight + 30} viewBox={`0 0 ${chartWidth} ${chartHeight + 30}`} style={{ overflow: 'visible' }}>
              <path d={areaPath} fill="#38bdf8" opacity={0.12} />
              <path d={linePath} fill="none" stroke="#38bdf8" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
              {points.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r={3} fill="#38bdf8" />
                  {(i === 0 || i === points.length - 1 || i % 3 === 0) && (
                    <text x={p.x} y={chartHeight + 20} textAnchor="middle" fontSize="9" fill="#94a3b8">
                      {p.label}
                    </text>
                  )}
                </g>
              ))}
            </svg>
          );
        })()}
      </div>
    </div>
  );
};