import { getAuthHeaders } from '../../../shared/auth/authApi';
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

// ── Sri Lanka Phone Number Validator ──────────────────────────────────────────
/**
 * Validates Sri Lankan phone numbers:
 * - Local 10-digit format starting with 0 (e.g., 0771234567, 0112345678)
 * - International format with +94, 0094, or 94 followed by 9 digits (e.g., +94771234567)
 * - Rejects any numbers with > 10 digits (without country code) or invalid formats.
 */
export function isValidSriLankanPhone(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.trim().replace(/[\s\-\(\)]/g, '');
  const local10Regex = /^0\d{9}$/;
  const intlRegex = /^(?:\+94|0094|94)[1-9]\d{8}$/;
  return local10Regex.test(cleaned) || intlRegex.test(cleaned);
}

// ── Approved Incidents (cross-module, from Incident API) ──────────────────────
export interface ApprovedIncident {
  id: string;
  disasterType: string;
  description: string;
  severityAssessed: string | null;
  severityReported: string;
  latitude: number;
  longitude: number;
  status: string;
  createdAt: string;
  district?: string; // resolved from lat/lng or injected by backend
  damageReport?: {
    housesDamaged: number;
    displacedFamilies: number;
    infrastructureDamageNotes: string;
    infrastructureDamage?: { assetName: string; assetType: string; damageLevel: string; estimatedCost: number }[];
  } | null;
}

// Coordinate → District mapping (same table as backend DistrictHelper)
const DISTRICT_COORDINATES: { name: string; lat: number; lng: number }[] = [
  { name: 'Colombo', lat: 6.9271, lng: 79.8612 },
  { name: 'Gampaha', lat: 7.0917, lng: 80.0000 },
  { name: 'Kalutara', lat: 6.5854, lng: 79.9607 },
  { name: 'Kandy', lat: 7.2906, lng: 80.6337 },
  { name: 'Matale', lat: 7.4675, lng: 80.6234 },
  { name: 'Nuwara Eliya', lat: 6.9497, lng: 80.7891 },
  { name: 'Galle', lat: 6.0535, lng: 80.2210 },
  { name: 'Matara', lat: 5.9549, lng: 80.5550 },
  { name: 'Hambantota', lat: 6.1429, lng: 81.1212 },
  { name: 'Jaffna', lat: 9.6615, lng: 80.0255 },
  { name: 'Kilinochchi', lat: 9.3803, lng: 80.3770 },
  { name: 'Mannar', lat: 8.9833, lng: 79.9167 },
  { name: 'Vavuniya', lat: 8.7514, lng: 80.4971 },
  { name: 'Mullaitivu', lat: 9.2667, lng: 80.8167 },
  { name: 'Batticaloa', lat: 7.7172, lng: 81.7000 },
  { name: 'Ampara', lat: 7.2978, lng: 81.6747 },
  { name: 'Trincomalee', lat: 8.5874, lng: 81.2152 },
  { name: 'Kurunegala', lat: 7.4867, lng: 80.3647 },
  { name: 'Puttalam', lat: 8.0362, lng: 79.8283 },
  { name: 'Anuradhapura', lat: 8.3114, lng: 80.4037 },
  { name: 'Polonnaruwa', lat: 7.9403, lng: 81.0188 },
  { name: 'Badulla', lat: 6.9934, lng: 81.0550 },
  { name: 'Monaragala', lat: 6.8728, lng: 81.3507 },
  { name: 'Ratnapura', lat: 6.7056, lng: 80.3847 },
  { name: 'Kegalle', lat: 7.2513, lng: 80.3464 },
];

function resolveDistrict(lat: number, lng: number): string {
  let closest = DISTRICT_COORDINATES[0];
  let minDist = Infinity;
  for (const d of DISTRICT_COORDINATES) {
    const dist = Math.sqrt((d.lat - lat) ** 2 + (d.lng - lng) ** 2);
    if (dist < minDist) { minDist = dist; closest = d; }
  }
  return closest.name;
}

