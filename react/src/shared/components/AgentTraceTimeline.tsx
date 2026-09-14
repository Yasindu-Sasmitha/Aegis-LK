import React from 'react';
import type { AgentStep } from '../../features/weather/types/weatherTypes';

const STEP_LABELS: Record<string, { icon: string; label: string }> = {
  assess_hazards: { icon: '🔍', label: 'Assessor Agent' },
  critique_assessment: { icon: '🛡️', label: 'Critic Agent' },
  validate_and_decide: { icon: '⚖️', label: 'Validation Gate' },
};

export const AgentTraceTimeline: React.FC<{ steps: AgentStep[] }> = ({ steps }) => (
  <div className="ae-card">
    <div className="ae-card-title" style={{ marginBottom: '0.75rem' }}>Agent Reasoning Trace</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {steps.map((s, i) => {
        const meta = STEP_LABELS[s.step] ?? { icon: '⚙️', label: s.step };
        return (
          <div key={i} style={{ display: 'flex', gap: '0.75rem', paddingBottom: i < steps.length - 1 ? '1rem' : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: s.status === 'success' ? '#ecfdf5' : '#fef2f2', fontSize: '0.9rem',
              }}>{meta.icon}</div>
              {i < steps.length - 1 && <div style={{ width: 2, flex: 1, background: 'var(--ae-surface-container)', marginTop: 4 }} />}
            </div>
            <div style={{ paddingBottom: '0.25rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
                <span className="ae-card-title" style={{ fontSize: '0.85rem' }}>{meta.label}</span>
                <span className="ae-card-sub" style={{ fontFamily: 'var(--ae-font-mono)', fontSize: '0.7rem' }}>{s.duration_ms}ms</span>
                <span className={`ae-chip ${s.status === 'success' ? 'ae-chip-safe' : 'ae-chip-high'}`}>{s.status}</span>
              </div>
              <div className="ae-card-sub" style={{ marginTop: '0.15rem' }}>{s.summary}</div>
              {s.error && <div style={{ color: '#b91c1c', fontSize: '0.75rem', marginTop: '0.15rem' }}>{s.error}</div>}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);