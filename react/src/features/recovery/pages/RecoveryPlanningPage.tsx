import React, { useState } from 'react';
import { generateRecoveryPlan, approveRecoveryPlan, fetchRecoveryPlan } from '../api/recoveryApi';
import { RecoveryPlanViewer } from '../components/RecoveryPlanViewer';
import { RecoveryPlan } from '../types/recoveryTypes';

export const RecoveryPlanningPage: React.FC = () => {
  const [incidentIdInput, setIncidentIdInput] = useState('3fa85f64-5717-4562-b3fc-2c963f66afa6');
  const [plan, setPlan] = useState<RecoveryPlan | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!incidentIdInput.trim()) return;
    setLoading(true);
    try {
      const result = await generateRecoveryPlan(incidentIdInput.trim());
      setPlan(result);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchExisting = async () => {
    if (!incidentIdInput.trim()) return;
    setLoading(true);
    try {
      const result = await fetchRecoveryPlan(incidentIdInput.trim());
      setPlan(result);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (action: 'Approve' | 'Reject' | 'Revise', notes: string) => {
    if (!plan) return;
    try {
      const updated = await approveRecoveryPlan(plan.id, action, notes, 'Recovery Officer');
      setPlan(updated);
      alert(`Plan successfully updated to status: ${updated.status}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 0.5rem 0' }}>🤖 Agentic Recovery Planning</h1>
      <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
        Run multi-agent AI recovery planning workflow based on Incident damage reports.
      </p>

      {/* Incident Input & Controls */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '2rem', padding: '1.25rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Target Incident GUID</label>
          <input
            type="text"
            value={incidentIdInput}
            onChange={(e) => setIncidentIdInput(e.target.value)}
            placeholder="e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6"
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{ padding: '10px 18px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: '1.25rem' }}
        >
          {loading ? 'Executing Agent Workflow...' : '🚀 Trigger Recovery Agent'}
        </button>
        <button
          onClick={handleFetchExisting}
          disabled={loading}
          style={{ padding: '10px 18px', backgroundColor: '#475569', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', marginTop: '1.25rem' }}
        >
          View Existing Plan
        </button>
      </div>

      {loading && <div style={{ padding: '2rem', textAlign: 'center' }}>⚙️ Multi-Agent Orchestration Workflow in Progress (Ingesting Damage Report → Prioritizing Repairs → Allocating Shelters → Estimating Budget → Matching NGOs → Schema Validation)...</div>}

      {plan && !loading && (
        <RecoveryPlanViewer plan={plan} onApprovalDecision={handleDecision} />
      )}
    </div>
  );
};