export async function fetchApprovedIncidents(): Promise<ApprovedIncident[]> {
  const params = new URLSearchParams({ status: 'MissionApproved', pageSize: '50' });
  const res = await fetch(`/api/incidents?${params.toString()}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch approved incidents');
  const data = await res.json();
  const items: ApprovedIncident[] = (data.items ?? data ?? []).map((inc: ApprovedIncident) => ({
    ...inc,
    district: inc.district || resolveDistrict(inc.latitude, inc.longitude),
  }));
  return items;
}

const API_BASE = '/api/recovery';

// ── Shelters ─────────────────────────────────────────────────────────────────

export async function fetchShelters(district?: string, status?: string, search?: string): Promise<{ total: number; items: Shelter[] }> {
  const params = new URLSearchParams();
  if (district) params.append('district', district);
  if (status) params.append('status', status);
  if (search) params.append('search', search);
  const res = await fetch(`${API_BASE}/shelters?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch shelters');
  return res.json();
}

export async function createShelter(data: Partial<Shelter>): Promise<Shelter> {
  const res = await fetch(`${API_BASE}/shelters`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to create shelter'); }
  return res.json();
}

export async function updateShelterOccupancy(id: string, currentOccupancy: number, status?: string): Promise<Shelter> {
  const res = await fetch(`${API_BASE}/shelters/${id}/occupancy`, {
    method: 'PUT',
    headers: getAuthHeaders(),
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
  const res = await fetch(`${API_BASE}/aid-requests?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch aid requests');
  return res.json();
}

export async function createAidRequest(data: Partial<AidRequest>): Promise<AidRequest> {
  const res = await fetch(`${API_BASE}/aid-requests`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to submit aid request'); }
  return res.json();
}

export async function updateAidRequestStatus(id: string, status: string, shelterId?: string, notes?: string): Promise<AidRequest> {
  const res = await fetch(`${API_BASE}/aid-requests/${id}/status`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status, shelterId, notes }),
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to update aid request status'); }
  return res.json();
}

// ── Donations ─────────────────────────────────────────────────────────────────

export async function fetchDonations(): Promise<{ total: number; items: Donation[] }> {
  const res = await fetch(`${API_BASE}/donations`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch donations');
  return res.json();
}

export async function createDonation(data: Partial<Donation>): Promise<Donation> {
  const res = await fetch(`${API_BASE}/donations`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to record donation'); }
  return res.json();
}

export async function updateDonationAllocation(id: string, allocationStatus: string, targetShelterId?: string): Promise<Donation> {
  const res = await fetch(`${API_BASE}/donations/${id}/allocation`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ allocationStatus, targetShelterId }),
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to update donation allocation'); }
  return res.json();
}

// ── Compensations ─────────────────────────────────────────────────────────────

export async function fetchCompensations(status?: string): Promise<{ total: number; items: Compensation[] }> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  const res = await fetch(`${API_BASE}/compensations?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch compensations');
  return res.json();
}

export async function createCompensation(data: Partial<Compensation>): Promise<Compensation> {
  const res = await fetch(`${API_BASE}/compensations`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to submit compensation claim'); }
  return res.json();
}

export async function approveCompensation(id: string, approvedAmount: number, status: string, notes: string, approvedBy: string): Promise<Compensation> {
  const res = await fetch(`${API_BASE}/compensations/${id}/approve`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ approvedAmount, status, verificationNotes: notes, approvedBy }),
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to update compensation approval'); }
  return res.json();
}

// ── NGOs & Infrastructure ─────────────────────────────────────────────────────

export async function fetchNGOs(status?: string): Promise<NGO[]> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  const res = await fetch(`${API_BASE}/ngos?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch NGOs');
  return res.json();
}

export async function createNGO(data: Partial<NGO>): Promise<NGO> {
  const res = await fetch(`${API_BASE}/ngos`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to register NGO'); }
  return res.json();
}

export async function fetchInfrastructureDamage(incidentId?: string): Promise<InfrastructureDamage[]> {
  const url = incidentId ? `${API_BASE}/infrastructure-damage?incidentId=${incidentId}` : `${API_BASE}/infrastructure-damage`;
  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch infrastructure damage');
  return res.json();
}

// ── Legacy Plan Endpoints ─────────────────────────────────────────────────────

export async function fetchRecoveryPlan(incidentId: string): Promise<RecoveryPlan> {
  const res = await fetch(`${API_BASE}/plan/${incidentId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('No recovery plan found for this incident');
  return res.json();
}

export async function generateRecoveryPlan(incidentId: string): Promise<RecoveryPlan> {
  const res = await fetch(`${API_BASE}/plan/generate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ incidentId }),
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to generate recovery plan'); }
  return res.json();
}

export async function approveRecoveryPlan(planId: string, action: 'Approve' | 'Reject' | 'Revise', reviewerNotes: string, reviewedBy: string): Promise<RecoveryPlan> {
  const res = await fetch(`${API_BASE}/plan/${planId}/approve`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ action, reviewerNotes, reviewedBy }),
  });
  if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to submit plan approval decision'); }
  return res.json();
}

// ── Multi-Agent Workflow Endpoints (NEW) ──────────────────────────────────────

/** Start the full 4-agent recovery workflow with a direct damage intake form */
export async function startWorkflowFromIntake(intake: DamageIntakeFormData, damageReportId?: string): Promise<RecoveryPlan> {
  const res = await fetch(`${API_BASE}/workflows/start`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ directDamageIntake: intake, damageReportId }),
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
    headers: getAuthHeaders(),
    body: JSON.stringify({ incidentId }),
  });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed to start workflow'); }
  return res.json();
}

/** Get the agent execution trace for a plan */
export async function fetchWorkflowDetail(planId: string): Promise<RecoveryPlan> {
  const res = await fetch(`${API_BASE}/workflows/${planId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch plan detail');
  return res.json();
}

export async function fetchWorkflowTrace(planId: string): Promise<WorkflowTrace> {
  const res = await fetch(`${API_BASE}/workflows/${planId}/trace`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('No workflow trace found for this plan');
  return res.json();
}

/** List all workflow plans */
export async function fetchWorkflows(status?: string, page = 1, pageSize = 20): Promise<{ total: number; items: WorkflowListItem[] }> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (status) params.append('status', status);
  const res = await fetch(`${API_BASE}/workflows?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
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
    headers: getAuthHeaders(),
    body: JSON.stringify({ action, reviewerNotes, reviewedBy }),
  });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed to submit decision'); }
  return res.json();
}

// ── Reports ──────────────────────────────────────────────────────────────────

export async function fetchReports(): Promise<{ total: number; items: RecoveryReport[] }> {
  const res = await fetch(`${API_BASE}/reports`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch reports');
  return res.json();
}

export async function generateReport(incidentId: string, title: string): Promise<RecoveryReport> {
  const res = await fetch(`${API_BASE}/reports/generate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ incidentId, title }),
  });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed to generate report'); }
  return res.json();
}

export async function deleteReport(reportId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/reports/${reportId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed to delete report'); }
}

// ── Citizen Disaster Damage Intake ──────────────────────────────────────────

export async function fetchDamageReports(status?: string, district?: string): Promise<{ total: number; items: import('../types/recoveryTypes').DamageReportItem[] }> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (district) params.append('district', district);
  const res = await fetch(`${API_BASE}/damage-reports?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch citizen damage reports');
  return res.json();
}

export async function submitCitizenDamageReport(data: {
  district: string;
  location: string;
  disasterType: string;
  housesDamaged: number;
  displacedFamilies: number;
  reporterName: string;
  reporterContact: string;
  additionalNotes: string;
  infrastructureDamage?: import('../types/recoveryTypes').DamageIntakeInfrastructureItem[];
}): Promise<import('../types/recoveryTypes').DamageReportItem> {
  const res = await fetch(`${API_BASE}/damage-reports`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to submit damage report');
  }
  return res.json();
}

export async function deleteDamageReport(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/damage-reports/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete damage report');
  }
}

