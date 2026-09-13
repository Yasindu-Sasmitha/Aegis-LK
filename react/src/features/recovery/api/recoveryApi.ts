import {
  Shelter,
  AidRequest,
  Donation,
  Compensation,
  NGO,
  InfrastructureDamage,
  RecoveryPlan,
  RecoveryReport,
  WorkflowTrace,
  WorkflowListItem,
  DamageIntakeFormData,
} from '../types/recoveryTypes';

const API_BASE = '/api/recovery';

// ── Shelters ─────────────────────────────────────────────────────────────────

export async function fetchShelters(district?: string, status?: string, search?: string): Promise<{ total: number; items: Shelter[] }> {
  const params = new URLSearchParams();
  if (district) params.append('district', district);
  if (status) params.append('status', status);
  if (search) params.append('search', search);
  const res = await fetch(`${API_BASE}/shelters?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch shelters');
  return res.json();
}

export async function createShelter(data: Partial<Shelter>): Promise<Shelter> {
  const res = await fetch(`${API_BASE}/shelters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to create shelter'); }
  return res.json();
}

export async function updateShelterOccupancy(id: string, currentOccupancy: number, status?: string): Promise<Shelter> {
  const res = await fetch(`${API_BASE}/shelters/${id}/occupancy`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentOccupancy, status }),
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to update occupancy'); }
  return res.json();
}

// ── Aid Requests ─────────────────────────────────────────────────────────────

export async function fetchAidRequests(status?: string, urgency?: string, district?: string): Promise<{ total: number; items: AidRequest[] }> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (urgency) params.append('urgency', urgency);
  if (district) params.append('district', district);
  const res = await fetch(`${API_BASE}/aid-requests?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch aid requests');
  return res.json();
}

export async function createAidRequest(data: Partial<AidRequest>): Promise<AidRequest> {
  const res = await fetch(`${API_BASE}/aid-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to submit aid request'); }
  return res.json();
}

export async function updateAidRequestStatus(id: string, status: string, shelterId?: string, notes?: string): Promise<AidRequest> {
  const res = await fetch(`${API_BASE}/aid-requests/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, shelterId, notes }),
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to update aid request status'); }
  return res.json();
}

// ── Donations ─────────────────────────────────────────────────────────────────

export async function fetchDonations(): Promise<{ total: number; items: Donation[] }> {
  const res = await fetch(`${API_BASE}/donations`);
  if (!res.ok) throw new Error('Failed to fetch donations');
  return res.json();
}

export async function createDonation(data: Partial<Donation>): Promise<Donation> {
  const res = await fetch(`${API_BASE}/donations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to record donation'); }
  return res.json();
}

// ── Compensations ─────────────────────────────────────────────────────────────

export async function fetchCompensations(status?: string): Promise<{ total: number; items: Compensation[] }> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  const res = await fetch(`${API_BASE}/compensations?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch compensations');
  return res.json();
}

export async function createCompensation(data: Partial<Compensation>): Promise<Compensation> {
  const res = await fetch(`${API_BASE}/compensations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to submit compensation claim'); }
  return res.json();
}

export async function approveCompensation(id: string, approvedAmount: number, status: string, notes: string, approvedBy: string): Promise<Compensation> {
  const res = await fetch(`${API_BASE}/compensations/${id}/approve`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approvedAmount, status, verificationNotes: notes, approvedBy }),
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to update compensation approval'); }
  return res.json();
}

// ── NGOs & Infrastructure ─────────────────────────────────────────────────────

export async function fetchNGOs(status?: string): Promise<NGO[]> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  const res = await fetch(`${API_BASE}/ngos?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch NGOs');
  return res.json();
}

export async function fetchInfrastructureDamage(incidentId?: string): Promise<InfrastructureDamage[]> {
  const url = incidentId ? `${API_BASE}/infrastructure-damage?incidentId=${incidentId}` : `${API_BASE}/infrastructure-damage`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch infrastructure damage');
  return res.json();
}

// ── Legacy Plan Endpoints ─────────────────────────────────────────────────────

export async function fetchRecoveryPlan(incidentId: string): Promise<RecoveryPlan> {
  const res = await fetch(`${API_BASE}/plan/${incidentId}`);
  if (!res.ok) throw new Error('No recovery plan found for this incident');
  return res.json();
}

export async function generateRecoveryPlan(incidentId: string): Promise<RecoveryPlan> {
  const res = await fetch(`${API_BASE}/plan/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ incidentId }),
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to generate recovery plan'); }
  return res.json();
}

export async function approveRecoveryPlan(planId: string, action: 'Approve' | 'Reject' | 'Revise', reviewerNotes: string, reviewedBy: string): Promise<RecoveryPlan> {
  const res = await fetch(`${API_BASE}/plan/${planId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, reviewerNotes, reviewedBy }),
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to submit plan approval decision'); }
  return res.json();
}

// ── Multi-Agent Workflow Endpoints (NEW) ──────────────────────────────────────

/** Start the full 4-agent recovery workflow with a direct damage intake form */
export async function startWorkflowFromIntake(intake: DamageIntakeFormData): Promise<RecoveryPlan> {
  const res = await fetch(`${API_BASE}/workflows/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ directDamageIntake: intake }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.title || 'Failed to start recovery workflow');
  }
  return res.json();
}

/** Start workflow from an existing incident ID */
export async function startWorkflowFromIncident(incidentId: string): Promise<RecoveryPlan> {
  const res = await fetch(`${API_BASE}/workflows/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ incidentId }),
  });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed to start workflow'); }
  return res.json();
}

/** Get the agent execution trace for a plan */
export async function fetchWorkflowTrace(planId: string): Promise<WorkflowTrace> {
  const res = await fetch(`${API_BASE}/workflows/${planId}/trace`);
  if (!res.ok) throw new Error('No workflow trace found for this plan');
  return res.json();
}

/** List all workflow plans */
export async function fetchWorkflows(status?: string, page = 1, pageSize = 20): Promise<{ total: number; items: WorkflowListItem[] }> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (status) params.append('status', status);
  const res = await fetch(`${API_BASE}/workflows?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch workflows');
  return res.json();
}

/** Human officer approval/rejection/revision */
export async function submitWorkflowDecision(
  planId: string,
  action: 'Approve' | 'Reject' | 'Revise',
  reviewerNotes?: string,
  reviewedBy?: string
): Promise<RecoveryPlan> {
  const res = await fetch(`${API_BASE}/workflows/${planId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, reviewerNotes, reviewedBy }),
  });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed to submit decision'); }
  return res.json();
}

// ── Reports ──────────────────────────────────────────────────────────────────

export async function fetchReports(): Promise<{ total: number; items: RecoveryReport[] }> {
  const res = await fetch(`${API_BASE}/reports`);
  if (!res.ok) throw new Error('Failed to fetch reports');
  return res.json();
}

export async function generateReport(incidentId: string, title: string): Promise<RecoveryReport> {
  const res = await fetch(`${API_BASE}/reports/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ incidentId, title }),
  });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed to generate report'); }
  return res.json();
}
