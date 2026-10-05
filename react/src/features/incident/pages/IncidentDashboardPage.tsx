import React, { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
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
  // Recharts data: one row per day, one key per status.
  const trendData = trend.map((t) => ({ label: t.label, ...t.counts }));
  const statusChartData = STATUS_ORDER.map((status) => ({
    status,
    count: countByStatus(status),
    color: STATUS_LINE_COLORS[status],
  }));
  const donutData = statusChartData.filter((d) => d.count > 0);

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

      {/* Charts row — same card style as the Resource dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div style={chartCardStyle}>
          <div style={chartHeaderStyle}>
            <h3 style={chartTitleStyle}>Incidents by Status</h3>
            <span style={chartSubtitleStyle}>Count</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={statusChartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="status" fontSize={10} angle={-25} textAnchor="end" height={55} interval={0} />
              <YAxis fontSize={10} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name="Incidents" radius={[3, 3, 0, 0]}>
                {statusChartData.map((d) => (
                  <Cell key={d.status} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={chartCardStyle}>
          <div style={chartHeaderStyle}>
            <h3 style={chartTitleStyle}>Status Breakdown</h3>
            <span style={chartSubtitleStyle}>{incidents.length} total</span>
          </div>
          {donutData.length === 0 ? (
            <div style={{ color: '#64748b', padding: '1rem 0', textAlign: 'center', fontSize: '0.85rem' }}>
              No incidents yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={donutData} dataKey="count" nameKey="status" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {donutData.map((d) => (
                    <Cell key={d.status} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Incident volume over time — one line per status, with date-range controls */}
      <div style={chartCardStyle}>
        <div style={{ ...chartHeaderStyle, flexWrap: 'wrap', gap: '0.75rem' }}>
          <h3 style={chartTitleStyle}>Incident Volume by Status</h3>
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
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          {STATUS_ORDER.map((st) => {
            const active = visibleStatuses.has(st);
            return (
              <button
                key={st}
                onClick={() => toggleStatus(st)}
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
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: active ? STATUS_LINE_COLORS[st] : '#e2e8f0',
                    display: 'inline-block',
                  }}
                />
                {st}
              </button>
            );
          })}
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={trendData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" fontSize={10} interval="preserveStartEnd" />
            <YAxis fontSize={10} allowDecimals={false} />
            <Tooltip />
            {STATUS_ORDER.filter((st) => visibleStatuses.has(st)).map((st) => (
              <Line
                key={st}
                type="monotone"
                dataKey={st}
                name={st}
                stroke={STATUS_LINE_COLORS[st]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const chartCardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  boxShadow: '0 2px 8px rgba(15,23,42,0.05)',
  padding: '0.9rem',
};

const chartHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '0.6rem',
};

const chartTitleStyle: React.CSSProperties = { margin: 0, fontSize: '0.95rem', fontWeight: 800 };

const chartSubtitleStyle: React.CSSProperties = { color: '#64748b', fontSize: '0.7rem', fontWeight: 600 };

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