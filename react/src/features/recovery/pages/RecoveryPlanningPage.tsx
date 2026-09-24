import React, { useState, useEffect, useCallback } from 'react';
import {
  startWorkflowFromIntake,
  fetchWorkflows,
  fetchWorkflowDetail,
  fetchWorkflowTrace,
  submitWorkflowDecision,
  fetchDamageReports,
  submitCitizenDamageReport,
  deleteDamageReport,
} from '../api/recoveryApi';
import {
  RecoveryPlan,
  WorkflowTrace,
  WorkflowListItem,
  DamageIntakeFormData,
  InfrastructureItemInput,
  ToolCallDto,
  DamageReportItem,
  OriginatingIntake,
} from '../types/recoveryTypes';
import { useAuth } from '../../../shared/auth/AuthContext';

const SRI_LANKA_DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
  'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
  'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
  'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
  'Monaragala', 'Ratnapura', 'Kegalle',
];

const DISASTER_TYPES = ['Flood', 'Landslide', 'Tsunami', 'Cyclone', 'Drought', 'Coastal Erosion', 'Other'];
const DAMAGE_LEVELS = ['Destroyed', 'Severe', 'Moderate', 'Minor'];
const ASSET_TYPES = ['Bridge', 'Road', 'Water', 'Hospital', 'School', 'Power', 'Sanitation', 'Other'];
const IMMEDIATE_NEEDS_OPTIONS = [
  'Food Rations',
  'Clean Drinking Water',
  'Emergency Medical Aid',
  'Temporary Shelter / Tents',
  'Blankets & Bedding',
  'Baby & Infant Care',
  'Emergency Clothing',
  'Emergency Transport',
  'Hygiene & Sanitation Kits',
  'Psychosocial Support',
];

