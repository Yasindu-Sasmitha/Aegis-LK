import React, { useEffect, useState } from 'react';
import { fetchShelters, fetchAidRequests, fetchDonations, fetchCompensations, fetchWorkflows } from '../api/recoveryApi';
import { Shelter, AidRequest, Donation, Compensation, WorkflowListItem } from '../types/recoveryTypes';

// Navigate by clicking the shared nav buttons in App.tsx (no prop needed)
const navigateTo = (tabLabel: string) => {
  const buttons = document.querySelectorAll<HTMLButtonElement>('nav button');
  for (const btn of buttons) {
    if (btn.textContent?.includes(tabLabel)) {
      btn.click();
      return;
    }
  }
};

export const RecoveryDashboardPage: React.FC = () => {
  const [stats, setStats] = useState({
    sheltersCount: 0,
    totalCapacity: 0,
    currentOccupancy: 0,
    aidRequestsCount: 0,
    pendingAid: 0,
    donationsCount: 0,
    totalDonatedFunds: 0,
    claimsCount: 0,
    pendingClaims: 0,
    activeWorkflowsCount: 0,
    loading: true,
  });

  const [sheltersList, setSheltersList] = useState<Shelter[]>([]);
  const [recentAid, setRecentAid] = useState<AidRequest[]>([]);
  const [recentWorkflows, setRecentWorkflows] = useState<WorkflowListItem[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [sheltersRes, aidRes, donationsRes, claimsRes, workflowsRes] = await Promise.all([
          fetchShelters(),
          fetchAidRequests(),
          fetchDonations(),
          fetchCompensations(),
          fetchWorkflows(),
        ]);

        const shelters: Shelter[] = Array.isArray(sheltersRes) ? sheltersRes : (sheltersRes as any).items || [];
        const aid: AidRequest[] = Array.isArray(aidRes) ? aidRes : (aidRes as any).items || [];
        const donations: Donation[] = Array.isArray(donationsRes) ? donationsRes : (donationsRes as any).items || [];
        const claims: Compensation[] = Array.isArray(claimsRes) ? claimsRes : (claimsRes as any).items || [];
        const workflows: WorkflowListItem[] = Array.isArray(workflowsRes) ? workflowsRes : (workflowsRes as any).items || [];

        const totalCap = shelters.reduce((sum: number, s: Shelter) => sum + (s.capacity || 0), 0);
        const occ = shelters.reduce((sum: number, s: Shelter) => sum + (s.currentOccupancy || 0), 0);
        const pendingAidCount = aid.filter((a: AidRequest) => a.status === 'Pending').length;
        const pendingClaimsCount = claims.filter((c: Compensation) => c.status === 'Submitted' || c.status === 'UnderReview').length;
        const totalDonations = donations
          .filter((d: Donation) => d.donationType === 'Monetary')
          .reduce((sum: number, d: Donation) => sum + (d.amountOrQuantity || 0), 0);

        setStats({
          sheltersCount: shelters.length,
          totalCapacity: totalCap,
          currentOccupancy: occ,
          aidRequestsCount: aid.length,
          pendingAid: pendingAidCount,
          donationsCount: donations.length,
          totalDonatedFunds: totalDonations,
          claimsCount: claims.length,
          pendingClaims: pendingClaimsCount,
          activeWorkflowsCount: workflows.length,
          loading: false,
        });

        setSheltersList(shelters.slice(0, 4));
        setRecentAid(aid.slice(0, 4));
        setRecentWorkflows(workflows.slice(0, 4));
      } catch {
        setStats((prev) => ({ ...prev, loading: false }));
      }
    }
    loadData();
  }, []);

  if (stats.loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
        <p style={{ fontWeight: 600 }}>Loading Recovery Operations Command Center...</p>
      </div>
    );
  }

  const occupancyPercent = stats.totalCapacity > 0 ? Math.round((stats.currentOccupancy / stats.totalCapacity) * 100) : 0;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#0f172a' }}>
      
      {/* ── TOP HERO BANNER ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '16px',
        padding: '2rem',
        color: '#ffffff',
        marginBottom: '2rem',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.15)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.75rem' }}>🏛️</span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Disaster Recovery & Community Support
            </h1>
            <span style={{ background: '#22c55e', color: '#ffffff', fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '20px', textTransform: 'uppercase' }}>
              Active Operations
            </span>
          </div>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem', maxWidth: '650px' }}>
            Islandwide real-time shelter network, emergency citizen relief applications, transparent community donations, and AI-orchestrated reconstruction strategies.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigateTo('AI Planning')}
            style={{
              padding: '0.75rem 1.25rem',
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
            }}
          >
            <span>🤖</span>
            <span>Launch AI Recovery Planner</span>
          </button>
          <button
            onClick={() => navigateTo('Shelters')}
            style={{
              padding: '0.75rem 1.25rem',
              background: 'rgba(255,255,255,0.1)',
              color: '#ffffff',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.2)',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            ⛺ Manage Shelters
          </button>
        </div>
      </div>

      {/* ── 4 KPI METRIC CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        
        {/* Metric 1: Shelters */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Emergency Shelters</span>
            <span style={{ fontSize: '1.25rem' }}>⛺</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#1e3a8a', margin: '0.25rem 0' }}>
            {stats.sheltersCount} Centers
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
            <span>Occupancy: {stats.currentOccupancy} / {stats.totalCapacity}</span>
            <strong style={{ color: occupancyPercent > 80 ? '#dc2626' : '#16a34a' }}>{occupancyPercent}%</strong>
          </div>
          <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', marginTop: '0.4rem', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(occupancyPercent, 100)}%`, height: '100%', background: occupancyPercent > 80 ? '#ef4444' : '#2563eb' }} />
          </div>
        </div>

        {/* Metric 2: Aid Requests */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Citizen Aid Demands</span>
            <span style={{ fontSize: '1.25rem' }}>🤝</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', margin: '0.25rem 0' }}>
            {stats.aidRequestsCount} Total
          </div>
          <div style={{ fontSize: '0.85rem', color: stats.pendingAid > 0 ? '#b45309' : '#16a34a', fontWeight: 600, marginTop: '0.5rem' }}>
            {stats.pendingAid} pending review & dispatch
          </div>
        </div>

        {/* Metric 3: Donations */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Community Relief Funds</span>
            <span style={{ fontSize: '1.25rem' }}>📦</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#15803d', margin: '0.25rem 0' }}>
            Rs. {stats.totalDonatedFunds.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
            Across {stats.donationsCount} registered public donations
          </div>
        </div>

        {/* Metric 4: Compensation */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Damage Compensations</span>
            <span style={{ fontSize: '1.25rem' }}>💳</span>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#7e22ce', margin: '0.25rem 0' }}>
            {stats.claimsCount} Claims
          </div>
          <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
            {stats.pendingClaims} claims under verification
          </div>
        </div>

      </div>

      {/* ── TWO-COLUMN DETAILED VIEWS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Left Card: Active Emergency Shelters */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>⛺ Emergency Shelter Network</h2>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Live occupancy & bed capacity tracking</p>
            </div>
            <button
              onClick={() => navigateTo('Shelters')}
              style={{ background: 'none', border: 'none', fontSize: '0.85rem', color: '#2563eb', fontWeight: 600, cursor: 'pointer' }}
            >
              View All Shelters →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {sheltersList.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '0.85rem' }}>No shelters registered yet.</p>
            ) : (
              sheltersList.map((s) => {
                const sPct = s.capacity > 0 ? Math.round((s.currentOccupancy / s.capacity) * 100) : 0;
                return (
                  <div key={s.id} style={{ padding: '0.85rem 1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{s.name}</strong>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px', background: s.status === 'Full' ? '#fee2e2' : '#dcfce7', color: s.status === 'Full' ? '#b91c1c' : '#15803d' }}>
                        {s.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem' }}>
                      📍 {s.location}, {s.district} • Contact: {s.contactPerson} ({s.contactPhone})
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#475569', marginBottom: '0.25rem' }}>
                      <span>Occupants: {s.currentOccupancy} / {s.capacity} beds</span>
                      <span>{sPct}% filled</span>
                    </div>
                    <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(sPct, 100)}%`, height: '100%', background: sPct >= 90 ? '#ef4444' : sPct >= 70 ? '#f59e0b' : '#10b981' }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Card: Recent AI Recovery Workflows */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>🤖 AI Autonomous Recovery Plans</h2>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>4-Agent generated strategies & officer approval status</p>
            </div>
            <button
              onClick={() => navigateTo('AI Planning')}
              style={{ background: 'none', border: 'none', fontSize: '0.85rem', color: '#2563eb', fontWeight: 600, cursor: 'pointer' }}
            >
              Open AI Planner →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {recentWorkflows.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', color: '#64748b', fontSize: '0.85rem' }}>
                No active recovery plans. Launch the AI planner to generate a master strategy.
              </div>
            ) : (
              recentWorkflows.map((wf) => (
                <div key={wf.id} style={{ padding: '0.85rem 1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', marginBottom: '0.2rem' }}>
                      {wf.planName}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Budget: <strong>LKR {wf.estimatedTotalBudget.toLocaleString()}</strong> • Created: {new Date(wf.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span style={{
                    padding: '0.25rem 0.6rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: wf.status === 'Approved' ? '#f0fdf4' : wf.status === 'PendingApproval' ? '#fef3c7' : '#fef2f2',
                    color: wf.status === 'Approved' ? '#16a34a' : wf.status === 'PendingApproval' ? '#b45309' : '#dc2626',
                  }}>
                    {wf.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ── QUICK ACTION FOOTER NAVIGATION ── */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
          Explore Recovery Module Workspaces:
        </span>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => navigateTo('AI Planning')} style={{ padding: '0.4rem 0.8rem', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', color: '#1e293b' }}>
            🤖 AI Planner
          </button>
          <button onClick={() => navigateTo('Shelters')} style={{ padding: '0.4rem 0.8rem', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', color: '#1e293b' }}>
            ⛺ Shelters
          </button>
          <button onClick={() => navigateTo('Aid')} style={{ padding: '0.4rem 0.8rem', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', color: '#1e293b' }}>
            🤝 Aid Applications
          </button>
          <button onClick={() => navigateTo('Donations')} style={{ padding: '0.4rem 0.8rem', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', color: '#1e293b' }}>
            📦 Donations
          </button>
          <button onClick={() => navigateTo('Compensation')} style={{ padding: '0.4rem 0.8rem', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', color: '#1e293b' }}>
            💳 Compensation
          </button>
          <button onClick={() => navigateTo('Reports')} style={{ padding: '0.4rem 0.8rem', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', color: '#1e293b' }}>
            📊 Audit Reports
          </button>
        </div>
      </div>

    </div>
  );
};
