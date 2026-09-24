import React, { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import { fetchIncidents } from '../api/incidentApi';
import { IncidentReport } from '../types/incidentTypes';

const STATUS_ORDER = ['Reported', 'Assessed', 'OnHold', 'Rejected', 'MissionApproved', 'Closed'];
const STATUS_COLORS: Record<string, string> = {
  Reported: '#f59e0b',
  Assessed: '#64748b',
  OnHold: '#f59e0b',
  Rejected: '#ef4444',
  MissionApproved: '#10b981',
  Closed: '#94a3b8',
};

export const IncidentReportPage: React.FC = () => {
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchIncidents({ pageSize: 500 })
      .then((res) => {
        setIncidents(res.items);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load report data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load report data');
        setLoading(false);
      });
  }, []);

  const total = incidents.length;
  const countByStatus = (s: string) => incidents.filter((i) => i.status === s).length;
  const maxCount = Math.max(1, ...STATUS_ORDER.map(countByStatus));
  const withDuplicates = incidents.filter((i) => i.linkedIncidentId !== null).length; // will be 0 today since primaries-only endpoint excludes duplicates
  const screened = incidents.filter((i) => i.plausibilityScore !== null).length;
  const avgPlausibility = (() => {
    const scored = incidents.filter((i) => i.plausibilityScore !== null);
    if (scored.length === 0) return null;
    return Math.round(scored.reduce((sum, i) => sum + (i.plausibilityScore ?? 0), 0) / scored.length);
  })();

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
      doc.text(`Total incidents: ${total}`, 14, y);
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
        <p style={{ margin: 0, color: '#64748b' }}>Loading report…</p>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>
            📈 Incident Reports
          </h2>
          <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.875rem' }}>
            Historical summary of the Incident & Rescue Operations module
          </p>
        </div>
        <button
          onClick={handleExportPdf}
          disabled={exporting || total === 0}
          style={{
            padding: '0.65rem 1.3rem',
            borderRadius: 8,
            border: 'none',
            backgroundColor: exporting ? '#f1f5f9' : '#0c2242',
            color: exporting ? '#94a3b8' : '#ffffff',
            fontSize: '0.875rem',
            fontWeight: 700,
            cursor: exporting || total === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          {exporting ? 'Generating…' : '⬇️ Download PDF Report'}
        </button>
      </div>

      {/* Summary stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="ae-card">
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>{total}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>Total Incidents</div>
        </div>
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

      {/* Status breakdown bar chart — plain SVG, no charting library needed */}
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
            return (
              <g key={status}>
                <rect x={x} y={y} width={barWidth} height={barHeight} fill={STATUS_COLORS[status]} rx={4} />
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
    </div>
  );
};