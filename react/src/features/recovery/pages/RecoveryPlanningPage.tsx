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
} from '../types/recoveryTypes';

const SRI_LANKA_DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle',
  'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle',
  'Kilinochchi', 'Kurunegala', 'Mannar', 'Matale', 'Matara', 'Monaragala',
  'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura',
  'Trincomalee', 'Vavuniya',
];

const DISASTER_TYPES = ['Flood', 'Landslide', 'Tsunami', 'Cyclone', 'Drought', 'Coastal Erosion'];
const DAMAGE_LEVELS = ['Destroyed', 'Severe', 'Moderate', 'Minor'];
const ASSET_TYPES = ['Bridge', 'Road', 'Water', 'Hospital', 'School', 'Power', 'Other'];

export const RecoveryPlanningPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'intake' | 'history'>('intake');
  const [isOfficer, setIsOfficer] = useState(true);

  // Intake Form State — clean dynamic inputs
  const [district, setDistrict] = useState('Kalutara');
  const [disasterType, setDisasterType] = useState('Flood');
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

  // Execution & Trace State
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [currentPlan, setCurrentPlan] = useState<RecoveryPlan | null>(null);
  const [workflowTrace, setWorkflowTrace] = useState<WorkflowTrace | null>(null);
  const [traceTab, setTraceTab] = useState<'agents' | 'tools' | 'guardrails' | 'tasks'>('agents');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Revision Modal State
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionGuidance, setRevisionGuidance] = useState('');

  // Workflow History List State
  const [workflowList, setWorkflowList] = useState<WorkflowListItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const loadWorkflowHistory = useCallback(async () => {
    try {
      const data = await fetchWorkflows(filterStatus === 'all' ? undefined : filterStatus);
      setWorkflowList(data.items || []);
    } catch {
      // ignore
    }
  }, [filterStatus]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadWorkflowHistory();
    }
  }, [activeTab, loadWorkflowHistory]);

  // Quick Preset Handlers (for easy 1-click test evaluation)
  const applyPreset = (type: 'flood' | 'landslide' | 'cyclone') => {
    if (type === 'flood') {
      setDistrict('Kalutara');
      setDisasterType('Flood');
      setHousesDamaged(45);
      setDisplacedFamilies(38);
      setReportedBy('Disaster Relief Officer (Kalutara)');
      setReporterContact('034-2222222');
      setNotes('Severe flooding around Kalu Ganga river basin. Immediate evacuation in progress.');
      setInfraItems([
        { assetName: 'Kalu Ganga Main Bridge Approach', assetType: 'Bridge', damageLevel: 'Destroyed', estimatedCost: 500000 },
        { assetName: 'District Drinking Water Mainline', assetType: 'Water', damageLevel: 'Severe', estimatedCost: 280000 },
        { assetName: 'Nagoda Rural Hospital Ward A', assetType: 'Hospital', damageLevel: 'Moderate', estimatedCost: 150000 },
      ]);
    } else if (type === 'landslide') {
      setDistrict('Ratnapura');
      setDisasterType('Landslide');
      setHousesDamaged(25);
      setDisplacedFamilies(22);
      setReportedBy('NBRO Field Geologist');
      setReporterContact('045-2233445');
      setNotes('High-risk slope failure. 22 families moved to temporary tea estate school.');
      setInfraItems([
        { assetName: 'A4 Highway km 78 Slope Retaining Wall', assetType: 'Road', damageLevel: 'Destroyed', estimatedCost: 650000 },
        { assetName: 'Kiriella Community Electricity Grid', assetType: 'Power', damageLevel: 'Severe', estimatedCost: 190000 },
      ]);
    } else {
      setDistrict('Batticaloa');
      setDisasterType('Cyclone');
      setHousesDamaged(60);
      setDisplacedFamilies(50);
      setReportedBy('Batticaloa District Secretariat');
      setReporterContact('065-2244556');
      setNotes('Coastal gale winds and storm surges damaged coastal settlements.');
      setInfraItems([
        { assetName: 'Kallady Coastal Access Road', assetType: 'Road', damageLevel: 'Severe', estimatedCost: 320000 },
        { assetName: 'Chenkalady High School Shelter Roof', assetType: 'School', damageLevel: 'Severe', estimatedCost: 210000 },
      ]);
    }
  };

  // Launch Workflow Handler
  const handleStartIntakeWorkflow = async () => {
    if (!district) {
      setErrorMessage('Please select a district.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setCurrentPlan(null);
    setWorkflowTrace(null);
    setCurrentStep(1);

    const stepTimer = setInterval(() => {
      setCurrentStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 450);

    try {
      const intakeData: DamageIntakeFormData = {
        district,
        disasterType,
        housesDamaged: Number(housesDamaged) || 0,
        displacedFamilies: Number(displacedFamilies) || 0,
        reporterName: reportedBy.trim() || 'Officer / Citizen',
        reporterContact: reporterContact.trim(),
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
    } catch (err: any) {
      clearInterval(stepTimer);
      setErrorMessage(err.message || 'Failed to generate recovery plan.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWorkflow = async (planId: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const trace = await fetchWorkflowTrace(planId);
      setWorkflowTrace(trace);
      setActiveTab('intake');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load trace.');
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (action: 'Approve' | 'Reject' | 'Revise') => {
    if (!currentPlan) return;
    setLoading(true);
    try {
      const reviewerNotes = action === 'Revise' ? revisionGuidance : undefined;
      const updated = await submitWorkflowDecision(currentPlan.id, action, reviewerNotes, 'Recovery Admin');
      setCurrentPlan(updated);
      setShowRevisionModal(false);
      setRevisionGuidance('');
      const trace = await fetchWorkflowTrace(currentPlan.id);
      setWorkflowTrace(trace);
    } catch (err: any) {
      setErrorMessage(err.message || `Failed to ${action} plan.`);
    } finally {
      setLoading(false);
    }
  };

  const addInfraItem = () => {
    if (!newAsset.assetName.trim()) return;
    setInfraItems([...infraItems, { ...newAsset }]);
    setNewAsset({ assetName: '', assetType: 'Road', damageLevel: 'Moderate', estimatedCost: 100000 });
  };

  const removeInfraItem = (index: number) => {
    setInfraItems(infraItems.filter((_, i) => i !== index));
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1.5rem', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#0f172a' }}>
      
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '2rem' }}>🤖</span>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Autonomous Disaster Recovery Planning Agent
            </h1>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
            4-Agent Multi-Step Reasoning Engine powered by Google Gemini with deterministic policy guardrails & allow-listed tool execution.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f1f5f9', padding: '0.35rem', borderRadius: '10px' }}>
          <button
            onClick={() => { setActiveTab('intake'); setCurrentPlan(null); setWorkflowTrace(null); }}
            style={{
              padding: '0.55rem 1.1rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              backgroundColor: activeTab === 'intake' ? '#2563eb' : 'transparent',
              color: activeTab === 'intake' ? '#ffffff' : '#64748b',
              transition: 'all 0.2s',
            }}
          >
            ✨ New AI Damage Intake & Planner
          </button>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '0.55rem 1.1rem',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              backgroundColor: activeTab === 'history' ? '#2563eb' : 'transparent',
              color: activeTab === 'history' ? '#ffffff' : '#64748b',
              transition: 'all 0.2s',
            }}
          >
            📋 All Workflows & History
          </button>
        </div>
      </div>

      {/* ── ERROR NOTIFICATION ── */}
      {errorMessage && (
        <div style={{ padding: '1rem 1.25rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#b91c1c', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
        </div>
      )}

      {/* ── TAB 1: INDEPENDENT DAMAGE INTAKE ── */}
      {activeTab === 'intake' && !currentPlan && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          
          {/* Quick Presets Bar */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>⚡ Quick Test Presets:</span>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Populate realistic Sri Lanka disaster data in 1 click</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => applyPreset('flood')} style={{ padding: '0.4rem 0.8rem', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                🌊 Kalutara Flood
              </button>
              <button onClick={() => applyPreset('landslide')} style={{ padding: '0.4rem 0.8rem', background: '#fef3c7', border: '1px solid #fde68a', color: '#b45309', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                ⛰️ Ratnapura Landslide
              </button>
              <button onClick={() => applyPreset('cyclone')} style={{ padding: '0.4rem 0.8rem', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                🌪️ Batticaloa Cyclone
              </button>
            </div>
          </div>

          {/* Form Card */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '2rem', boxShadow: '0 4px 16px -2px rgba(0,0,0,0.04)' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                  Target District *
                </label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', backgroundColor: '#f8fafc' }}
                >
                  {SRI_LANKA_DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                  Disaster Type *
                </label>
                <select
                  value={disasterType}
                  onChange={(e) => setDisasterType(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', backgroundColor: '#f8fafc' }}
                >
                  {DISASTER_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                  Houses Damaged
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="e.g. 25"
                  value={housesDamaged}
                  onChange={(e) => setHousesDamaged(e.target.value === '' ? '' : Number(e.target.value))}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                  Displaced Families
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="e.g. 20"
                  value={displacedFamilies}
                  onChange={(e) => setDisplacedFamilies(e.target.value === '' ? '' : Number(e.target.value))}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                  Reporter Name / Officer
                </label>
                <input
                  type="text"
                  placeholder="Your Name / Title"
                  value={reportedBy}
                  onChange={(e) => setReportedBy(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                  Contact Phone
                </label>
                <input
                  type="text"
                  placeholder="e.g. 0771234567"
                  value={reporterContact}
                  onChange={(e) => setReporterContact(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                Situation Description & Impact Notes
              </label>
              <textarea
                rows={2}
                placeholder="Describe current emergency situation and critical needs..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>

            {/* Damaged Assets Section */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                    🏗️ Damaged Public Infrastructure Assets ({infraItems.length})
                  </h3>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                    Assets evaluated by Agent 2 (Domain Analysis) and matched with NGOs by Agent 3.
                  </p>
                </div>
              </div>

              {/* Asset List */}
              {infraItems.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  {infraItems.map((item, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.assetName}</span>
                        <span style={{ padding: '0.2rem 0.6rem', background: '#eff6ff', color: '#2563eb', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                          {item.assetType}
                        </span>
                        <span style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: item.damageLevel === 'Destroyed' ? '#fef2f2' : item.damageLevel === 'Severe' ? '#fff7ed' : '#f0fdf4',
                          color: item.damageLevel === 'Destroyed' ? '#dc2626' : item.damageLevel === 'Severe' ? '#ea580c' : '#16a34a'
                        }}>
                          {item.damageLevel}
                        </span>
                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          Est: LKR {item.estimatedCost.toLocaleString()}
                        </span>
                      </div>
                      <button
                        onClick={() => removeInfraItem(index)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1rem', padding: '0.25rem 0.5rem' }}
                        title="Remove Item"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Preset Asset Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>💡 Quick Asset Templates:</span>
                <button
                  type="button"
                  onClick={() => setNewAsset({ assetName: 'Main River Bridge Access Road', assetType: 'Bridge', damageLevel: 'Destroyed', estimatedCost: 450000 })}
                  style={{ padding: '0.25rem 0.6rem', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  + 🌉 River Bridge (Rs. 450k)
                </button>
                <button
                  type="button"
                  onClick={() => setNewAsset({ assetName: 'Municipal Drinking Water Pipeline', assetType: 'Water', damageLevel: 'Severe', estimatedCost: 280000 })}
                  style={{ padding: '0.25rem 0.6rem', background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  + 🚰 Water Pipeline (Rs. 280k)
                </button>
                <button
                  type="button"
                  onClick={() => setNewAsset({ assetName: 'Rural Hospital Emergency Ward', assetType: 'Hospital', damageLevel: 'Moderate', estimatedCost: 150000 })}
                  style={{ padding: '0.25rem 0.6rem', background: '#fdf2f8', border: '1px solid #fbcfe8', color: '#be185d', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  + 🏥 Hospital Ward (Rs. 150k)
                </button>
                <button
                  type="button"
                  onClick={() => setNewAsset({ assetName: 'Community Center Evacuation Roof', assetType: 'School', damageLevel: 'Severe', estimatedCost: 200000 })}
                  style={{ padding: '0.25rem 0.6rem', background: '#fef3c7', border: '1px solid #fde68a', color: '#b45309', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  + 🏫 Shelter Roof (Rs. 200k)
                </button>
              </div>

              {/* Add New Asset Form Card */}
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '1.25rem', borderRadius: '10px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr)) auto', gap: '0.85rem', alignItems: 'flex-end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                    1. Asset Name / Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bridge B12, Water Main"
                    value={newAsset.assetName}
                    onChange={(e) => setNewAsset({ ...newAsset, assetName: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', background: '#ffffff', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                    2. Asset Category
                  </label>
                  <select
                    value={newAsset.assetType}
                    onChange={(e) => setNewAsset({ ...newAsset, assetType: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', background: '#ffffff', boxSizing: 'border-box' }}
                  >
                    {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                    3. Damage Severity
                  </label>
                  <select
                    value={newAsset.damageLevel}
                    onChange={(e) => setNewAsset({ ...newAsset, damageLevel: e.target.value })}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', background: '#ffffff', boxSizing: 'border-box' }}
                  >
                    {DAMAGE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.3rem', textTransform: 'uppercase' }}>
                    4. Est. Cost (LKR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    placeholder="e.g. 250000"
                    value={newAsset.estimatedCost || ''}
                    onChange={(e) => setNewAsset({ ...newAsset, estimatedCost: Number(e.target.value) })}
                    style={{ width: '100%', padding: '0.65rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.875rem', background: '#ffffff', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <button
                    type="button"
                    onClick={addInfraItem}
                    style={{
                      padding: '0.65rem 1.25rem',
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <span>+ Add Asset</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Launch CTA */}
            <button
              onClick={handleStartIntakeWorkflow}
              disabled={loading}
              style={{
                width: '100%',
                padding: '1rem',
                background: loading ? '#94a3b8' : 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '1.05rem',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                transition: 'all 0.2s',
              }}
            >
              {loading ? (
                <>
                  <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
                  <span>Executing 4-Agent Reasoning Workflow...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Launch 4-Agent Autonomous Recovery Workflow</span>
                </>
              )}
            </button>

            {/* Live Progress Stepper during loading */}
            {loading && (
              <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.75rem' }}>
                  Live Multi-Agent Pipeline Progress:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', textAlign: 'center', fontSize: '0.8rem' }}>
                  <div style={{ padding: '0.5rem', background: currentStep >= 1 ? '#dbeafe' : '#f1f5f9', color: currentStep >= 1 ? '#1d4ed8' : '#94a3b8', borderRadius: '6px', fontWeight: currentStep === 1 ? 700 : 500 }}>
                    1. Orchestrator
                  </div>
                  <div style={{ padding: '0.5rem', background: currentStep >= 2 ? '#dbeafe' : '#f1f5f9', color: currentStep >= 2 ? '#1d4ed8' : '#94a3b8', borderRadius: '6px', fontWeight: currentStep === 2 ? 700 : 500 }}>
                    2. Infra Analysis
                  </div>
                  <div style={{ padding: '0.5rem', background: currentStep >= 3 ? '#dbeafe' : '#f1f5f9', color: currentStep >= 3 ? '#1d4ed8' : '#94a3b8', borderRadius: '6px', fontWeight: currentStep === 3 ? 700 : 500 }}>
                    3. Tool NGO Matching
                  </div>
                  <div style={{ padding: '0.5rem', background: currentStep >= 4 ? '#dbeafe' : '#f1f5f9', color: currentStep >= 4 ? '#1d4ed8' : '#94a3b8', borderRadius: '6px', fontWeight: currentStep === 4 ? 700 : 500 }}>
                    4. Safety Validation
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: WORKFLOW HISTORY ── */}
      {activeTab === 'history' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Generated Recovery Plans & Workflow Logs</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['all', 'PendingApproval', 'Approved', 'RevisionRequested', 'Rejected'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: filterStatus === st ? '#2563eb' : '#fff',
                    color: filterStatus === st ? '#fff' : '#64748b',
                  }}
                >
                  {st === 'all' ? 'All Plans' : st}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {workflowList.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#64748b' }}>
                No recovery plans found. Generate a new plan from the intake form.
              </div>
            ) : (
              workflowList.map((wf) => (
                <div
                  key={wf.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1.25rem',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
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
                        {wf.status}
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
                    style={{ padding: '0.5rem 1rem', background: '#f1f5f9', color: '#1e293b', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    Inspect Trace & Tasks →
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── GENERATED PLAN & WORKFLOW TRACE DETAILS ── */}
      {workflowTrace && (
        <div style={{ marginTop: '1rem' }}>
          
          {/* Top Banner with Actions */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.5rem 2rem', marginBottom: '1.5rem', boxShadow: '0 4px 16px -2px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                    {currentPlan?.planName || 'Master Recovery Action Plan'}
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

              {/* Human-in-the-Loop Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                <button
                  onClick={() => { setCurrentPlan(null); setWorkflowTrace(null); }}
                  style={{ padding: '0.6rem 1rem', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
                >
                  + New Plan
                </button>
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

          {/* Trace Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
            <button
              onClick={() => setTraceTab('agents')}
              style={{ padding: '0.5rem 1rem', border: 'none', background: 'none', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', color: traceTab === 'agents' ? '#2563eb' : '#64748b', borderBottom: traceTab === 'agents' ? '2px solid #2563eb' : 'none', marginBottom: '-0.5rem' }}
            >
              🤖 4-Agent Execution Timeline ({workflowTrace.agentSteps?.length ?? 0})
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
              🧰 Allow-Listed Tool Activity ({workflowTrace.toolCalls?.length ?? 0})
            </button>
            <button
              onClick={() => setTraceTab('guardrails')}
              style={{ padding: '0.5rem 1rem', border: 'none', background: 'none', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', color: traceTab === 'guardrails' ? '#2563eb' : '#64748b', borderBottom: traceTab === 'guardrails' ? '2px solid #2563eb' : 'none', marginBottom: '-0.5rem' }}
            >
              🛡️ Policy & Guardrail Verification ({workflowTrace.validationResults?.length ?? 0})
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

          {/* Sub-Tab 2: Tasks */}
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
                      <strong style={{ color: '#2563eb' }}>{task.assignedNGOName || 'Local Authority'}</strong>
                    </div>
                    <div style={{ fontWeight: 800, color: '#166534' }}>
                      Rs. {task.estimatedCost.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sub-Tab 3: Tool Activity */}
          {traceTab === 'tools' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(workflowTrace.toolCalls ?? []).map((tool, idx) => (
                <div key={idx} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 700, fontFamily: 'monospace', background: '#eff6ff', padding: '0.2rem 0.5rem', borderRadius: '4px', color: '#1e40af' }}>
                      🛠️ {tool.toolName}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>⏱️ {tool.durationMs}ms</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                    <div style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: '4px', overflowX: 'auto' }}>
                      <span style={{ color: '#64748b' }}>// Input:</span>
                      <pre style={{ margin: '0.25rem 0 0 0' }}>{tool.inputJson}</pre>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: '4px', overflowX: 'auto' }}>
                      <span style={{ color: '#64748b' }}>// Output:</span>
                      <pre style={{ margin: '0.25rem 0 0 0' }}>{tool.outputJson}</pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sub-Tab 4: Guardrails */}
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
      )}

      {/* ── REVISION MODAL ── */}
      {showRevisionModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', padding: '2rem', borderRadius: '12px', width: '500px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>🔄 Request Plan Revision</h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Provide specific instructions for Agent 1 (Orchestrator) to re-plan the recovery strategy.
            </p>
            <textarea
              rows={4}
              placeholder="e.g. Prioritize water filtration over road repairs; allocate more budget to flood evacuees."
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
