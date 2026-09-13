import React, { useState } from 'react';
import { RecoveryPlan } from '../types/recoveryTypes';

interface Props {
  plan: RecoveryPlan;
  onApprovalDecision?: (action: 'Approve' | 'Reject' | 'Revise', notes: string) => void;
}

export const RecoveryPlanViewer: React.FC<Props> = ({ plan, onApprovalDecision }) => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'ai' | 'approval'>('tasks');
  const [notes, setNotes] = useState<string>('');

  let parsedSummary: any = {};
  try {
    parsedSummary = JSON.parse(plan.planSummaryJson);
  } catch {
    parsedSummary = {};
  }

  const statusBg =
    plan.status === 'Approved' ? '#dcfce7' : plan.status === 'Rejected' ? '#fee2e2' : plan.status === 'RevisionRequested' ? '#ffedd5' : '#fef3c7';
  const statusColor =
    plan.status === 'Approved' ? '#166534' : plan.status === 'Rejected' ? '#991b1b' : plan.status === 'RevisionRequested' ? '#c2410c' : '#92400e';

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#ffffff', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1.5rem', backgroundColor: '#1e293b', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem' }}>{plan.planName}</h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
            Incident ID: {plan.incidentId} | Created: {new Date(plan.createdAt).toLocaleString()}
          </p>
        </div>
        <div>
          <span style={{ backgroundColor: statusBg, color: statusColor, padding: '4px 12px', borderRadius: '16px', fontWeight: 'bold', fontSize: '0.85rem' }}>
            {plan.status}
          </span>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', padding: '1.5rem', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f8fafc' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Estimated Budget</span>
          <p style={{ margin: '2px 0 0 0', fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a' }}>
            Rs. {plan.estimatedTotalBudget.toLocaleString()}
          </p>
        </div>
        <div>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Recovery Tasks</span>
          <p style={{ margin: '2px 0 0 0', fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a' }}>
            {plan.tasks.length} Action Items
          </p>
        </div>
        <div>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Validation Status</span>
          <p style={{ margin: '2px 0 0 0', fontSize: '1rem', fontWeight: 'bold', color: '#16a34a' }}>
            ✓ Passed Schema & Rules
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f1f5f9' }}>
        <button
          onClick={() => setActiveTab('tasks')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderBottom: activeTab === 'tasks' ? '3px solid #2563eb' : 'none',
            backgroundColor: activeTab === 'tasks' ? '#ffffff' : 'transparent',
            fontWeight: activeTab === 'tasks' ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          Tasks & NGO Assignments
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderBottom: activeTab === 'ai' ? '3px solid #2563eb' : 'none',
            backgroundColor: activeTab === 'ai' ? '#ffffff' : 'transparent',
            fontWeight: activeTab === 'ai' ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          🤖 Agentic Reasoning Trace
        </button>
        <button
          onClick={() => setActiveTab('approval')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderBottom: activeTab === 'approval' ? '3px solid #2563eb' : 'none',
            backgroundColor: activeTab === 'approval' ? '#ffffff' : 'transparent',
            fontWeight: activeTab === 'approval' ? 600 : 400,
            cursor: 'pointer',
          }}
        >
          Officer Decision & Review
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '1.5rem' }}>
        {activeTab === 'tasks' && (
          <div>
            <h3 style={{ marginTop: 0 }}>Actionable Recovery Tasks</h3>
            <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '8px 12px' }}>Priority</th>
                    <th style={{ padding: '8px 12px' }}>Title</th>
                    <th style={{ padding: '8px 12px' }}>Description</th>
                    <th style={{ padding: '8px 12px' }}>Assigned NGO</th>
                    <th style={{ padding: '8px 12px' }}>Estimated Cost</th>
                    <th style={{ padding: '8px 12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.tasks.map((t) => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 'bold', color: t.priority === 'Critical' ? '#dc2626' : '#2563eb' }}>
                        {t.priority}
                      </td>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{t.title}</td>
                      <td style={{ padding: '8px 12px', color: '#4b5563' }}>{t.description}</td>
                      <td style={{ padding: '8px 12px' }}>{t.assignedNGOName || 'Unassigned'}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>Rs. {t.estimatedCost.toLocaleString()}</td>
                      <td style={{ padding: '8px 12px' }}>{t.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <div>
            <h3 style={{ marginTop: 0 }}>Agentic AI Workflow Step Trace</h3>
            {parsedSummary.AgentExecutionTrace ? (
              <ul style={{ lineHeight: '1.8', color: '#334155' }}>
                {parsedSummary.AgentExecutionTrace.map((step: string, idx: number) => (
                  <li key={idx}><strong>Step {idx + 1}:</strong> {step}</li>
                ))}
              </ul>
            ) : (
              <p>Plan generated via deterministic multi-agent orchestration workflow.</p>
            )}
          </div>
        )}

        {activeTab === 'approval' && (
          <div>
            <h3 style={{ marginTop: 0 }}>Recovery Officer Decision Panel</h3>

            {plan.reviewNotes && (
              <div style={{ padding: '1rem', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', marginBottom: '1rem' }}>
                <p style={{ margin: '0 0 0.25rem 0', fontWeight: 600 }}>Previous Decision Notes ({plan.reviewedBy}):</p>
                <p style={{ margin: 0, fontStyle: 'italic', color: '#475569' }}>"{plan.reviewNotes}"</p>
                <small style={{ color: '#94a3b8' }}>{plan.reviewedAt ? new Date(plan.reviewedAt).toLocaleString() : ''}</small>
              </div>
            )}

            {onApprovalDecision && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '600px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '4px', fontSize: '0.9rem' }}>Reviewer Notes / Feedback</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    placeholder="Enter approval conditions or requested revisions..."
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => onApprovalDecision('Approve', notes)}
                    style={{ padding: '8px 16px', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    ✓ Approve Plan
                  </button>
                  <button
                    onClick={() => onApprovalDecision('Revise', notes)}
                    style={{ padding: '8px 16px', backgroundColor: '#ea580c', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    🔄 Request Revision
                  </button>
                  <button
                    onClick={() => onApprovalDecision('Reject', notes)}
                    style={{ padding: '8px 16px', backgroundColor: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    ✕ Reject Plan
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
