import {
  Shelter,
  AidRequest,
  Donation,
  Compensation,
  NGO,
  InfrastructureDamage,
  RecoveryPlan,
  RecoveryReport,
} from '../types/recoveryTypes';

const API_BASE = '/api/recovery';

export async function fetchShelters(district?: string, status?: string): Promise<Shelter[]> {
  const params = new URLSearchParams();
  if (district) params.append('district', district);
  if (status) params.append('status', status);
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
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create shelter');
  }
  return res.json();
}

export async function updateShelterOccupancy(id: string, currentOccupancy: number, status?: string): Promise<Shelter> {
  const res = await fetch(`${API_BASE}/shelters/${id}/occupancy`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentOccupancy, status }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update occupancy');
  }
  return res.json();
}

export async function fetchAidRequests(status?: string, urgency?: string, district?: string): Promise<AidRequest[]> {
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
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to submit aid request');
  }
  return res.json();
}

export async function updateAidRequestStatus(id: string, status: string, shelterId?: string, notes?: string): Promise<AidRequest> {
  const res = await fetch(`${API_BASE}/aid-requests/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, shelterId, notes }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update aid request status');
  }
  return res.json();
}

export async function fetchDonations(): Promise<Donation[]> {
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
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to record donation');
  }
  return res.json();
}

export async function fetchCompensations(): Promise<Compensation[]> {
  const res = await fetch(`${API_BASE}/compensations`);
  if (!res.ok) throw new Error('Failed to fetch compensations');
  return res.json();
}

export async function createCompensation(data: Partial<Compensation>): Promise<Compensation> {
  const res = await fetch(`${API_BASE}/compensations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to submit compensation claim');
  }
  return res.json();
}

export async function approveCompensation(id: string, approvedAmount: number, status: string, notes: string, approvedBy: string): Promise<Compensation> {
  const res = await fetch(`${API_BASE}/compensations/${id}/approve`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ approvedAmount, status, verificationNotes: notes, approvedBy }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update compensation approval');
  }
  return res.json();
}

export async function fetchNGOs(): Promise<NGO[]> {
  const res = await fetch(`${API_BASE}/ngos`);
  if (!res.ok) throw new Error('Failed to fetch NGOs');
  return res.json();
}

export async function fetchInfrastructureDamage(incidentId?: string): Promise<InfrastructureDamage[]> {
  const url = incidentId ? `${API_BASE}/infrastructure-damage?incidentId=${incidentId}` : `${API_BASE}/infrastructure-damage`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch infrastructure damage');
  return res.json();
}

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
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to generate recovery plan');
  }
  return res.json();
}

export async function approveRecoveryPlan(planId: string, action: 'Approve' | 'Reject' | 'Revise', reviewerNotes: string, reviewedBy: string): Promise<RecoveryPlan> {
  const res = await fetch(`${API_BASE}/plan/${planId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, reviewerNotes, reviewedBy }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to submit plan approval decision');
  }
  return res.json();
}

export async function fetchReports(): Promise<RecoveryReport[]> {
  const res = await fetch(`${API_BASE}/reports`);
  if (!res.ok) throw new Error('Failed to fetch reports');
  return res.json();
}