export const RecoveryPlanningPage: React.FC = () => {
  const { user } = useAuth();
  const isOfficer = user?.role === 'DisasterOfficer' || user?.role === 'Admin';

  const [activeTab, setActiveTab] = useState<'intake' | 'submissions' | 'history'>('intake');

  // ── SECTION 1: INCIDENT & GEOGRAPHIC INFORMATION ──
  const [incidentIdInput, setIncidentIdInput] = useState('');
  const [disasterType, setDisasterType] = useState('Flood');
  const [otherDisasterType, setOtherDisasterType] = useState('');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [incidentTime, setIncidentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
  const [district, setDistrict] = useState(user?.district || '');
  const [dsDivision, setDsDivision] = useState('');
  const [gnDivision, setGnDivision] = useState('');
  const [affectedVillage, setAffectedVillage] = useState('');
  const [addressLandmark, setAddressLandmark] = useState('');

  // ── SECTION 2: HUMAN IMPACT & VULNERABILITIES ──
  const [totalAffectedPeople, setTotalAffectedPeople] = useState<number | ''>('');
  const [displacedFamilies, setDisplacedFamilies] = useState<number | ''>('');
  const [totalDisplacedPeople, setTotalDisplacedPeople] = useState<number | ''>('');
  const [vulnerableChildren, setVulnerableChildren] = useState<number | ''>('');
  const [vulnerableElderly, setVulnerableElderly] = useState<number | ''>('');
  const [vulnerableDisabled, setVulnerableDisabled] = useState<number | ''>('');
  const [vulnerablePregnant, setVulnerablePregnant] = useState<number | ''>('');
  const [vulnerableInjured, setVulnerableInjured] = useState<number | ''>('');

  // ── SECTION 3: HOUSING DAMAGE BREAKDOWN ──
  const [destroyedHouses, setDestroyedHouses] = useState<number | ''>('');
  const [severeHouses, setSevereHouses] = useState<number | ''>('');
  const [partialHouses, setPartialHouses] = useState<number | ''>('');

  // Auto-calculated total houses damaged
  const totalHousesDamaged =
    (typeof destroyedHouses === 'number' ? destroyedHouses : 0) +
    (typeof severeHouses === 'number' ? severeHouses : 0) +
    (typeof partialHouses === 'number' ? partialHouses : 0);

  // ── SECTION 4: INFRASTRUCTURE DAMAGE BUILDER ──
  const [infraItems, setInfraItems] = useState<InfrastructureItemInput[]>([]);

  const [newAsset, setNewAsset] = useState<InfrastructureItemInput>({
    assetName: '',
    assetType: 'Road',
    damageLevel: 'Moderate',
    estimatedCost: 100000,
    details: '',
  });
  const [editingInfraIndex, setEditingInfraIndex] = useState<number | null>(null);

  // ── SECTION 5: IMMEDIATE ASSISTANCE REQUIRED ──
  const [immediateNeeds, setImmediateNeeds] = useState<string[]>([]);

  // ── SECTION 6: SAFETY CONDITIONS & UTILITY ACCESS ──
  const [overallSeverity, setOverallSeverity] = useState<'Low' | 'Moderate' | 'High' | 'Critical'>('Moderate');
  const [safetyRisk, setSafetyRisk] = useState<'No Immediate Risk' | 'Potential Risk' | 'High Risk' | 'Life Threatening'>('Potential Risk');
  const [electricityAvailable, setElectricityAvailable] = useState<'Yes' | 'No' | 'Partial'>('Yes');
  const [waterAvailable, setWaterAvailable] = useState<'Yes' | 'No' | 'Partial'>('Yes');
  const [roadAccessAvailable, setRoadAccessAvailable] = useState<'Yes' | 'No' | 'Partial'>('Yes');
  const [networkAvailable, setNetworkAvailable] = useState<'Yes' | 'No' | 'Partial'>('Yes');
  const [medicalAccessAvailable, setMedicalAccessAvailable] = useState<'Yes' | 'No' | 'Partial'>('Yes');

  // ── SECTION 7: EVIDENCE & FIELD OBSERVATION NOTES ──
  const [notes, setNotes] = useState('');

  // ── SECTION 8: REPORTER & EMERGENCY CONTACT (Auto-populated from logged-in user) ──
  const [reportedBy, setReportedBy] = useState(user?.fullName || '');
  const [reporterContact, setReporterContact] = useState(user?.phoneNumber || '');
  const [reporterEmail, setReporterEmail] = useState(user?.email || '');
  const [reporterType, setReporterType] = useState<'Citizen' | 'Field Officer' | 'Disaster Officer' | 'Local Authority' | 'NGO'>(
    user?.role === 'DisasterOfficer' || user?.role === 'Admin' ? 'Disaster Officer' : 'Citizen'
  );
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [emergencyContactRelation, setEmergencyContactRelation] = useState('');

  // Auto-populate logged-in user account information when user profile loads/changes
  useEffect(() => {
    if (user) {
      if (!reportedBy && user.fullName) setReportedBy(user.fullName);
      if (!reporterContact && user.phoneNumber) setReporterContact(user.phoneNumber);
      if (!reporterEmail && user.email) setReporterEmail(user.email);
      if (!district && user.district) setDistrict(user.district);
      if (user.role === 'DisasterOfficer' || user.role === 'Admin') {
        setReporterType('Disaster Officer');
      }
    }
  }, [user]);

  // Draft saving
  const handleSaveDraft = () => {
    try {
      const draft = {
        district,
        disasterType,
        dsDivision,
        gnDivision,
        affectedVillage,
        addressLandmark,
        displacedFamilies,
        destroyedHouses,
        severeHouses,
        partialHouses,
        infraItems,
        immediateNeeds,
        overallSeverity,
        safetyRisk,
        notes,
        reportedBy,
        reporterContact,
      };
      localStorage.setItem('aegis_damage_intake_draft', JSON.stringify(draft));
      setSubmissionSuccessMsg('Field assessment draft saved locally.');
    } catch {
      // ignore
    }
  };

  const resetForm = () => {
    setDistrict(user?.district || '');
    setDisasterType('Flood');
    setOtherDisasterType('');
    setDsDivision('');
    setGnDivision('');
    setAffectedVillage('');
    setAddressLandmark('');
    setTotalAffectedPeople('');
    setDisplacedFamilies('');
    setTotalDisplacedPeople('');
    setVulnerableChildren('');
    setVulnerableElderly('');
    setVulnerableDisabled('');
    setVulnerablePregnant('');
    setVulnerableInjured('');
    setDestroyedHouses('');
    setSevereHouses('');
    setPartialHouses('');
    setNotes('');
    setInfraItems([]);
    setImmediateNeeds([]);
    setOverallSeverity('Moderate');
    setSafetyRisk('Potential Risk');
    setElectricityAvailable('Yes');
    setWaterAvailable('Yes');
    setRoadAccessAvailable('Yes');
    setNetworkAvailable('Yes');
    setMedicalAccessAvailable('Yes');
    setReportedBy(user?.fullName || '');
    setReporterContact(user?.phoneNumber || '');
    setReporterEmail(user?.email || '');
    setReporterType(user?.role === 'DisasterOfficer' || user?.role === 'Admin' ? 'Disaster Officer' : 'Citizen');
    setEmergencyContactName('');
    setEmergencyContactPhone('');
    setEmergencyContactRelation('');
    setNewAsset({ assetName: '', assetType: 'Road', damageLevel: 'Moderate', estimatedCost: 100000, details: '' });
  };

  // Execution & Trace State
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [currentPlan, setCurrentPlan] = useState<RecoveryPlan | null>(null);
  const [workflowTrace, setWorkflowTrace] = useState<WorkflowTrace | null>(null);
  const [traceTab, setTraceTab] = useState<'agents' | 'tasks' | 'tools' | 'guardrails'>('agents');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submissionSuccessMsg, setSubmissionSuccessMsg] = useState<string | null>(null);

  // Revision Modal State
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionGuidance, setRevisionGuidance] = useState('');

  // Workflow History List State
  const [workflowList, setWorkflowList] = useState<WorkflowListItem[]>([]);
  const [totalWorkflowCount, setTotalWorkflowCount] = useState<number>(0);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [inspectingHistoryPlan, setInspectingHistoryPlan] = useState<boolean>(false);

  // Citizen Damage Submissions State
  const [damageReports, setDamageReports] = useState<DamageReportItem[]>([]);
  const [totalReportsCount, setTotalReportsCount] = useState<number>(0);
  const [reportFilterDistrict, setReportFilterDistrict] = useState<string>('all');
  const [reportFilterStatus, setReportFilterStatus] = useState<string>('all');
  const [selectedReportDetail, setSelectedReportDetail] = useState<DamageReportItem | null>(null);

  const loadWorkflowHistory = useCallback(async () => {
    try {
      const data = await fetchWorkflows(filterStatus === 'all' ? undefined : filterStatus, 1, 100);
      setWorkflowList(data.items || []);
      setTotalWorkflowCount(data.total ?? (data.items ? data.items.length : 0));
    } catch {
      // ignore
    }
  }, [filterStatus]);

  const loadDamageReports = useCallback(async () => {
    try {
      const data = await fetchDamageReports(
        reportFilterStatus === 'all' ? undefined : reportFilterStatus,
        reportFilterDistrict === 'all' ? undefined : reportFilterDistrict
      );
      setDamageReports(data.items || []);
      setTotalReportsCount(data.total ?? (data.items ? data.items.length : 0));
    } catch {
      // ignore
    }
  }, [reportFilterStatus, reportFilterDistrict]);

  useEffect(() => {
    loadWorkflowHistory();
  }, [loadWorkflowHistory]);

  useEffect(() => {
    loadDamageReports();
  }, [loadDamageReports]);

  // Validate Intake Form
  const validateForm = (): boolean => {
    setErrorMessage(null);

    if (!district.trim()) {
      setErrorMessage('Please select the affected Sri Lankan District.');
      return false;
    }
    if (!disasterType.trim() || (disasterType === 'Other' && !otherDisasterType.trim())) {
      setErrorMessage('Please select the Disaster Type or specify Other.');
      return false;
    }
    if (totalHousesDamaged < 0) {
      setErrorMessage('Housing damage counts cannot be negative.');
      return false;
    }
    if (displacedFamilies === '' || Number(displacedFamilies) < 0) {
      setErrorMessage('Please enter the Displaced Families Count (cannot be empty or negative).');
      return false;
    }
    if (totalHousesDamaged === 0 && Number(displacedFamilies) === 0 && infraItems.length === 0) {
      setErrorMessage('Please provide non-zero damage impact: enter affected houses, displaced families, or add damaged infrastructure.');
      return false;
    }
    if (!notes.trim() || notes.trim().length < 5) {
      setErrorMessage('Please provide Disaster Situation & Field Notes describing the field conditions.');
      return false;
    }
    if (!reportedBy.trim()) {
      setErrorMessage('Please enter the Reporter / Submitter Name.');
      return false;
    }
    const cleanContact = reporterContact.trim();
    if (!cleanContact || cleanContact.replace(/[^0-9+]/g, '').length < 9) {
      setErrorMessage('Please provide a valid Emergency Contact Phone Number (at least 9–10 digits, e.g. 0771234567 or +94112345670).');
      return false;
    }
    return true;
  };

  // Helper to cleanly parse structured notes into distinct human-readable fields
  const parseStructuredAssessment = (raw?: string) => {
    if (!raw) return { observationNotes: '', immediateNeeds: [] as string[], vulnerabilities: [] as string[], safetyRisk: '' };

    if (!raw.includes('[Geographic Scope]:') && !raw.includes('[Field Observation Details]:')) {
      return {
        observationNotes: raw.trim(),
        immediateNeeds: [] as string[],
        vulnerabilities: [] as string[],
        safetyRisk: '',
      };
    }

    const obsMatch = raw.match(/\[Field Observation Details\]:\s*([\s\S]*)$/i);
    const observationNotes = obsMatch ? obsMatch[1].trim() : '';

    const needsMatch = raw.match(/\[Immediate Relief Needs\]:\s*([^[\n\r]+)/i);
    let immediateNeeds: string[] = [];
    if (needsMatch && needsMatch[1].trim() && needsMatch[1].trim() !== 'None specified') {
      immediateNeeds = needsMatch[1].split(',').map((s) => s.trim()).filter(Boolean);
    }

    const vulnMatch = raw.match(/\[Vulnerabilities\]:\s*([^[\n\r]+)/i);
    let vulnerabilities: string[] = [];
    if (vulnMatch && vulnMatch[1].trim()) {
      vulnerabilities = vulnMatch[1]
        .split(',')
        .map((s) => s.trim())
        .filter((s) => {
          const count = parseInt(s.split(':')[1] || '0', 10);
          return count > 0;
        });
    }

    const safetyMatch = raw.match(/\[Safety & Utilities\]:\s*([^[\n\r]+)/i);
    let safetyRisk = '';
    if (safetyMatch && safetyMatch[1].trim()) {
      const parts = safetyMatch[1].split('|').map((s) => s.trim());
      const riskPart = parts.find((p) => p.startsWith('Risk Level:'));
      if (riskPart) safetyRisk = riskPart.replace('Risk Level:', '').trim();
    }

    return {
      observationNotes: observationNotes || raw,
      immediateNeeds,
      vulnerabilities,
      safetyRisk,
    };
  };

  // Compile full structured notes for backend & AI
  const compileStructuredNotes = () => {
    const lines = [
      `[Geographic Scope]: District: ${district}, DS Division: ${dsDivision || 'N/A'}, GN Division: ${gnDivision || 'N/A'}, Village: ${affectedVillage || 'N/A'}, Landmark: ${addressLandmark || 'N/A'}`,
      `[Human Impact]: Total Affected: ${totalAffectedPeople || 'N/A'} | Displaced Persons: ${totalDisplacedPeople || 'N/A'} | Displaced Families: ${displacedFamilies}`,
      `[Vulnerabilities]: Children: ${vulnerableChildren || 0}, Elderly: ${vulnerableElderly || 0}, Disabled: ${vulnerableDisabled || 0}, Pregnant: ${vulnerablePregnant || 0}, Injured: ${vulnerableInjured || 0}`,
      `[Housing Breakdown]: Destroyed: ${destroyedHouses || 0}, Severe: ${severeHouses || 0}, Partial: ${partialHouses || 0} (Total Damaged Houses: ${totalHousesDamaged})`,
      `[Immediate Relief Needs]: ${immediateNeeds.join(', ') || 'None specified'}`,
      `[Safety & Utilities]: Overall Severity: ${overallSeverity} | Risk Level: ${safetyRisk} | Power: ${electricityAvailable}, Water: ${waterAvailable}, Roads: ${roadAccessAvailable}, Mobile: ${networkAvailable}, Medical: ${medicalAccessAvailable}`,
      `[Reporter Profile]: Type: ${reporterType}, Submitter: ${reportedBy} (${reporterContact}), Email: ${reporterEmail || 'N/A'} | Emergency Contact: ${emergencyContactName} (${emergencyContactPhone} - ${emergencyContactRelation})`,
      `[Field Observation Details]: ${notes}`,
    ];
    return lines.join('\n');
  };

  // 1. Citizen Direct Damage Submission
  const handleSubmitCitizenDamageReport = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setErrorMessage(null);
    setSubmissionSuccessMsg(null);

    try {
      const activeDisasterType = disasterType === 'Other' ? otherDisasterType : disasterType;
      const compiledNotes = compileStructuredNotes();

      await submitCitizenDamageReport({
        district,
        location: affectedVillage ? `${affectedVillage}, ${district}` : district,
        disasterType: activeDisasterType,
        housesDamaged: totalHousesDamaged,
        displacedFamilies: Number(displacedFamilies) || 0,
        reporterName: reportedBy.trim(),
        reporterContact: reporterContact.trim(),
        additionalNotes: compiledNotes,
        infrastructureDamage: infraItems.map((i) => ({
          assetName: i.assetName,
          assetType: i.assetType,
          damageLevel: i.damageLevel,
          estimatedCost: i.estimatedCost,
        })),
      });

      setSubmissionSuccessMsg(
        '✅ Your Disaster Damage & Impact Assessment Form has been submitted successfully! Disaster officers will review the submission and generate the multi-agent recovery strategy.'
      );
      resetForm();
      loadDamageReports();
      setActiveTab('submissions');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit damage report.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Launch Multi-Agent Workflow
  const handleStartIntakeWorkflow = async (overrideData?: DamageIntakeFormData, damageReportId?: string) => {
    const isOverride = !!overrideData;
    if (!isOverride && !validateForm()) return;

    setLoading(true);
    setErrorMessage(null);
    setSubmissionSuccessMsg(null);
    setCurrentPlan(null);
    setWorkflowTrace(null);
    setInspectingHistoryPlan(false);
    setCurrentStep(1);

    const stepTimer = setInterval(() => {
      setCurrentStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 600);

    try {
      const activeDisasterType = disasterType === 'Other' ? otherDisasterType : disasterType;
      const compiledNotes = compileStructuredNotes();

      const intakeData: DamageIntakeFormData = overrideData || {
        district,
        disasterType: activeDisasterType,
        housesDamaged: totalHousesDamaged,
        displacedFamilies: Number(displacedFamilies) || 0,
        reporterName: reportedBy.trim(),
        reporterContact: reporterContact.trim(),
        additionalNotes: compiledNotes,
        infrastructureDamage: infraItems,
      };

      const plan = await startWorkflowFromIntake(intakeData, damageReportId);
      clearInterval(stepTimer);
      setCurrentStep(4);
      setCurrentPlan(plan);

      if (plan.workflowTrace) {
        setWorkflowTrace(plan.workflowTrace);
      } else {
        const trace = await fetchWorkflowTrace(plan.id);
        setWorkflowTrace(trace);
      }
      if (!isOverride) resetForm();
      loadWorkflowHistory();
      loadDamageReports();
      setActiveTab('intake');
    } catch (err: any) {
      clearInterval(stepTimer);
      setErrorMessage(err.message || 'Failed to generate recovery plan.');
    } finally {
      setLoading(false);
    }
  };

  // Trigger Plan Generation from a specific Citizen Damage Submission
  const handleGeneratePlanFromReport = async (report: DamageReportItem) => {
    const intakeData: DamageIntakeFormData = {
      district: report.district,
      disasterType: report.disasterType,
      housesDamaged: report.housesDamaged,
      displacedFamilies: report.displacedFamilies,
      reporterName: report.reporterName,
      reporterContact: report.reporterContact,
      additionalNotes: report.additionalNotes,
      infrastructureDamage: (report.infrastructureDamage || []).map((i) => ({
        assetName: i.assetName,
        assetType: i.assetType,
        damageLevel: i.damageLevel,
        estimatedCost: i.estimatedCost || 100000,
      })),
    };

    setSelectedReportDetail(null);
    await handleStartIntakeWorkflow(intakeData, report.id);
  };

  const handleDeleteReport = async (reportId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this disaster damage submission?')) return;
    try {
      setLoading(true);
      await deleteDamageReport(reportId);
      await loadDamageReports();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete damage report.');
    } finally {
      setLoading(false);
    }
  };

  // Inspect specific workflow from History list
  const handleSelectWorkflow = async (planId: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const planDetail = await fetchWorkflowDetail(planId);
      setCurrentPlan(planDetail);

      if (planDetail.workflowTrace) {
        setWorkflowTrace(planDetail.workflowTrace);
      } else {
        try {
          const trace = await fetchWorkflowTrace(planId);
          setWorkflowTrace(trace);
        } catch {
          setWorkflowTrace(null);
        }
      }

      setInspectingHistoryPlan(true);
      setActiveTab('history');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load workflow detail.');
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

  const addOrUpdateInfraItem = () => {
    if (!newAsset.assetName.trim()) {
      alert('Please enter an infrastructure asset or facility name (e.g. Kalu Ganga Bridge).');
      return;
    }
    if (!newAsset.estimatedCost || newAsset.estimatedCost <= 0) {
      alert('Please enter a valid estimated repair cost greater than LKR 0.');
      return;
    }

    if (editingInfraIndex !== null) {
      const updated = [...infraItems];
      updated[editingInfraIndex] = { ...newAsset, assetName: newAsset.assetName.trim() };
      setInfraItems(updated);
      setEditingInfraIndex(null);
    } else {
      setInfraItems([...infraItems, { ...newAsset, assetName: newAsset.assetName.trim() }]);
    }
    setNewAsset({ assetName: '', assetType: 'Road', damageLevel: 'Moderate', estimatedCost: 100000, details: '' });
  };

  const handleEditInfra = (index: number) => {
    setNewAsset(infraItems[index]);
    setEditingInfraIndex(index);
  };

  const removeInfraItem = (index: number) => {
    setInfraItems(infraItems.filter((_, i) => i !== index));
    if (editingInfraIndex === index) {
      setEditingInfraIndex(null);
      setNewAsset({ assetName: '', assetType: 'Road', damageLevel: 'Moderate', estimatedCost: 100000, details: '' });
    }
  };

  const toggleImmediateNeed = (need: string) => {
    setImmediateNeeds((prev) =>
      prev.includes(need) ? prev.filter((n) => n !== need) : [...prev, need]
    );
  };

  // ── USER-FRIENDLY FORMATTER FOR ALLOW-LISTED TOOL ACTIVITY ──
  const renderToolCard = (tool: ToolCallDto, idx: number) => {
    let parsedInput: any = {};
    let parsedOutput: any = {};
    try { parsedInput = JSON.parse(tool.inputJson); } catch {}
    try { parsedOutput = JSON.parse(tool.outputJson); } catch {}

    const toolMeta: Record<string, { title: string; bg: string; color: string; desc: string }> = {
      tool_query_shelter_capacity: {
        title: 'Emergency Evacuation Shelter Capacity Query',
        bg: '#eff6ff',
        color: '#1d4ed8',
        desc: 'Scanned official shelter registry for active centers with open bed capacity in the affected district.',
      },
      tool_estimate_repair_costs: {
        title: 'Civil Infrastructure Repair Cost Benchmark Estimator',
        bg: '#f0f9ff',
        color: '#0369a1',
        desc: 'Calculated official public infrastructure repair cost benchmarks based on damage severity ratings.',
      },
      tool_match_ngo_by_sector: {
        title: 'Registered NGO Partner Capability Matcher',
        bg: '#f0fdf4',
        color: '#15803d',
        desc: 'Filtered accredited humanitarian partner organizations by sector expertise and operational districts.',
      },
      tool_calculate_cash_stipend_budget: {
        title: 'Emergency Citizen Subsistence Cash Calculator',
        bg: '#faf5ff',
        color: '#7e22ce',
        desc: 'Calculated statutory emergency living stipends based on displaced family count and relief duration.',
      },
    };

    const meta = toolMeta[tool.toolName] || {
      title: tool.toolName.replace(/_/g, ' ').toUpperCase(),
      bg: '#f8fafc',
      color: '#334155',
      desc: 'Deterministic system calculation and allow-listed database query.',
    };

    return (
      <div key={idx} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div>
              <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block' }}>{meta.title}</strong>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{meta.desc}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '6px', background: meta.bg, color: meta.color }}>
              Verified Allow-Listed
            </span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{tool.durationMs}ms</span>
          </div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginTop: '0.75rem' }}>
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
                      <strong style={{ color: '#0f172a', display: 'block' }}>{s.name || s.Name || s.shelterName || 'Shelter Center'}</strong>
                      <span style={{ color: '#64748b' }}>{s.district || s.District || s.location || s.Location || ''} • Available Beds: </span>
                      <strong style={{ color: '#16a34a' }}>{s.remainingBeds ?? s.RemainingBeds ?? s.remainingCapacity ?? s.RemainingCapacity ?? 0}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '0.6rem 0.8rem', color: '#991b1b', fontSize: '0.825rem' }}>
                  <strong>No Registered Shelters Found in {parsedInput.district || district || 'District'}:</strong>{' '}
                  <span>
                    0 open beds registered in this district. Deficit of {parsedInput.requiredBeds || parsedOutput.deficit || parsedOutput.Deficit || 0} beds requires emergency temporary relief shelter allocation.
                  </span>
                </div>
              )}
            </div>
          )}

          {tool.toolName === 'tool_estimate_repair_costs' && (
            <div>
              <div style={{ marginBottom: '0.6rem', fontSize: '0.85rem' }}>
                Assessed Infrastructure Assets: <strong style={{ color: '#0369a1' }}>{Array.isArray(parsedOutput) ? parsedOutput.length : (parsedInput?.assets?.length || (Array.isArray(parsedOutput?.list) ? parsedOutput.list.length : 0))} Assets</strong>
              </div>
              {Array.isArray(parsedOutput) && parsedOutput.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.6rem' }}>
                  {parsedOutput.map((item: any, bIdx: number) => (
                    <div key={bIdx} style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '0.7rem 0.9rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                      <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.85rem' }}>{item.assetName || item.AssetName || 'Infrastructure Asset'}</strong>
                      <div style={{ color: '#64748b', margin: '0.2rem 0' }}>
                        Type: <span style={{ fontWeight: 600, color: '#334155' }}>{item.assetType || item.AssetType || 'General'}</span>
                      </div>
                      <div style={{ marginTop: '0.35rem', color: '#0369a1', fontWeight: 700 }}>
                        Benchmark: Rs. {Number(item.standardCostLkrMin || item.StandardCostLkrMin || 0).toLocaleString()} – Rs. {Number(item.standardCostLkrMax || item.StandardCostLkrMax || 0).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Standardized repair benchmark rates applied.</span>
              )}
            </div>
          )}

          {tool.toolName === 'tool_match_ngo_by_sector' && (
            <div>
              <div style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                Operational Region: <strong style={{ color: '#15803d' }}>{parsedInput.district || district}</strong>
              </div>
              {Array.isArray(parsedOutput.qualifiedNGOs) && parsedOutput.qualifiedNGOs.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.5rem' }}>
                  {parsedOutput.qualifiedNGOs.map((ngo: any, nIdx: number) => (
                    <div key={nIdx} style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                      <strong style={{ color: '#0f172a', display: 'block' }}>{ngo.name || ngo.Name || ngo.ngoName || 'Humanitarian Partner'}</strong>
                      <span style={{ color: '#64748b' }}>Matched Sectors: {Array.isArray(ngo.matchedSectors || ngo.MatchedSectors) ? (ngo.matchedSectors || ngo.MatchedSectors).join(', ') : (ngo.sectors || ngo.Sectors || 'General')}</span>
                      <div style={{ marginTop: '0.2rem', color: '#15803d', fontWeight: 700 }}>
                        Operating Districts: {Array.isArray(ngo.operatingDistricts || ngo.OperatingDistricts) ? (ngo.operatingDistricts || ngo.OperatingDistricts).join(', ') : 'All Districts'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Verified accredited humanitarian partner organizations matched.</span>
              )}
            </div>
          )}

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

          {tool.toolName !== 'tool_query_shelter_capacity' &&
           tool.toolName !== 'tool_estimate_repair_costs' &&
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

  // ── RENDER ORIGINATING INTAKE CARD ──
  const renderOriginatingIntakeCard = () => {
    const intake: OriginatingIntake | undefined = currentPlan?.originatingIntake;
    if (!intake && !district) return null;

    const displayDistrict = intake?.district || district;
    const displayDisaster = intake?.disasterType || (disasterType === 'Other' ? otherDisasterType : disasterType);
    const displayHouses = intake ? intake.housesDamaged : totalHousesDamaged;
    const displayFamilies = intake ? intake.displacedFamilies : (displacedFamilies || 0);
    const displayReporter = intake?.reporterName || reportedBy;
    const displayContact = intake?.reporterContact || reporterContact;
    const rawNotes = intake?.additionalNotes || notes;
    const displayInfra = intake?.infrastructureDamage || infraItems;

    const parsed = parseStructuredAssessment(rawNotes);

    return (
      <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              Originating Disaster &amp; Citizen Impact Assessment
            </h3>
          </div>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 800,
            padding: '0.25rem 0.75rem',
            borderRadius: '6px',
            background: '#e0f2fe',
            color: '#0369a1',
            border: '1px solid #bae6fd',
          }}>
            Submitted Field Context
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Incident Scope</div>
            <div style={{ marginTop: '0.35rem', fontSize: '0.9rem', color: '#0f172a' }}>
              <strong>District:</strong> {displayDistrict}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#0f172a' }}>
              <strong>Disaster Type:</strong> <span style={{ color: '#b91c1c', fontWeight: 700 }}>{displayDisaster}</span>
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Human &amp; Housing Impact</div>
            <div style={{ marginTop: '0.35rem', fontSize: '0.9rem', color: '#0f172a' }}>
              <strong>Houses Damaged:</strong> <span style={{ fontWeight: 800, color: '#c2410c' }}>{displayHouses}</span>
            </div>
            <div style={{ fontSize: '0.9rem', color: '#0f172a' }}>
              <strong>Displaced Families:</strong> <span style={{ fontWeight: 800, color: '#1e40af' }}>{displayFamilies}</span>
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Reporter Information</div>
            <div style={{ marginTop: '0.35rem', fontSize: '0.9rem', color: '#0f172a' }}>
              <strong>Submitted By:</strong> {displayReporter || 'Citizen Reporter'}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#0f172a' }}>
              <strong>Emergency Phone:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{displayContact || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Immediate Needs & Vulnerability Tags */}
        {(parsed.immediateNeeds.length > 0 || parsed.vulnerabilities.length > 0 || parsed.safetyRisk) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
            {parsed.safetyRisk && (
              <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '6px', background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                Risk: {parsed.safetyRisk}
              </span>
            )}
            {parsed.immediateNeeds.map((need, idx) => (
              <span key={idx} style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: '6px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                {need}
              </span>
            ))}
            {parsed.vulnerabilities.map((vuln, idx) => (
              <span key={idx} style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: '6px', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                {vuln}
              </span>
            ))}
          </div>
        )}

        {/* Clean Observation Notes */}
        {parsed.observationNotes && (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>
              Situation &amp; Field Observation Notes
            </span>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e293b', fontStyle: 'normal', lineHeight: 1.5 }}>
              {parsed.observationNotes}
            </p>
          </div>
        )}

        {displayInfra && displayInfra.length > 0 && (
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
              Damaged Lifeline Infrastructure Reported ({displayInfra.length})
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.6rem' }}>
              {displayInfra.map((item, idx) => (
                <div key={idx} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.6rem 0.8rem', fontSize: '0.825rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                    <strong style={{ color: '#0f172a' }}>{item.assetName}</strong>
                    <span style={{
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      background: item.damageLevel === 'Destroyed' ? '#fee2e2' : item.damageLevel === 'Severe' ? '#ffedd5' : '#fef9c3',
                      color: item.damageLevel === 'Destroyed' ? '#b91c1c' : item.damageLevel === 'Severe' ? '#c2410c' : '#854d0e',
                    }}>
                      {item.damageLevel}
                    </span>
                  </div>
                  <div style={{ color: '#64748b' }}>
                    Type: <span style={{ fontWeight: 600, color: '#334155' }}>{item.assetType}</span>
                    {item.estimatedCost ? ` • Est. Rs. ${Number(item.estimatedCost).toLocaleString()}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── RENDER PLAN & TRACE SECTION ──
  const renderPlanAndTraceSection = () => {
    if (!workflowTrace) return null;
    const isAutoApproved = currentPlan?.status === 'Approved' && (!currentPlan?.reviewedBy || currentPlan?.reviewedBy === 'Recovery-Agent-04');

    return (
      <div style={{ marginTop: '2.5rem' }}>
        {renderOriginatingIntakeCard()}

        {/* Top Banner with Decision Actions & Metadata */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1.75rem 2rem', marginBottom: '1.5rem', boxShadow: '0 4px 16px -2px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  {currentPlan?.planName || 'Autonomous Master Recovery Strategy'}
                </h2>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  background: currentPlan?.status === 'Approved' ? '#dcfce7' : currentPlan?.status === 'PendingApproval' ? '#fef3c7' : '#fee2e2',
                  color: currentPlan?.status === 'Approved' ? '#15803d' : currentPlan?.status === 'PendingApproval' ? '#b45309' : '#b91c1c',
                }}>
                  ● {currentPlan?.status}
                </span>

                {isAutoApproved ? (
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                    Deterministically Auto-Approved (Within Budget Policy Limits)
                  </span>
                ) : currentPlan?.status === 'PendingApproval' ? (
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800, background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>
                    Requires Officer Approval (High Scope / Policy Boundary)
                  </span>
                ) : null}
              </div>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                {workflowTrace.executionSummary}
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {isOfficer ? (
                <>
                  <button
                    onClick={() => handleDecision('Approve')}
                    disabled={loading || currentPlan?.status === 'Approved'}
                    style={{
                      padding: '0.6rem 1.2rem',
                      background: currentPlan?.status === 'Approved' ? '#94a3b8' : '#10b981',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      cursor: currentPlan?.status === 'Approved' ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    {currentPlan?.status === 'Approved' ? 'Plan Approved' : 'Approve Plan'}
                  </button>
                  <button
                    onClick={() => setShowRevisionModal(true)}
                    disabled={loading}
                    style={{ padding: '0.6rem 1.2rem', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    Request Revision
                  </button>
                  <button
                    onClick={() => handleDecision('Reject')}
                    disabled={loading || currentPlan?.status === 'Rejected'}
                    style={{
                      padding: '0.6rem 1.2rem',
                      background: currentPlan?.status === 'Rejected' ? '#94a3b8' : '#ef4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      cursor: currentPlan?.status === 'Rejected' ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    Reject
                  </button>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.45rem 0.85rem', borderRadius: '8px', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                  <span>View-Only (Approval restricted to Officer/Admin)</span>
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
              <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Total Plan Budget</span>
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
              <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Agent Latency</span>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#7c3aed' }}>
                {workflowTrace.totalDurationMs} ms
              </p>
            </div>
          </div>
        </div>

        {/* Trace Sub-Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', overflowX: 'auto' }}>
          <button
            onClick={() => setTraceTab('agents')}
            style={{ padding: '0.5rem 1rem', border: 'none', background: 'none', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', color: traceTab === 'agents' ? '#2563eb' : '#64748b', borderBottom: traceTab === 'agents' ? '2px solid #2563eb' : 'none', marginBottom: '-0.5rem', whiteSpace: 'nowrap' }}
          >
            4-Agent Reasoning Timeline ({workflowTrace.agentSteps?.length ?? 0})
          </button>
          <button
            onClick={() => setTraceTab('tasks')}
            style={{ padding: '0.5rem 1rem', border: 'none', background: 'none', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', color: traceTab === 'tasks' ? '#2563eb' : '#64748b', borderBottom: traceTab === 'tasks' ? '2px solid #2563eb' : 'none', marginBottom: '-0.5rem', whiteSpace: 'nowrap' }}
          >
            Actionable Recovery Tasks ({currentPlan?.tasks?.length ?? 0})
          </button>
          <button
            onClick={() => setTraceTab('tools')}
            style={{ padding: '0.5rem 1rem', border: 'none', background: 'none', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', color: traceTab === 'tools' ? '#2563eb' : '#64748b', borderBottom: traceTab === 'tools' ? '2px solid #2563eb' : 'none', marginBottom: '-0.5rem', whiteSpace: 'nowrap' }}
          >
            Verified Tool Activity ({workflowTrace.toolCalls?.length ?? 0})
          </button>
          <button
            onClick={() => setTraceTab('guardrails')}
            style={{ padding: '0.5rem 1rem', border: 'none', background: 'none', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', color: traceTab === 'guardrails' ? '#2563eb' : '#64748b', borderBottom: traceTab === 'guardrails' ? '2px solid #2563eb' : 'none', marginBottom: '-0.5rem', whiteSpace: 'nowrap' }}
          >
            Policy &amp; Guardrail Verification ({workflowTrace.validationResults?.length ?? 0})
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

        {/* Sub-Tab 3: Tool Activity */}
        {traceTab === 'tools' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {(workflowTrace.toolCalls ?? []).map((tool, idx) => renderToolCard(tool, idx))}
          </div>
        )}

        {/* Sub-Tab 4: Policy & Guardrails */}
        {traceTab === 'guardrails' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(workflowTrace.validationResults ?? []).map((v, idx) => {
              const cleanTitle = v.ruleName.replace(/^(Code|AI):\s*/i, '').trim();
              return (
                <div key={idx} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', display: 'flex', alignItems: 'flex-start', gap: '1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <span style={{ fontSize: '1rem', marginTop: '0.1rem', color: v.passed ? '#16a34a' : '#ea580c', fontWeight: 800 }}>{v.passed ? '✓' : '!'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{cleanTitle}</strong>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        background: v.passed ? '#f0fdf4' : '#fff7ed',
                        color: v.passed ? '#15803d' : '#c2410c',
                        border: `1px solid ${v.passed ? '#bbf7d0' : '#fed7aa'}`,
                      }}>
                        {v.passed ? 'POLICY PASSED' : 'FLAGGED FOR OFFICER REVIEW'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.45 }}>{v.detail}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '1.5rem 1rem', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: '#0f172a' }}>
      
      {/* ── HEADER & NAVIGATION TABS ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#0f172a' }}>
              Autonomous Disaster Recovery Planning Agent
            </h1>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
            4-Agent Multi-Step Reasoning Engine powered by Google Gemini with deterministic policy guardrails &amp; field intake.
          </p>
        </div>

        {/* Action Controls & Role Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.45rem 0.85rem', borderRadius: '10px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Logged in as:</span>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: '6px',
              background: user?.role === 'Admin' ? '#faf5ff' : user?.role === 'DisasterOfficer' ? '#eff6ff' : user?.role === 'Responder' ? '#fffbeb' : '#f0fdf4',
              color: user?.role === 'Admin' ? '#7e22ce' : user?.role === 'DisasterOfficer' ? '#1e40af' : user?.role === 'Responder' ? '#b45309' : '#15803d',
              border: `1px solid ${user?.role === 'Admin' ? '#e9d5ff' : user?.role === 'DisasterOfficer' ? '#bfdbfe' : user?.role === 'Responder' ? '#fde68a' : '#bbf7d0'}`,
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              {user?.role === 'Admin' ? 'System Admin' : user?.role === 'DisasterOfficer' ? 'Disaster Officer' : user?.role === 'Responder' ? 'Field Responder' : 'Citizen'}
            </span>
          </div>

          {/* 3 Main Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#f1f5f9', padding: '0.3rem', borderRadius: '10px' }}>
            <button
              onClick={() => {
                setActiveTab('intake');
                setInspectingHistoryPlan(false);
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
              Field Damage Assessment
            </button>
            <button
              onClick={() => {
                setActiveTab('submissions');
                loadDamageReports();
              }}
              style={{
                padding: '0.55rem 1.1rem',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                backgroundColor: activeTab === 'submissions' ? '#2563eb' : 'transparent',
                color: activeTab === 'submissions' ? '#ffffff' : '#64748b',
                transition: 'all 0.15s ease',
              }}
            >
              Citizen Submissions ({totalReportsCount || damageReports.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('history');
                loadWorkflowHistory();
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
              Past Plans &amp; Audit ({totalWorkflowCount || workflowList.length})
            </button>
          </div>
        </div>
      </div>

      {/* ── NOTIFICATION BANNERS ── */}
      {submissionSuccessMsg && (
        <div style={{ padding: '1rem 1.25rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', color: '#15803d', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(22, 163, 74, 0.08)' }}>
          <span style={{ fontSize: '0.925rem', fontWeight: 700 }}>{submissionSuccessMsg}</span>
          <button onClick={() => setSubmissionSuccessMsg(null)} style={{ background: 'none', border: 'none', color: '#15803d', cursor: 'pointer', fontWeight: 800, fontSize: '1rem' }}>x</button>
        </div>
      )}

      {errorMessage && (
        <div style={{ padding: '1rem 1.25rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#b91c1c', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(220, 38, 38, 0.08)' }}>
          <span style={{ fontSize: '0.925rem', fontWeight: 700 }}>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontWeight: 800, fontSize: '1rem' }}>x</button>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          TAB 1: PROFESSIONAL 8-SECTION DISASTER DAMAGE INTAKE FORM
         ═════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'intake' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Global scoped styles for form fields */}
          <style>{`
            .rf-section { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 2rem; box-shadow: 0 2px 8px rgba(0,0,0,0.03); }
            .rf-section-header { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 1.75rem; border-bottom: 2px solid #f1f5f9; padding-bottom: 0.9rem; }
            .rf-section-header h3 { margin: 0; font-size: 1.05rem; font-weight: 800; color: #0f172a; }
            .rf-section-header span { font-size: 0.775rem; color: #64748b; display: block; margin-top: 0.15rem; }
            .rf-grid { display: grid; gap: 1.5rem; margin-bottom: 1.5rem; }
            .rf-grid-3 { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
            .rf-grid-4 { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
            .rf-grid-2 { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
            .rf-grid-5 { grid-template-columns: repeat(auto-fit, minmax(155px, 1fr)); }
            .rf-grid:last-of-type { margin-bottom: 0; }
            .rf-field { display: flex; flex-direction: column; gap: 0.45rem; }
            .rf-field label { font-size: 0.8rem; font-weight: 700; color: #334155; letter-spacing: 0.01em; }
            .rf-field input, .rf-field select, .rf-field textarea {
              width: 100%; padding: 0.65rem 0.85rem; border: 1.5px solid #cbd5e1; border-radius: 8px;
              font-size: 0.875rem; font-family: inherit; background: #fff;
              transition: border-color 0.15s ease, box-shadow 0.15s ease;
              box-sizing: border-box;
            }
            .rf-field input:focus, .rf-field select:focus, .rf-field textarea:focus {
              outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.10);
            }
            .rf-field input::placeholder, .rf-field textarea::placeholder { color: #94a3b8; }
            .rf-field .rf-hint { font-size: 0.7rem; color: #94a3b8; margin-top: 0.1rem; }
            .rf-subcard { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1.25rem 1.5rem; }
            .rf-subcard-label { font-size: 0.7rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; display: block; margin-bottom: 1rem; }
          `}</style>

          {/* SECTION 1: INCIDENT INFORMATION */}
          <div className="rf-section">
            <div className="rf-section-header">
              <div>
                <h3>Section 1: Incident &amp; Geographic Information</h3>
                <span>Disaster origin, date/time, and exact administrative location</span>
              </div>
            </div>

            <div className="rf-grid rf-grid-3">
              <div className="rf-field">
                <label>Disaster Type <span style={{ color: '#dc2626' }}>*</span></label>
                <select value={disasterType} onChange={(e) => setDisasterType(e.target.value)}>
                  {DISASTER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {disasterType === 'Other' && (
                <div className="rf-field">
                  <label>Specify Disaster Type <span style={{ color: '#dc2626' }}>*</span></label>
                  <input type="text" placeholder="e.g. Chemical Spill, Cyclone Surge" value={otherDisasterType} onChange={(e) => setOtherDisasterType(e.target.value)} />
                </div>
              )}

              <div className="rf-field">
                <label>District <span style={{ color: '#dc2626' }}>*</span></label>
                <select value={district} onChange={(e) => setDistrict(e.target.value)}>
                  {SRI_LANKA_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="rf-field">
                <label>Incident Date &amp; Time</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} style={{ flex: 1 }} />
                  <input type="time" value={incidentTime} onChange={(e) => setIncidentTime(e.target.value)} style={{ width: '115px' }} />
                </div>
              </div>
            </div>

            <div className="rf-grid rf-grid-4" style={{ marginBottom: 0 }}>
              <div className="rf-field">
                <label>DS Division (Divisional Secretariat)</label>
                <input type="text" placeholder="e.g. Kalutara / Horana" value={dsDivision} onChange={(e) => setDsDivision(e.target.value)} />
              </div>
              <div className="rf-field">
                <label>GN Division (Grama Niladhari)</label>
                <input type="text" placeholder="e.g. 714-B Kalutara North" value={gnDivision} onChange={(e) => setGnDivision(e.target.value)} />
              </div>
              <div className="rf-field">
                <label>Affected Village / Town</label>
                <input type="text" placeholder="e.g. Nagoda, Deshashree Village" value={affectedVillage} onChange={(e) => setAffectedVillage(e.target.value)} />
              </div>
              <div className="rf-field">
                <label>Nearby Landmark / Reference</label>
                <input type="text" placeholder="e.g. Near Nagoda Hospital Junction" value={addressLandmark} onChange={(e) => setAddressLandmark(e.target.value)} />
              </div>
            </div>
          </div>

          {/* SECTION 2: HUMAN IMPACT & VULNERABILITY */}
          <div className="rf-section">
            <div className="rf-section-header">
              <div>
                <h3>Section 2: Human Impact &amp; Vulnerable Population</h3>
                <span>Displaced families and high-priority vulnerable individuals</span>
              </div>
            </div>

            <div className="rf-grid rf-grid-3">
              <div className="rf-field">
                <label>Displaced Families Count <span style={{ color: '#dc2626' }}>*</span></label>
                <input type="number" min="0" required placeholder="e.g. 25" value={displacedFamilies}
                  onChange={(e) => setDisplacedFamilies(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))} />
              </div>
              <div className="rf-field">
                <label>Total Displaced Persons</label>
                <input type="number" min="0" placeholder="e.g. 110" value={totalDisplacedPeople}
                  onChange={(e) => setTotalDisplacedPeople(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))} />
              </div>
              <div className="rf-field">
                <label>Total Affected Persons in Area</label>
                <input type="number" min="0" placeholder="e.g. 350" value={totalAffectedPeople}
                  onChange={(e) => setTotalAffectedPeople(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))} />
              </div>
            </div>

            <div className="rf-subcard">
              <span className="rf-subcard-label">Vulnerable Persons Breakdown (Optional Field Triage)</span>
              <div className="rf-grid rf-grid-5" style={{ marginBottom: 0 }}>
                <div className="rf-field">
                  <label>Children (&lt;12y)</label>
                  <input type="number" min="0" placeholder="0" value={vulnerableChildren}
                    onChange={(e) => setVulnerableChildren(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))} />
                </div>
                <div className="rf-field">
                  <label>Elderly (&gt;65y)</label>
                  <input type="number" min="0" placeholder="0" value={vulnerableElderly}
                    onChange={(e) => setVulnerableElderly(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))} />
                </div>
                <div className="rf-field">
                  <label>Disabled Persons</label>
                  <input type="number" min="0" placeholder="0" value={vulnerableDisabled}
                    onChange={(e) => setVulnerableDisabled(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))} />
                </div>
                <div className="rf-field">
                  <label>Pregnant Women</label>
                  <input type="number" min="0" placeholder="0" value={vulnerablePregnant}
                    onChange={(e) => setVulnerablePregnant(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))} />
                </div>
                <div className="rf-field">
                  <label>Injured Persons</label>
                  <input type="number" min="0" placeholder="0" value={vulnerableInjured}
                    onChange={(e) => setVulnerableInjured(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))} />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: HOUSING DAMAGE BREAKDOWN */}
          <div className="rf-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.9rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>Section 3: Housing Damage Severity Breakdown</h3>
                <span style={{ fontSize: '0.775rem', color: '#64748b' }}>Categorized assessment with automatic total calculation</span>
              </div>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '0.35rem 0.85rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#1e40af', fontWeight: 700 }}>Total Damaged Houses:</span>
                <strong style={{ fontSize: '1.1rem', color: '#1e3a8a' }}>{totalHousesDamaged}</strong>
              </div>
            </div>

            <div className="rf-grid rf-grid-3" style={{ marginBottom: 0 }}>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '1.25rem' }}>
                <div className="rf-field">
                  <label style={{ color: '#991b1b', fontWeight: 800 }}>Fully Destroyed Houses</label>
                  <input type="number" min="0" placeholder="0" value={destroyedHouses}
                    onChange={(e) => setDestroyedHouses(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                    style={{ borderColor: '#fca5a5' }} />
                  <span className="rf-hint" style={{ color: '#b91c1c' }}>100% Structural Loss</span>
                </div>
              </div>
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', padding: '1.25rem' }}>
                <div className="rf-field">
                  <label style={{ color: '#9a3412', fontWeight: 800 }}>Severely Damaged Houses</label>
                  <input type="number" min="0" placeholder="0" value={severeHouses}
                    onChange={(e) => setSevereHouses(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                    style={{ borderColor: '#fdba74' }} />
                  <span className="rf-hint" style={{ color: '#c2410c' }}>Major Roof / Wall Collapses</span>
                </div>
              </div>
              <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '10px', padding: '1.25rem' }}>
                <div className="rf-field">
                  <label style={{ color: '#854d0e', fontWeight: 800 }}>Partially Damaged Houses</label>
                  <input type="number" min="0" placeholder="0" value={partialHouses}
                    onChange={(e) => setPartialHouses(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                    style={{ borderColor: '#fde047' }} />
                  <span className="rf-hint" style={{ color: '#a16207' }}>Inundated / Minor Repairs</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: INFRASTRUCTURE DAMAGE BUILDER */}
          <div className="rf-section">
            <div className="rf-section-header">
              <div>
                <h3>Section 4: Damaged Public Infrastructure Builder</h3>
                <span>Lifeline bridges, roads, hospitals, schools, electricity &amp; water conduits</span>
              </div>
            </div>

            {/* Sub-form to Add or Edit */}
            <div className="rf-subcard">
              <span className="rf-subcard-label">Log Individual Infrastructure Asset</span>
              <div className="rf-grid rf-grid-4">
                <div className="rf-field">
                  <label>Asset Name / Description <span style={{ color: '#dc2626' }}>*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Kalu Ganga Main Bridge"
                    value={newAsset.assetName}
                    onChange={(e) => setNewAsset({ ...newAsset, assetName: e.target.value })}
                  />
                </div>

                <div className="rf-field">
                  <label>Infrastructure Type</label>
                  <select
                    value={newAsset.assetType}
                    onChange={(e) => setNewAsset({ ...newAsset, assetType: e.target.value })}
                  >
                    {ASSET_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                <div className="rf-field">
                  <label>Damage Severity</label>
                  <select
                    value={newAsset.damageLevel}
                    onChange={(e) => setNewAsset({ ...newAsset, damageLevel: e.target.value })}
                  >
                    {DAMAGE_LEVELS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div className="rf-field">
                  <label>Estimated Repair Cost (LKR)</label>
                  <input
                    type="number"
                    step="10000"
                    placeholder="e.g. 500000"
                    value={newAsset.estimatedCost}
                    onChange={(e) => setNewAsset({ ...newAsset, estimatedCost: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                {editingInfraIndex !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingInfraIndex(null);
                      setNewAsset({ assetName: '', assetType: 'Road', damageLevel: 'Moderate', estimatedCost: 100000, details: '' });
                    }}
                    style={{ padding: '0.55rem 0.95rem', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={addOrUpdateInfraItem}
                  style={{
                    padding: '0.55rem 1.1rem',
                    background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <span>{editingInfraIndex !== null ? 'Update Asset' : '+ Add Damaged Asset'}</span>
                </button>
              </div>
            </div>

            {/* List of Assets */}
            {infraItems.length === 0 ? (
              <div style={{ padding: '1.25rem', textAlign: 'center', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', color: '#64748b', fontSize: '0.85rem' }}>
                No damaged infrastructure records added yet. Use the form above to log roads, bridges, or facilities.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {infraItems.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <strong style={{ color: '#0f172a' }}>{item.assetName}</strong>
                      <span style={{ padding: '0.15rem 0.45rem', background: '#eff6ff', color: '#1e40af', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                        {item.assetType}
                      </span>
                      <span style={{
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: item.damageLevel === 'Destroyed' ? '#fee2e2' : item.damageLevel === 'Severe' ? '#ffedd5' : '#fef9c3',
                        color: item.damageLevel === 'Destroyed' ? '#b91c1c' : item.damageLevel === 'Severe' ? '#c2410c' : '#854d0e',
                      }}>
                        {item.damageLevel}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <strong style={{ color: '#15803d' }}>
                        Rs. {Number(item.estimatedCost).toLocaleString()}
                      </strong>
                      <button
                        type="button"
                        onClick={() => handleEditInfra(idx)}
                        style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => removeInfraItem(idx)}
                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 5: IMMEDIATE ASSISTANCE REQUIRED */}
          <div className="rf-section">
            <div className="rf-section-header">
              <div>
                <h3>Section 5: Immediate Humanitarian Assistance Required</h3>
                <span>Select urgent relief supplies needed for the displaced population</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
              {IMMEDIATE_NEEDS_OPTIONS.map((need) => {
                const active = immediateNeeds.includes(need);
                return (
                  <button
                    key={need}
                    type="button"
                    onClick={() => toggleImmediateNeed(need)}
                    style={{
                      padding: '0.5rem 0.95rem',
                      borderRadius: '20px',
                      border: `1px solid ${active ? '#2563eb' : '#cbd5e1'}`,
                      background: active ? '#eff6ff' : '#ffffff',
                      color: active ? '#1d4ed8' : '#475569',
                      fontWeight: active ? 700 : 500,
                      fontSize: '0.825rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{active ? '✓' : '+'}</span>
                    <span>{need}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 6: SAFETY CONDITIONS & UTILITY ACCESS */}
          <div className="rf-section">
            <div className="rf-section-header">
              <div>
                <h3>Section 6: Safety Conditions &amp; Utility Accessibility</h3>
                <span>Field situation risk ratings and operational utilities</span>
              </div>
            </div>

            <div className="rf-grid rf-grid-2">
              <div className="rf-field">
                <label>Overall Severity Level</label>
                <select value={overallSeverity} onChange={(e) => setOverallSeverity(e.target.value as any)}>
                  <option value="Low">Low</option>
                  <option value="Moderate">Moderate</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div className="rf-field">
                <label>Immediate Safety Risk</label>
                <select value={safetyRisk} onChange={(e) => setSafetyRisk(e.target.value as any)}>
                  <option value="No Immediate Risk">No Immediate Risk</option>
                  <option value="Potential Risk">Potential Risk</option>
                  <option value="High Risk">High Risk</option>
                  <option value="Life Threatening">Life Threatening</option>
                </select>
              </div>
            </div>

            <div className="rf-subcard">
              <span className="rf-subcard-label">Utility &amp; Access Status</span>
              <div className="rf-grid rf-grid-5" style={{ marginBottom: 0 }}>
                <div className="rf-field">
                  <label>Electricity Grid</label>
                  <select value={electricityAvailable} onChange={(e) => setElectricityAvailable(e.target.value as any)}>
                    <option value="Yes">Yes (Fully Available)</option>
                    <option value="Partial">Partial / Blackouts</option>
                    <option value="No">No (Grid Offline)</option>
                  </select>
                </div>
                <div className="rf-field">
                  <label>Clean Pipe Water</label>
                  <select value={waterAvailable} onChange={(e) => setWaterAvailable(e.target.value as any)}>
                    <option value="Yes">Yes (Available)</option>
                    <option value="Partial">Partial (Wells contaminated)</option>
                    <option value="No">No (Cut Off)</option>
                  </select>
                </div>
                <div className="rf-field">
                  <label>Road Access</label>
                  <select value={roadAccessAvailable} onChange={(e) => setRoadAccessAvailable(e.target.value as any)}>
                    <option value="Yes">Yes (Open)</option>
                    <option value="Partial">Partial (4x4 only)</option>
                    <option value="No">No (Submerged / Blocked)</option>
                  </select>
                </div>
                <div className="rf-field">
                  <label>Mobile Network</label>
                  <select value={networkAvailable} onChange={(e) => setNetworkAvailable(e.target.value as any)}>
                    <option value="Yes">Yes (Active)</option>
                    <option value="Partial">Partial (Weak signal)</option>
                    <option value="No">No (Towers down)</option>
                  </select>
                </div>
                <div className="rf-field">
                  <label>Medical Access</label>
                  <select value={medicalAccessAvailable} onChange={(e) => setMedicalAccessAvailable(e.target.value as any)}>
                    <option value="Yes">Yes (Hospital open)</option>
                    <option value="Partial">Partial (First aid only)</option>
                    <option value="No">No (Inaccessible)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 7: EVIDENCE & FIELD OBSERVATIONS */}
          <div className="rf-section">
            <div className="rf-section-header">
              <div>
                <h3>Section 7: Field Observations &amp; Damage Evidence Notes</h3>
                <span>Detailed narrative, isolated pockets, or stranded communities</span>
              </div>
            </div>
            <div className="rf-field">
              <label>Observation Notes <span style={{ color: '#dc2626' }}>*</span></label>
              <textarea
                rows={5}
                required
                placeholder="Describe additional damage, urgent risks, blocked roads, vulnerable persons, or other important observations..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* SECTION 8: REPORTER INFORMATION */}
          <div className="rf-section">
            <div className="rf-section-header">
              <div>
                <h3>Section 8: Reporter &amp; Emergency Contact Verification</h3>
                <span>Accountability and immediate field verification contact</span>
              </div>
            </div>

            <div className="rf-grid rf-grid-4">
              <div className="rf-field">
                <label>Reporter Full Name <span style={{ color: '#dc2626' }}>*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kasun Perera"
                  value={reportedBy}
                  onChange={(e) => setReportedBy(e.target.value)}
                />
              </div>

              <div className="rf-field">
                <label>Phone Number <span style={{ color: '#dc2626' }}>*</span></label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 0771234567"
                  value={reporterContact}
                  onChange={(e) => setReporterContact(e.target.value)}
                />
              </div>

              <div className="rf-field">
                <label>Reporter Role / Type</label>
                <select
                  value={reporterType}
                  onChange={(e) => setReporterType(e.target.value as any)}
                >
                  <option value="Citizen">Citizen Reporter</option>
                  <option value="Field Officer">Field Officer (DMC)</option>
                  <option value="Disaster Officer">Disaster Management Officer</option>
                  <option value="Local Authority">Grama Niladhari / Local Authority</option>
                  <option value="NGO">Accredited NGO Volunteer</option>
                </select>
              </div>

              <div className="rf-field">
                <label>Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="e.g. officer@dmc.gov.lk"
                  value={reporterEmail}
                  onChange={(e) => setReporterEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="rf-subcard">
              <span className="rf-subcard-label">Secondary / Local Emergency Contact</span>
              <div className="rf-grid rf-grid-3" style={{ marginBottom: 0 }}>
                <div className="rf-field">
                  <label>Emergency Contact Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Gamini Silva"
                    value={emergencyContactName}
                    onChange={(e) => setEmergencyContactName(e.target.value)}
                  />
                </div>

                <div className="rf-field">
                  <label>Emergency Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 0112136136"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  />
                </div>

                <div className="rf-field">
                  <label>Relationship</label>
                  <input
                    type="text"
                    placeholder="e.g. GN / Spouse / Desk Officer"
                    value={emergencyContactRelation}
                    onChange={(e) => setEmergencyContactRelation(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* PRE-SUBMISSION SUMMARY CARD & ACTION CONTROLS */}
          <div style={{
            background: '#07162c',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '1.5rem',
            color: '#ffffff',
            boxShadow: '0 8px 24px rgba(7, 22, 44, 0.25)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>
                  Assessment Summary Preview
                </h4>
                <span style={{ fontSize: '0.775rem', color: '#94a3b8' }}>
                  Review verified impact parameters before launching autonomous orchestration
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem' }}>
                  {district} ({disasterType === 'Other' ? otherDisasterType : disasterType})
                </span>
                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem' }}>
                  {totalHousesDamaged} Houses
                </span>
                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem' }}>
                  {displacedFamilies || 0} Families
                </span>
                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem' }}>
                  {infraItems.length} Lifelines
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={handleSaveDraft}
                style={{
                  padding: '0.85rem 1.25rem',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Save Draft
              </button>

              {!isOfficer ? (
                <button
                  type="button"
                  onClick={handleSubmitCitizenDamageReport}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '0.85rem 1.5rem',
                    background: loading ? '#64748b' : 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <span>{loading ? 'Submitting Damage Report...' : 'Submit Citizen Damage Assessment Report'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleStartIntakeWorkflow()}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '0.85rem 1.5rem',
                    background: loading ? '#64748b' : 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                  }}
                >
                  <span>{loading ? 'Orchestrating 4-Agent Recovery Engine...' : 'Execute 4-Agent AI Recovery Engine'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Step Progress Bar (Visible when executing AI) */}
          {loading && (
            <div style={{ background: '#ffffff', border: '2px solid #3b82f6', borderRadius: '14px', padding: '1.75rem', marginTop: '1rem', boxShadow: '0 8px 24px rgba(37, 99, 235, 0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1e40af' }}>
                    Multi-Agent Reasoning Pipeline in Progress...
                  </h3>
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#2563eb', background: '#eff6ff', padding: '0.3rem 0.75rem', borderRadius: '20px' }}>
                  Step {currentStep} of 4 ({currentStep * 25}%)
                </span>
              </div>

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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '1rem', borderRadius: '10px', background: currentStep >= 1 ? '#eff6ff' : '#f8fafc', border: `2px solid ${currentStep === 1 ? '#3b82f6' : currentStep > 1 ? '#86efac' : '#e2e8f0'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: currentStep >= 1 ? '#1d4ed8' : '#94a3b8' }}>AGENT 1</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: currentStep > 1 ? '#16a34a' : currentStep === 1 ? '#2563eb' : '#94a3b8' }}>{currentStep > 1 ? 'Complete' : currentStep === 1 ? 'Running' : 'Queued'}</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>Strategic Planner</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>Decomposes disaster scope &amp; priorities</div>
                </div>

                <div style={{ padding: '1rem', borderRadius: '10px', background: currentStep >= 2 ? '#eff6ff' : '#f8fafc', border: `2px solid ${currentStep === 2 ? '#3b82f6' : currentStep > 2 ? '#86efac' : '#e2e8f0'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: currentStep >= 2 ? '#1d4ed8' : '#94a3b8' }}>AGENT 2</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: currentStep > 2 ? '#16a34a' : currentStep === 2 ? 'Running' : 'Queued' }}>{currentStep > 2 ? 'Complete' : currentStep === 2 ? 'Running' : 'Queued'}</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>Infra &amp; Shelter Analyzer</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>Evaluates capacity &amp; lifeline repairs</div>
                </div>

                <div style={{ padding: '1rem', borderRadius: '10px', background: currentStep >= 3 ? '#eff6ff' : '#f8fafc', border: `2px solid ${currentStep === 3 ? '#3b82f6' : currentStep > 3 ? '#86efac' : '#e2e8f0'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: currentStep >= 3 ? '#1d4ed8' : '#94a3b8' }}>AGENT 3</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: currentStep > 3 ? '#16a34a' : currentStep === 3 ? 'Running' : 'Queued' }}>{currentStep > 3 ? 'Complete' : currentStep === 3 ? 'Running' : 'Queued'}</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>Tool &amp; NGO Dispatcher</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>Matches NGOs &amp; calculates budgets</div>
                </div>

                <div style={{ padding: '1rem', borderRadius: '10px', background: currentStep >= 4 ? '#eff6ff' : '#f8fafc', border: `2px solid ${currentStep === 4 ? '#3b82f6' : '#e2e8f0'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: currentStep >= 4 ? '#1d4ed8' : '#94a3b8' }}>AGENT 4</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: currentStep >= 4 ? '#2563eb' : '#94a3b8' }}>{currentStep >= 4 ? 'Validating' : 'Queued'}</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>Policy &amp; Guardrail Validator</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>Verifies limits &amp; compiles audit trace</div>
                </div>
              </div>
            </div>
          )}

          {renderPlanAndTraceSection()}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          TAB 2: CITIZEN DAMAGE INTAKE SUBMISSIONS LEDGER
         ═════════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'submissions' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                {isOfficer ? 'Citizen Disaster Damage Submissions Ledger' : 'My Submitted Disaster Damage Reports'}
              </h2>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                {isOfficer
                  ? 'Review originating citizen reports from disaster-affected areas and trigger AI-driven recovery master plans.'
                  : 'Track the verification and recovery plan status of your submitted disaster assessments.'}
              </p>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <select
                value={reportFilterDistrict}
                onChange={(e) => setReportFilterDistrict(e.target.value)}
                style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#fff' }}
              >
                <option value="all">All Districts</option>
                {SRI_LANKA_DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>

              <select
                value={reportFilterStatus}
                onChange={(e) => setReportFilterStatus(e.target.value)}
                style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#fff' }}
              >
                <option value="all">All Statuses</option>
                <option value="Submitted">Submitted (Awaiting Review)</option>
                <option value="PendingReview">Pending Review</option>
                <option value="PlanGenerated">Plan Generated</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Submissions List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {damageReports.length === 0 ? (
              <div style={{ padding: '3rem 2rem', textAlign: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#64748b' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#94a3b8' }}>—</div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontWeight: 700 }}>No Damage Submissions Found</h3>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                  {isOfficer
                    ? 'No citizen damage reports match your filter criteria.'
                    : 'Submit your first disaster impact assessment from the Disaster Damage Intake tab.'}
                </p>
              </div>
            ) : (
              damageReports.map((report) => (
                <div
                  key={report.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
                          {report.district} — {report.disasterType}
                        </span>
                        <span style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background:
                            report.status === 'PlanGenerated' ? '#f0fdf4' :
                            report.status === 'Submitted' ? '#eff6ff' :
                            report.status === 'PendingReview' ? '#fef3c7' :
                            report.status === 'Rejected' ? '#fef2f2' : '#f8fafc',
                          color:
                            report.status === 'PlanGenerated' ? '#16a34a' :
                            report.status === 'Submitted' ? '#1d4ed8' :
                            report.status === 'PendingReview' ? '#b45309' :
                            report.status === 'Rejected' ? '#dc2626' : '#475569',
                        }}>
                          ● {report.status === 'Submitted' ? 'Submitted – Awaiting Review' : report.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        Reported By: <strong>{report.reporterName}</strong> ({report.reporterContact}) • Submitted: {new Date(report.createdAt).toLocaleString()}
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <button
                        onClick={() => setSelectedReportDetail(selectedReportDetail?.id === report.id ? null : report)}
                        style={{
                          padding: '0.5rem 0.9rem',
                          background: '#f1f5f9',
                          color: '#334155',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                      >
                        {selectedReportDetail?.id === report.id ? 'Hide Details' : 'View Details'}
                      </button>

                      {/* If plan is already generated, allow directly viewing the plan */}
                      {((report.status === 'PlanGenerated' && report.recoveryPlanId) || (report.incidentId && workflowList.some((w: WorkflowListItem) => w.incidentId === report.incidentId))) && (
                        <button
                          onClick={() => {
                            const targetPlanId = report.recoveryPlanId || workflowList.find((w: WorkflowListItem) => w.incidentId === report.incidentId)?.id;
                            if (targetPlanId) handleSelectWorkflow(targetPlanId);
                          }}
                          disabled={loading}
                          style={{
                            padding: '0.5rem 0.9rem',
                            background: '#f0fdf4',
                            color: '#15803d',
                            border: '1px solid #bbf7d0',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          <span>View AI Plan</span>
                        </button>
                      )}

                      {/* For Officers/Admins: Generate AI Plan or Regenerate */}
                      {isOfficer && (
                        <button
                          onClick={() => handleGeneratePlanFromReport(report)}
                          disabled={loading}
                          style={{
                            padding: '0.5rem 1rem',
                            background: report.status === 'PlanGenerated' ? '#f8fafc' : 'linear-gradient(135deg, #1e3a8a, #2563eb)',
                            color: report.status === 'PlanGenerated' ? '#2563eb' : '#ffffff',
                            border: report.status === 'PlanGenerated' ? '1px solid #bfdbfe' : 'none',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            boxShadow: report.status === 'PlanGenerated' ? 'none' : '0 2px 6px rgba(37, 99, 235, 0.2)',
                          }}
                        >
                          <span>{report.status === 'PlanGenerated' ? 'Regenerate Plan' : 'Generate AI Plan'}</span>
                        </button>
                      )}

                      {/* Delete button */}
                      {isOfficer && (
                        <button
                          onClick={(e) => handleDeleteReport(report.id, e)}
                          title="Delete submission"
                          style={{
                            padding: '0.5rem 0.65rem',
                            background: '#fff',
                            color: '#ef4444',
                            border: '1px solid #fecaca',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Impact Summary Quick-Stats */}
                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: '#475569', flexWrap: 'wrap' }}>
                    <div><strong>{report.housesDamaged}</strong> Houses Damaged</div>
                    <div><strong>{report.displacedFamilies}</strong> Displaced Families</div>
                    <div><strong>{(report.infrastructureDamage || []).length}</strong> Lifeline Assets Affected</div>
                  </div>

                  {/* Expanded Detail View */}
                  {selectedReportDetail?.id === report.id && (() => {
                    const parsedReport = parseStructuredAssessment(report.additionalNotes);
                    return (
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', marginTop: '0.5rem' }}>
                        {/* Triage Badges */}
                        {(parsedReport.immediateNeeds.length > 0 || parsedReport.vulnerabilities.length > 0 || parsedReport.safetyRisk) && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginBottom: '0.75rem', alignItems: 'center' }}>
                            {parsedReport.safetyRisk && (
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '6px', background: '#fee2e2', color: '#b91c1c' }}>
                                Risk: {parsedReport.safetyRisk}
                              </span>
                            )}
                            {parsedReport.immediateNeeds.map((need, nIdx) => (
                              <span key={nIdx} style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: '6px', background: '#eff6ff', color: '#1d4ed8' }}>
                                {need}
                              </span>
                            ))}
                            {parsedReport.vulnerabilities.map((v, vIdx) => (
                              <span key={vIdx} style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.15rem 0.5rem', borderRadius: '6px', background: '#fef3c7', color: '#92400e' }}>
                                {v}
                              </span>
                            ))}
                          </div>
                        )}

                        <div style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: '#334155' }}>
                          <strong style={{ display: 'block', marginBottom: '0.2rem', color: '#0f172a' }}>Field Assessment Notes:</strong>
                          <p style={{ margin: '0.25rem 0 0 0', lineHeight: 1.5, color: '#334155' }}>
                            {parsedReport.observationNotes || 'No additional notes provided.'}
                          </p>
                        </div>

                      {report.infrastructureDamage && report.infrastructureDamage.length > 0 && (
                        <div>
                          <strong style={{ fontSize: '0.8rem', color: '#475569', display: 'block', marginBottom: '0.4rem' }}>
                            Damaged Infrastructure:
                          </strong>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem' }}>
                            {report.infrastructureDamage.map((item, idx) => (
                              <div key={idx} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
                                <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.assetName}</div>
                                <div style={{ color: '#64748b' }}>
                                  {item.assetType} • <span style={{ color: '#b91c1c', fontWeight: 600 }}>{item.damageLevel}</span>
                                  {item.estimatedCost ? ` • Rs. ${Number(item.estimatedCost).toLocaleString()}` : ''}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          TAB 3: PAST PLANS & AUDIT LEDGER
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
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                    Historical Recovery Plans &amp; Observability Audit Log
                  </h2>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                    Immutable registry of AI multi-agent plan executions, guardrail outcomes, and officer approvals.
                  </p>
                </div>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', background: '#fff' }}
                >
                  <option value="all">All Plan Statuses</option>
                  <option value="Approved">Approved</option>
                  <option value="PendingApproval">Pending Approval</option>
                  <option value="Rejected">Rejected</option>
                  <option value="RevisionRequested">Revision Requested</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {workflowList.length === 0 ? (
                  <div style={{ padding: '3rem 2rem', textAlign: 'center', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#64748b' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#94a3b8' }}>—</div>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontWeight: 700 }}>No Recovery Plans Found</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>Generate your first recovery plan from the Disaster Damage Intake tab.</p>
                  </div>
                ) : (
                  workflowList.map((plan) => (
                    <div
                      key={plan.id}
                      onClick={() => handleSelectWorkflow(plan.id)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '1.25rem',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        transition: 'transform 0.15s ease, border-color 0.15s ease',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
                          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
                            {plan.planName}
                          </span>
                          <span style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background:
                              plan.status === 'Approved' ? '#f0fdf4' :
                              plan.status === 'PendingApproval' ? '#fef3c7' :
                              plan.status === 'Rejected' ? '#fef2f2' : '#f8fafc',
                            color:
                              plan.status === 'Approved' ? '#16a34a' :
                              plan.status === 'PendingApproval' ? '#b45309' :
                              plan.status === 'Rejected' ? '#dc2626' : '#475569',
                          }}>
                            ● {plan.status}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          Budget: <strong style={{ color: '#0f172a' }}>Rs. {plan.estimatedTotalBudget.toLocaleString()}</strong>
                          {' • Created: '}{new Date(plan.createdAt).toLocaleString()}
                          {plan.reviewedBy && ` • Reviewed by: ${plan.reviewedBy}`}
                        </div>
                      </div>

                      <button
                        style={{
                          padding: '0.45rem 0.95rem',
                          background: '#f1f5f9',
                          color: '#1e293b',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                      >
                        Inspect Full Audit Trace →
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── REVISION GUIDANCE MODAL ── */}
      {showRevisionModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '1rem',
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            maxWidth: '540px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              Request AI Plan Revision
            </h3>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.9rem', color: '#64748b' }}>
              Provide specific policy, budgetary, or operational guidance to instruct the Multi-Agent reasoning engine to recalculate this plan.
            </p>

            <textarea
              rows={4}
              value={revisionGuidance}
              onChange={(e) => setRevisionGuidance(e.target.value)}
              placeholder="e.g. Prioritize school repairs first, cap total budget at LKR 1,500,000, and assign sanitation tasks to Red Cross..."
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                marginBottom: '1.5rem',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setShowRevisionModal(false)}
                style={{ padding: '0.6rem 1.2rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', color: '#475569' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDecision('Revise')}
                disabled={loading || !revisionGuidance.trim()}
                style={{
                  padding: '0.6rem 1.2rem',
                  background: loading || !revisionGuidance.trim() ? '#94a3b8' : '#f59e0b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: loading || !revisionGuidance.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Re-executing Agents...' : 'Submit & Re-run Multi-Agent Pipeline'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
