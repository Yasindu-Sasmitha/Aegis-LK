import React, { useState, useEffect, useCallback } from 'react';
import {
  startWorkflowFromIntake,
  fetchWorkflows,
  fetchWorkflowTrace,
  submitWorkflowDecision,
} from '../api/recoveryApi';
import {
  RecoveryPlan,
  WorkflowTrace,
  WorkflowListItem,
  DamageIntakeFormData,
  InfrastructureItemInput,
  ToolCallDto,
} from '../types/recoveryTypes';
import { useAuth } from '../../../shared/auth/AuthContext';

const SRI_LANKA_DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
  'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
  'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
  'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
  'Monaragala', 'Ratnapura', 'Kegalle',
];

const DISASTER_TYPES = ['Flood', 'Landslide', 'Tsunami', 'Cyclone', 'Drought', 'Coastal Erosion'];
const DAMAGE_LEVELS = ['Destroyed', 'Severe', 'Moderate', 'Minor'];
const ASSET_TYPES = ['Bridge', 'Road', 'Water', 'Hospital', 'School', 'Power', 'Other'];

export const RecoveryPlanningPage: React.FC = () => {
  const { user } = useAuth();
  const isOfficer = user?.role === 'DisasterOfficer' || user?.role === 'Admin';

  const [activeTab, setActiveTab] = useState<'intake' | 'history'>('intake');

  // Intake Form State — All Fields Start Empty & Required
  const [district, setDistrict] = useState('');
  const [disasterType, setDisasterType] = useState('');
  const [housesDamaged, setHousesDamaged] = useState<number | ''>('');
  const [displacedFamilies, setDisplacedFamilies] = useState<number | ''>('');
  const [reportedBy, setReportedBy] = useState('');
  const [reporterContact, setReporterContact] = useState('');
  const [notes, setNotes] = useState('');
  const [infraItems, setInfraItems] = useState<InfrastructureItemInput[]>([]);

  // Asset Form Temp
  const [newAsset, setNewAsset] = useState<InfrastructureItemInput>({
    assetName: '',
    assetType: 'Road',
    damageLevel: 'Moderate',
    estimatedCost: 100000,
  });

  const resetForm = () => {
    setDistrict('');
    setDisasterType('');
    setHousesDamaged('');
    setDisplacedFamilies('');
    setReportedBy('');
    setReporterContact('');
    setNotes('');
    setInfraItems([]);
    setNewAsset({ assetName: '', assetType: 'Road', damageLevel: 'Moderate', estimatedCost: 100000 });
  };

  // Execution & Trace State
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [currentPlan, setCurrentPlan] = useState<RecoveryPlan | null>(null);
  const [workflowTrace, setWorkflowTrace] = useState<WorkflowTrace | null>(null);
  const [traceTab, setTraceTab] = useState<'agents' | 'tasks' | 'tools' | 'guardrails'>('agents');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Revision Modal State
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionGuidance, setRevisionGuidance] = useState('');

  // Workflow History List State
  const [workflowList, setWorkflowList] = useState<WorkflowListItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [inspectingHistoryPlan, setInspectingHistoryPlan] = useState<boolean>(false);

  const loadWorkflowHistory = useCallback(async () => {
    try {
      const data = await fetchWorkflows(filterStatus === 'all' ? undefined : filterStatus);
      setWorkflowList(data.items || []);
    } catch {
      // ignore
    }
  }, [filterStatus]);

  useEffect(() => {
    loadWorkflowHistory();
  }, [loadWorkflowHistory]);

  // Launch Multi-Agent Workflow with Comprehensive Form Validation
  const handleStartIntakeWorkflow = async () => {
    setErrorMessage(null);

    // 1. District validation
    if (!district.trim()) {
      setErrorMessage('Please select the affected Sri Lankan District.');
      return;
    }

    // 2. Disaster type validation
    if (!disasterType.trim()) {
      setErrorMessage('Please select the Disaster Type.');
      return;
    }

    // 3. Houses damaged validation (required field)
    if (housesDamaged === '' || Number(housesDamaged) < 0) {
      setErrorMessage('Please enter the number of Houses Damaged / Destroyed (cannot be empty or negative).');
      return;
    }

    // 4. Displaced families count validation (required field)
    if (displacedFamilies === '' || Number(displacedFamilies) < 0) {
      setErrorMessage('Please enter the Displaced Families Count (cannot be empty or negative).');
      return;
    }

    // 5. Check if at least some damage/impact is reported
    if (Number(housesDamaged) === 0 && Number(displacedFamilies) === 0 && infraItems.length === 0) {
      setErrorMessage('Please provide non-zero damage impact: enter affected houses, displaced families, or add damaged infrastructure.');
      return;
    }

    // 6. Situation Notes validation (required field)
    if (!notes.trim() || notes.trim().length < 10) {
      setErrorMessage('Please provide Disaster Situation & Field Notes (minimum 10 characters describing the situation).');
      return;
    }

    // 7. Reporter Name validation (required field)
    if (!reportedBy.trim()) {
      setErrorMessage('Please enter the Reporting Officer / Organization Name.');
      return;
    }

    // 8. Contact phone validation (required field)
    const cleanContact = reporterContact.trim();
    if (!cleanContact || cleanContact.replace(/[^0-9+]/g, '').length < 9) {
      setErrorMessage('Please provide a valid Emergency Contact Phone Number (at least 9–10 digits, e.g. 0771234567 or +94112345670).');
      return;
    }

    // 9. Infrastructure assets validation (required field)
    if (infraItems.length === 0) {
      setErrorMessage('Please add at least 1 Damaged Public Infrastructure asset using the form below before executing the AI recovery engine.');
      return;
    }

    setLoading(true);
    setCurrentPlan(null);
    setWorkflowTrace(null);
    setInspectingHistoryPlan(false);
    setCurrentStep(1);

    const stepTimer = setInterval(() => {
      setCurrentStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 600);

    try {
      const intakeData: DamageIntakeFormData = {
        district,
        disasterType,
        housesDamaged: Number(housesDamaged) || 0,
        displacedFamilies: Number(displacedFamilies) || 0,
        reporterName: reportedBy.trim(),
        reporterContact: cleanContact,
        additionalNotes: notes.trim(),
        infrastructureDamage: infraItems,
      };

      const plan = await startWorkflowFromIntake(intakeData);
      clearInterval(stepTimer);
      setCurrentStep(4);
      setCurrentPlan(plan);

      if (plan.workflowTrace) {
        setWorkflowTrace(plan.workflowTrace);
      } else {
        const trace = await fetchWorkflowTrace(plan.id);
        setWorkflowTrace(trace);
      }
      resetForm();
      loadWorkflowHistory();
    } catch (err: any) {
      clearInterval(stepTimer);
      setErrorMessage(err.message || 'Failed to generate recovery plan.');
    } finally {
      setLoading(false);
    }
  };

  // Inspect specific workflow from History list
  const handleSelectWorkflow = async (planId: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const trace = await fetchWorkflowTrace(planId);
      setWorkflowTrace(trace);

      const matched = workflowList.find((w) => w.id === planId);
      if (matched) {
        setCurrentPlan({
          id: matched.id,
          incidentId: '00000000-0000-0000-0000-000000000000',
          planName: matched.planName,
          status: matched.status as any,
          estimatedTotalBudget: matched.estimatedTotalBudget,
          planSummaryJson: '',
          revisionCount: matched.revisionCount || 0,
          tasks: [],
          createdAt: matched.createdAt,
        });
      }
      setInspectingHistoryPlan(true);
      setActiveTab('history');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load workflow trace.');
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (action: 'Approve' | 'Reject' | 'Revise') => {
    if (!currentPlan) return;
    if (!isOfficer) {
      setErrorMessage('Unauthorized: Only Disaster Officers or System Administrators can approve, reject, or request revisions on recovery master plans.');
      return;
    }
    setLoading(true);
    try {
      const reviewerNotes = action === 'Revise' ? revisionGuidance : undefined;
      const updated = await submitWorkflowDecision(currentPlan.id, action, reviewerNotes, user?.fullName || 'DMC Officer');
      setCurrentPlan(updated);
      setShowRevisionModal(false);
      setRevisionGuidance('');
      const trace = await fetchWorkflowTrace(currentPlan.id);
      setWorkflowTrace(trace);
      loadWorkflowHistory();
    } catch (err: any) {
      setErrorMessage(err.message || `Failed to ${action} plan.`);
    } finally {
      setLoading(false);
    }
  };

  const addInfraItem = () => {
    if (!newAsset.assetName.trim()) {
      alert('Please enter an infrastructure asset or facility name (e.g. Kalu Ganga Bridge).');
      return;
    }
    if (!newAsset.estimatedCost || newAsset.estimatedCost <= 0) {
      alert('Please enter a valid estimated repair cost greater than LKR 0.');
      return;
    }
    setInfraItems([...infraItems, { ...newAsset, assetName: newAsset.assetName.trim() }]);
    setNewAsset({ assetName: '', assetType: 'Road', damageLevel: 'Moderate', estimatedCost: 100000 });
  };

  const removeInfraItem = (index: number) => {
    setInfraItems(infraItems.filter((_, i) => i !== index));
  };

  // ── USER-FRIENDLY FORMATTER FOR ALLOW-LISTED TOOL ACTIVITY ──
  const renderToolCard = (tool: ToolCallDto, idx: number) => {
    let parsedInput: any = {};
    let parsedOutput: any = {};
    try { parsedInput = JSON.parse(tool.inputJson); } catch {}
    try { parsedOutput = JSON.parse(tool.outputJson); } catch {}

    const toolMeta: Record<string, { title: string; icon: string; bg: string; color: string; desc: string }> = {
      tool_query_shelter_capacity: {
        title: 'Emergency Evacuation Shelter Capacity Query',
        icon: '⛺',
        bg: '#eff6ff',
        color: '#1d4ed8',
        desc: 'Scanned official shelter registry for active centers with open bed capacity in the affected district.',
      },
      tool_match_ngo_by_sector: {
        title: 'Registered NGO Partner Capability Matcher',
        icon: '🤝',
        bg: '#f0fdf4',
        color: '#15803d',
        desc: 'Filtered accredited humanitarian partner organizations by sector expertise and operational districts.',
      },
      tool_calculate_cash_stipend_budget: {
        title: 'Emergency Citizen Subsistence Cash Calculator',
        icon: '💳',
        bg: '#faf5ff',
        color: '#7e22ce',
        desc: 'Calculated statutory emergency living stipends based on displaced family count and relief duration.',
      },
    };

    const meta = toolMeta[tool.toolName] || {
      title: tool.toolName.replace(/_/g, ' ').toUpperCase(),
      icon: '🛠️',
      bg: '#f8fafc',
      color: '#334155',
      desc: 'Deterministic system calculation and allow-listed database query.',
    };

    return (
      <div key={idx} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
        {/* Tool Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.4rem' }}>{meta.icon}</span>
            <div>
              <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block' }}>{meta.title}</strong>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{meta.desc}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '6px', background: meta.bg, color: meta.color }}>
              ✓ Verified Allow-Listed
            </span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>⏱️ {tool.durationMs}ms</span>
          </div>
        </div>

        {/* Structured High-Usability Output */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginTop: '0.75rem' }}>
          {/* Specific Tool 1: Shelter Query */}
          {tool.toolName === 'tool_query_shelter_capacity' && (
            <div>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                <div>Target District: <strong style={{ color: '#1e40af' }}>{parsedInput.district || district}</strong></div>
                <div>Required Capacity: <strong style={{ color: '#1e40af' }}>{parsedInput.requiredBeds || 0} Beds</strong></div>
              </div>
              {Array.isArray(parsedOutput.availableShelters) && parsedOutput.availableShelters.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.5rem' }}>
                  {parsedOutput.availableShelters.map((s: any, sIdx: number) => (
                    <div key={sIdx} style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                      <strong style={{ color: '#0f172a', display: 'block' }}>⛺ {s.name}</strong>
                      <span style={{ color: '#64748b' }}>{s.location} • Available Beds: </span>
                      <strong style={{ color: '#16a34a' }}>{s.remainingCapacity}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Active shelters matched with open bed capacity.</span>
              )}
            </div>
          )}

          {/* Specific Tool 2: NGO Matching */}
          {tool.toolName === 'tool_match_ngo_by_sector' && (
            <div>
              <div style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                Operational Region: <strong style={{ color: '#15803d' }}>{parsedInput.district || district}</strong>
              </div>
              {Array.isArray(parsedOutput.qualifiedNGOs) && parsedOutput.qualifiedNGOs.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.5rem' }}>
                  {parsedOutput.qualifiedNGOs.map((ngo: any, nIdx: number) => (
                    <div key={nIdx} style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                      <strong style={{ color: '#0f172a', display: 'block' }}>🏢 {ngo.name}</strong>
                      <span style={{ color: '#64748b' }}>Sectors: {ngo.sectors}</span>
                      <div style={{ marginTop: '0.2rem', color: '#15803d', fontWeight: 700 }}>
                        Capacity Grant: LKR {Number(ngo.availableBudget || 0).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Verified accredited humanitarian partner organizations matched.</span>
              )}
            </div>
          )}

          {/* Specific Tool 3: Cash Stipend Calculator */}
          {tool.toolName === 'tool_calculate_cash_stipend_budget' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div>Displaced Families: <strong>{parsedInput.displacedFamilies || 0}</strong></div>
                <div>Relief Window: <strong>{parsedInput.reliefDays || 30} Days</strong></div>
                <div>Daily Subsistence Rate: <strong>Rs. {parsedOutput.dailyStipendPerFamily || 1500} / family</strong></div>
                <div>Calculated Total Stipend: <strong style={{ color: '#7e22ce', fontSize: '1rem' }}>Rs. {Number(parsedOutput.totalStipendBudget || 0).toLocaleString()}</strong></div>
              </div>
            </div>
          )}

          {/* Generic Tool fallback */}
          {tool.toolName !== 'tool_query_shelter_capacity' &&
           tool.toolName !== 'tool_match_ngo_by_sector' &&
           tool.toolName !== 'tool_calculate_cash_stipend_budget' && (
            <div style={{ fontSize: '0.85rem', color: '#334155' }}>
              <strong>Execution Output:</strong> {typeof parsedOutput === 'object' ? JSON.stringify(parsedOutput) : tool.outputJson}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── RENDER PLAN & TRACE SECTION ──
  const renderPlanAndTraceSection = () => {
    if (!workflowTrace) return null;
    return (
      <div style={{ marginTop: '2.5rem' }}>
        {/* Top Banner with Decision Actions & Metadata */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.75rem 2rem', marginBottom: '1.5rem', boxShadow: '0 4px 16px -2px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  {currentPlan?.planName || 'Autonomous Master Recovery Strategy'}
                </h2>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  background: workflowTrace.executionStatus === 'Approved' ? '#dcfce7' : workflowTrace.executionStatus === 'PendingApproval' ? '#fef3c7' : '#fee2e2',
                  color: workflowTrace.executionStatus === 'Approved' ? '#15803d' : workflowTrace.executionStatus === 'PendingApproval' ? '#b45309' : '#b91c1c',
                }}>
                  ● {workflowTrace.executionStatus}
                </span>
              </div>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                {workflowTrace.executionSummary}
              </p>
            </div>

            {/* Human-in-the-Loop Action Buttons — Restricted to Disaster Officers & Admins */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {isOfficer ? (
                <>
                  <button
                    onClick={() => handleDecision('Approve')}
                    disabled={loading}
                    style={{ padding: '0.6rem 1.2rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    ✓ Approve Plan
                  </button>
                  <button
                    onClick={() => setShowRevisionModal(true)}
                    disabled={loading}
                    style={{ padding: '0.6rem 1.2rem', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    🔄 Request Revision
                  </button>
                  <button
                    onClick={() => handleDecision('Reject')}
                    disabled={loading}
                    style={{ padding: '0.6rem 1.2rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    ✕ Reject
                  </button>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                  <span>🔒</span>
                  <span>View-Only (Approval requires Officer or Admin)</span>
                </div>
              )}
              {inspectingHistoryPlan && (
                <button
                  onClick={() => setInspectingHistoryPlan(false)}
                  style={{ padding: '0.6rem 1rem', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
                >
                  ← Back to Ledger
                </button>
              )}
            </div>
          </div>

          {/* KPI Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Total Budget</span>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#1e3a8a' }}>
                Rs. {(currentPlan?.estimatedTotalBudget || (currentPlan?.tasks?.reduce((sum, t) => sum + t.estimatedCost, 0) ?? 0)).toLocaleString()}
              </p>
            </div>
            <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Actionable Tasks</span>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                {currentPlan?.tasks?.length ?? 0} tasks
              </p>
            </div>
            <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Tool Executions</span>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>
                {workflowTrace.toolCalls?.length ?? 0} calls
              </p>
            </div>
            <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Agentic Latency</span>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#7c3aed' }}>
                {workflowTrace.totalDurationMs} ms
              </p>
            </div>
          </div>
        </div>

        {/* Trace Sub-Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
          <button
            onClick={() => setTraceTab('agents')}
            style={{ padding: '0.5rem 1rem', border: 'none', background: 'none', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', color: traceTab === 'agents' ? '#2563eb' : '#64748b', borderBottom: traceTab === 'agents' ? '2px solid #2563eb' : 'none', marginBottom: '-0.5rem' }}
          >
            🤖 4-Agent Reasoning Timeline ({workflowTrace.agentSteps?.length ?? 0})
          </button>
          <button
            onClick={() => setTraceTab('tasks')}
            style={{ padding: '0.5rem 1rem', border: 'none', background: 'none', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', color: traceTab === 'tasks' ? '#2563eb' : '#64748b', borderBottom: traceTab === 'tasks' ? '2px solid #2563eb' : 'none', marginBottom: '-0.5rem' }}
          >
            📌 Actionable Recovery Tasks ({currentPlan?.tasks?.length ?? 0})
          </button>
          <button
            onClick={() => setTraceTab('tools')}
            style={{ padding: '0.5rem 1rem', border: 'none', background: 'none', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', color: traceTab === 'tools' ? '#2563eb' : '#64748b', borderBottom: traceTab === 'tools' ? '2px solid #2563eb' : 'none', marginBottom: '-0.5rem' }}
          >
            🧰 Verified Tool Activity ({workflowTrace.toolCalls?.length ?? 0})
          </button>
          <button
            onClick={() => setTraceTab('guardrails')}
            style={{ padding: '0.5rem 1rem', border: 'none', background: 'none', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', color: traceTab === 'guardrails' ? '#2563eb' : '#64748b', borderBottom: traceTab === 'guardrails' ? '2px solid #2563eb' : 'none', marginBottom: '-0.5rem' }}
          >
            🛡️ Policy &amp; Guardrail Verification ({workflowTrace.validationResults?.length ?? 0})
          </button>
        </div>

        {/* Sub-Tab 1: 4-Agent Execution Steps */}
        {traceTab === 'agents' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {(workflowTrace.agentSteps ?? []).map((step, idx) => (
              <div key={idx} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ background: '#eff6ff', color: '#1d4ed8', width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem' }}>
                      {idx + 1}
                    </span>
                    <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{step.agentName}</strong>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', background: '#f8fafc', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                    ⏱️ {step.durationMs}ms • Status: {step.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.5rem' }}>
                  <em>Role: {step.role}</em>
                </div>
                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                  <div style={{ color: '#334155', marginBottom: '0.25rem' }}><strong>Input:</strong> {step.inputSummary}</div>
                  <div style={{ color: '#1e3a8a' }}><strong>Decomposition Output:</strong> {step.outputSummary}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sub-Tab 2: Actionable Tasks */}
        {traceTab === 'tasks' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {(currentPlan?.tasks ?? []).map((task) => (
              <div key={task.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{task.title}</strong>
                    <span style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: task.priority === 'Critical' ? '#fef2f2' : task.priority === 'High' ? '#fff7ed' : '#f0fdf4',
                      color: task.priority === 'Critical' ? '#dc2626' : task.priority === 'High' ? '#ea580c' : '#16a34a',
                    }}>
                      {task.priority}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#475569', margin: '0 0 0.75rem 0' }}>{task.description}</p>
                </div>
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Assigned: </span>
                    <strong style={{ color: '#2563eb' }}>{task.assignedNGOName || 'Local Authority / Disaster Officer'}</strong>
                  </div>
                  <div style={{ fontWeight: 800, color: '#166534' }}>
                    Rs. {task.estimatedCost.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sub-Tab 3: User-Friendly Allow-Listed Tool Activity */}
        {traceTab === 'tools' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {(workflowTrace.toolCalls ?? []).map((tool, idx) => renderToolCard(tool, idx))}
          </div>
        )}

        {/* Sub-Tab 4: Policy & Safety Guardrails */}
        {traceTab === 'guardrails' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(workflowTrace.validationResults ?? []).map((v, idx) => (
              <div key={idx} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.25rem' }}>{v.passed ? '✅' : '⚠️'}</span>
                <div>
                  <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{v.ruleName}</strong>
                  <div style={{ fontSize: '0.85rem', color: '#475569' }}>{v.detail}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#0f172a' }}>
      
      {/* ── HEADER & NAVIGATION TABS ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '2rem' }}>🤖</span>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#1d4ed8' }}>
              Autonomous Disaster Recovery Planning Agent
            </h1>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
            4-Agent Multi-Step Reasoning Engine powered by Google Gemini with deterministic policy guardrails &amp; allow-listed tool execution.
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f1f5f9', padding: '0.35rem', borderRadius: '10px' }}>
          <button
            onClick={() => {
              setActiveTab('intake');
              setInspectingHistoryPlan(false);
              resetForm();
            }}
            style={{
              padding: '0.55rem 1.1rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              backgroundColor: activeTab === 'intake' ? '#2563eb' : 'transparent',
              color: activeTab === 'intake' ? '#ffffff' : '#64748b',
              transition: 'all 0.15s ease',
            }}
          >
            ✨ New AI Intake &amp; Planner
          </button>
          <button
            onClick={() => {
              setActiveTab('history');
            }}
            style={{
              padding: '0.55rem 1.1rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              backgroundColor: activeTab === 'history' ? '#2563eb' : 'transparent',
              color: activeTab === 'history' ? '#ffffff' : '#64748b',
              transition: 'all 0.15s ease',
            }}
          >
            📋 Past Plans &amp; Audit ({workflowList.length})
          </button>
        </div>
      </div>

      {/* ── ERROR NOTIFICATION BANNER ── */}
      {errorMessage && (
        <div style={{ padding: '1rem 1.25rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#b91c1c', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(220, 38, 38, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.35rem' }}>⚠️</span>
            <span style={{ fontSize: '0.925rem', fontWeight: 700 }}>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontWeight: 800, fontSize: '1rem' }}>✕</button>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          TAB 1: NEW AI DAMAGE INTAKE & PLANNER (VERTICAL FORMS UNDER EACH OTHER)
         ═════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'intake' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Form 1: Disaster & Impact Parameters */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.75rem', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '1.35rem' }}>📍</span>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                Disaster &amp; Impact Parameters <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 600 }}>(All Fields Required *)</span>
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                  District <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.75rem', border: `1px solid ${!district ? '#fca5a5' : '#cbd5e1'}`, borderRadius: '8px', fontSize: '0.9rem', background: '#fff', boxSizing: 'border-box' }}
                >
                  <option value="">-- Select Affected District --</option>
                  {SRI_LANKA_DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                  Disaster Type <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select
                  value={disasterType}
                  onChange={(e) => setDisasterType(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.75rem', border: `1px solid ${!disasterType ? '#fca5a5' : '#cbd5e1'}`, borderRadius: '8px', fontSize: '0.9rem', background: '#fff', boxSizing: 'border-box' }}
                >
                  <option value="">-- Select Disaster Type --</option>
                  {DISASTER_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                  Houses Damaged / Destroyed <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="Enter number of houses (e.g. 45)"
                  value={housesDamaged}
                  onChange={(e) => setHousesDamaged(e.target.value === '' ? '' : Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    border: `1px solid ${housesDamaged === '' ? '#fca5a5' : '#cbd5e1'}`,
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                  Displaced Families Count <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="Enter number of families (e.g. 38)"
                  value={displacedFamilies}
                  onChange={(e) => setDisplacedFamilies(e.target.value === '' ? '' : Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    border: `1px solid ${displacedFamilies === '' ? '#fca5a5' : '#cbd5e1'}`,
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                Disaster Situation &amp; Field Observation Notes <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="Describe flooded zones, impassable bridges, power line damage, isolated communities, stranded persons..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem',
                  border: `1px solid ${notes.trim().length < 10 ? '#fca5a5' : '#cbd5e1'}`,
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                  lineHeight: 1.5
                }}
              />
              {notes.trim().length < 10 && (
                <span style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem', display: 'block' }}>
                  * Please provide at least 10 characters of situation notes.
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                  Reporting Officer / Organization <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Full Name (e.g. System Administrator)"
                  value={reportedBy}
                  onChange={(e) => setReportedBy(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    border: `1px solid ${!reportedBy.trim() ? '#fca5a5' : '#cbd5e1'}`,
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                  Emergency Contact Phone Number <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +94112345670 or 0771234567"
                  value={reporterContact}
                  onChange={(e) => setReporterContact(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    border: `1px solid ${!reporterContact.trim() ? '#fca5a5' : '#cbd5e1'}`,
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Form 2: Damaged Public Infrastructure (Underneath Form 1 with Clear Labeled Fields) */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.75rem', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.35rem' }}>🏗️</span>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  Damaged Public Infrastructure ({infraItems.length}) <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 600 }}>(At least 1 Asset Required *)</span>
                </h2>
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2563eb', background: '#eff6ff', padding: '0.25rem 0.65rem', borderRadius: '6px' }}>
                Agent 2 Infrastructure Analyzer
              </span>
            </div>

            {/* Clear, Well-Labeled Add New Infrastructure Item Box */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    1. Asset / Facility Name <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kalu Ganga Main Bridge"
                    value={newAsset.assetName}
                    onChange={(e) => setNewAsset({ ...newAsset, assetName: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    2. Infrastructure Category <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    value={newAsset.assetType}
                    onChange={(e) => setNewAsset({ ...newAsset, assetType: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', background: '#fff', boxSizing: 'border-box' }}
                  >
                    {ASSET_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    3. Damage Severity <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    value={newAsset.damageLevel}
                    onChange={(e) => setNewAsset({ ...newAsset, damageLevel: e.target.value })}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', background: '#fff', boxSizing: 'border-box' }}
                  >
                    {DAMAGE_LEVELS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    4. Estimated Cost (LKR) <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="10000"
                    placeholder="e.g. 100000"
                    value={newAsset.estimatedCost}
                    onChange={(e) => setNewAsset({ ...newAsset, estimatedCost: Number(e.target.value) })}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <button
                    type="button"
                    onClick={addInfraItem}
                    style={{
                      width: '100%',
                      padding: '0.65rem 1rem',
                      background: 'linear-gradient(135deg, #15803d, #16a34a)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      boxShadow: '0 2px 6px rgba(22,163,74,0.25)',
                    }}
                  >
                    <span>➕</span>
                    <span>Add Asset</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Infrastructure List Table */}
            <div>
              {infraItems.length === 0 ? (
                <div style={{ padding: '1.75rem 1rem', textAlign: 'center', background: '#fef2f2', border: '1px dashed #fca5a5', borderRadius: '8px', color: '#b91c1c', fontSize: '0.9rem', fontWeight: 600 }}>
                  ⚠️ No infrastructure assets added yet. Please use the form above to add at least 1 damaged facility (e.g. Bridge, Road, Hospital, or Water Supply).
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {infraItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{item.assetName}</span>
                        <span style={{ padding: '0.15rem 0.5rem', background: '#eff6ff', color: '#1e40af', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                          {item.assetType}
                        </span>
                        <span style={{
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: item.damageLevel === 'Destroyed' ? '#fee2e2' : item.damageLevel === 'Severe' ? '#ffedd5' : '#fef9c3',
                          color: item.damageLevel === 'Destroyed' ? '#b91c1c' : item.damageLevel === 'Severe' ? '#c2410c' : '#854d0e',
                        }}>
                          {item.damageLevel}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontWeight: 800, color: '#15803d', fontSize: '0.95rem' }}>
                          Rs. {item.estimatedCost.toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeInfraItem(idx)}
                          style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 800, fontSize: '1rem' }}
                          title="Remove item"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Large Primary Action Button: Execute 4-Agent AI Recovery Engine */}
          <div style={{ marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={handleStartIntakeWorkflow}
              disabled={loading}
              style={{
                width: '100%',
                padding: '1.1rem',
                background: loading ? '#64748b' : 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 800,
                fontSize: '1.1rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 6px 20px rgba(37, 99, 235, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                transition: 'all 0.2s ease',
              }}
            >
              <span style={{ fontSize: '1.35rem' }}>{loading ? '⏳' : '⚡'}</span>
              <span>{loading ? 'Orchestrating 4-Agent Recovery Engine...' : 'Execute 4-Agent AI Recovery Engine'}</span>
            </button>
          </div>

          {/* ── STEP-BY-STEP WORKING PROGRESS BAR (Visible when executing) ── */}
          {loading && (
            <div style={{ background: '#ffffff', border: '2px solid #3b82f6', borderRadius: '14px', padding: '1.75rem', marginTop: '1rem', boxShadow: '0 8px 24px rgba(37, 99, 235, 0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>🤖</span>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1e40af' }}>
                    Multi-Agent Reasoning Pipeline in Progress...
                  </h3>
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#2563eb', background: '#eff6ff', padding: '0.3rem 0.75rem', borderRadius: '20px' }}>
                  Step {currentStep} of 4 ({currentStep * 25}%)
                </span>
              </div>

              {/* Animated Progress Bar Fill */}
              <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '1.5rem' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${currentStep * 25}%`,
                    background: 'linear-gradient(90deg, #2563eb, #38bdf8)',
                    borderRadius: '4px',
                    transition: 'width 0.4s ease-in-out',
                  }}
                />
              </div>

              {/* 4 Agent Step Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  background: currentStep >= 1 ? '#eff6ff' : '#f8fafc',
                  border: `2px solid ${currentStep === 1 ? '#3b82f6' : currentStep > 1 ? '#86efac' : '#e2e8f0'}`,
                  transition: 'all 0.3s ease',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: currentStep >= 1 ? '#1d4ed8' : '#94a3b8' }}>AGENT 1</span>
                    <span>{currentStep > 1 ? '✅' : currentStep === 1 ? '🔄' : '⏳'}</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>Strategic Planner</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>Decomposes disaster scope &amp; priorities</div>
                </div>

                <div style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  background: currentStep >= 2 ? '#eff6ff' : '#f8fafc',
                  border: `2px solid ${currentStep === 2 ? '#3b82f6' : currentStep > 2 ? '#86efac' : '#e2e8f0'}`,
                  transition: 'all 0.3s ease',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: currentStep >= 2 ? '#1d4ed8' : '#94a3b8' }}>AGENT 2</span>
                    <span>{currentStep > 2 ? '✅' : currentStep === 2 ? '🔄' : '⏳'}</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>Infra &amp; Shelter Analyzer</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>Evaluates capacity &amp; lifeline repairs</div>
                </div>

                <div style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  background: currentStep >= 3 ? '#eff6ff' : '#f8fafc',
                  border: `2px solid ${currentStep === 3 ? '#3b82f6' : currentStep > 3 ? '#86efac' : '#e2e8f0'}`,
                  transition: 'all 0.3s ease',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: currentStep >= 3 ? '#1d4ed8' : '#94a3b8' }}>AGENT 3</span>
                    <span>{currentStep > 3 ? '✅' : currentStep === 3 ? '🔄' : '⏳'}</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>Tool &amp; NGO Dispatcher</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>Matches NGOs &amp; calculates budgets</div>
                </div>

                <div style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  background: currentStep >= 4 ? '#eff6ff' : '#f8fafc',
                  border: `2px solid ${currentStep === 4 ? '#3b82f6' : '#e2e8f0'}`,
                  transition: 'all 0.3s ease',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: currentStep >= 4 ? '#1d4ed8' : '#94a3b8' }}>AGENT 4</span>
                    <span>{currentStep >= 4 ? '🔄' : '⏳'}</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>Policy &amp; Guardrail Validator</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>Verifies limits &amp; compiles audit trace</div>
                </div>
              </div>
            </div>
          )}

          {/* Render Generated Strategy & Trace Below Intake Form */}
          {renderPlanAndTraceSection()}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          TAB 2: PAST PLANS & AUDIT LEDGER
         ═════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div>
          {inspectingHistoryPlan && workflowTrace ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <button
                  onClick={() => setInspectingHistoryPlan(false)}
                  style={{ padding: '0.5rem 1rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', color: '#334155' }}
                >
                  ← Back to All Audit Records
                </button>
              </div>
              {renderPlanAndTraceSection()}
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                  📜 Autonomous AI Workflow Execution Ledger
                </h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['all', 'Approved', 'PendingApproval', 'Rejected'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        background: filterStatus === status ? '#0f172a' : '#ffffff',
                        color: filterStatus === status ? '#ffffff' : '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      {status === 'all' ? 'All Plans' : status}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {workflowList.length === 0 ? (
                  <div style={{ padding: '3rem 2rem', textAlign: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#64748b' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📑</div>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontWeight: 700 }}>No Recovery Plans Found</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>Run a new intake workflow to generate the first autonomous recovery plan.</p>
                  </div>
                ) : (
                  workflowList.map((wf) => (
                    <div
                      key={wf.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '1.25rem',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '1rem',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>{wf.planName}</span>
                          <span style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: wf.status === 'Approved' ? '#f0fdf4' : wf.status === 'PendingApproval' ? '#fef3c7' : '#fef2f2',
                            color: wf.status === 'Approved' ? '#16a34a' : wf.status === 'PendingApproval' ? '#b45309' : '#dc2626',
                          }}>
                            ● {wf.status}
                          </span>
                          {wf.revisionCount > 0 && (
                            <span style={{ padding: '0.2rem 0.5rem', background: '#f1f5f9', color: '#475569', borderRadius: '4px', fontSize: '0.7rem' }}>
                              Rev {wf.revisionCount}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          Budget: <strong>LKR {wf.estimatedTotalBudget.toLocaleString()}</strong> • Duration: {wf.totalAgentDurationMs || 0}ms • Created: {new Date(wf.createdAt).toLocaleString()}
                        </div>
                      </div>

                      <button
                        onClick={() => handleSelectWorkflow(wf.id)}
                        style={{
                          padding: '0.55rem 1.15rem',
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          border: '1px solid #bfdbfe',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          boxShadow: '0 1px 3px rgba(37,99,235,0.1)',
                        }}
                      >
                        <span>🔍 Inspect Trace &amp; Tasks →</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── REVISION MODAL ── */}
      {showRevisionModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', padding: '2rem', borderRadius: '12px', width: '500px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>🔄 Request Plan Revision</h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Provide specific guidance for the Agent Orchestrator to re-plan the recovery strategy.
            </p>
            <textarea
              rows={4}
              placeholder="e.g. Prioritize clean water restoration over road repairs; increase temporary shelter allocation for flood victims."
              value={revisionGuidance}
              onChange={(e) => setRevisionGuidance(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box', marginBottom: '1.25rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={() => setShowRevisionModal(false)}
                style={{ padding: '0.5rem 1rem', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDecision('Revise')}
                disabled={!revisionGuidance.trim() || loading}
                style={{ padding: '0.5rem 1.25rem', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
              >
                Submit Revision Prompt
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
