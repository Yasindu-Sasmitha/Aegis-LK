import { getAuthHeaders } from '../../../shared/auth/authApi';
import type {
  IncidentReport,
  IncidentListResponse,
  CreateIncidentRequest,
  AssessIncidentResponse,
  ApproveIncidentRequest,
  RejectIncidentRequest,
  HoldIncidentRequest,
  CreateDamageReportRequest,
  NearbyIncidentResponse,
  RelatedReport,
} from '../types/incidentTypes';

const API_BASE = '/api/incidents';

// Shared error handling: every call throws a readable Error on non-2xx,
// mirroring recoveryApi.ts's convention so callers can catch().
async function handle<T>(res: Response, fallbackMessage: string): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    // Backend sometimes returns a plain string body (e.g. reject/hold guard conflicts),
    // sometimes a ProblemDetails object (e.g. the assess 502), sometimes nothing.
    const message =
      (typeof body === 'string' && body) ||
      body?.detail ||
      body?.title ||
      body?.error ||
      `${fallbackMessage} (${res.status})`;
    throw new Error(message);
  }
  // 200s with no body (rare here, but safe-guard anyway)
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

// ── GET /api/incidents — primaries only, duplicates hidden ─────────────────
export async function fetchIncidents(params?: {
  status?: string;
  district?: string;
  page?: number;
  pageSize?: number;
}): Promise<IncidentListResponse> {
  const query = new URLSearchParams();
  if (params?.status) query.append('status', params.status);
  if (params?.district) query.append('district', params.district);
  query.append('page', String(params?.page ?? 1));
  query.append('pageSize', String(params?.pageSize ?? 20));
  const res = await fetch(`${API_BASE}?${query.toString()}`, {
    headers: getAuthHeaders(),
  });
  return handle<IncidentListResponse>(res, 'Failed to fetch incidents');
}

// ── GET /api/incidents/{id} ──────────────────────────────────────────────────
export async function fetchIncidentById(id: string): Promise<IncidentReport> {
  const res = await fetch(`${API_BASE}/${id}`, { headers: getAuthHeaders() });
  return handle<IncidentReport>(res, 'Failed to fetch incident');
}

// ── GET /api/incidents/{id}/related-reports ─────────────────────────────────
export async function fetchRelatedReports(id: string): Promise<RelatedReport[]> {
  const res = await fetch(`${API_BASE}/${id}/related-reports`, {
    headers: getAuthHeaders(),
  });
  return handle<RelatedReport[]>(res, 'Failed to fetch related reports');
}

// ── GET /api/incidents/nearby ────────────────────────────────────────────────
export async function fetchNearbyIncidents(
  lat: number,
  lng: number,
  radiusKm: number,
  hours: number
): Promise<NearbyIncidentResponse[]> {
  const query = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radiusKm: String(radiusKm),
    hours: String(hours),
  });
  const res = await fetch(`${API_BASE}/nearby?${query.toString()}`, {
    headers: getAuthHeaders(),
  });
  return handle<NearbyIncidentResponse[]>(res, 'Failed to fetch nearby incidents');
}

// ── POST /api/incidents — citizen creates report ────────────────────────────
export async function createIncident(
  data: CreateIncidentRequest
): Promise<IncidentReport> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handle<IncidentReport>(res, 'Failed to create incident');
}

// ── POST /api/incidents/{id}/photo — multipart upload ───────────────────────
export async function uploadIncidentPhoto(
  id: string,
  file: File
): Promise<{ photoUrl: string }> {
  const formData = new FormData();
  formData.append('file', file);
  // Note: no Content-Type header here — the browser sets the multipart boundary itself.
  const { Authorization } = getAuthHeaders();
  const headers: Record<string, string> = {};
  if (Authorization) headers['Authorization'] = Authorization;

  const res = await fetch(`${API_BASE}/${id}/photo`, {
    method: 'POST',
    headers,
    body: formData,
  });
  return handle<{ photoUrl: string }>(res, 'Failed to upload photo');
}

// ── POST /api/incidents/{id}/assess ──────────────────────────────────────────
export async function assessIncident(id: string): Promise<AssessIncidentResponse> {
  const res = await fetch(`${API_BASE}/${id}/assess`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handle<AssessIncidentResponse>(res, 'Failed to assess incident');
}

// ── POST /api/incidents/{id}/approve ─────────────────────────────────────────
export async function approveIncident(
  id: string,
  data: ApproveIncidentRequest
): Promise<IncidentReport> {
  const res = await fetch(`${API_BASE}/${id}/approve`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handle<IncidentReport>(res, 'Failed to approve incident');
}

// ── POST /api/incidents/{id}/reject — reason required ───────────────────────
export async function rejectIncident(
  id: string,
  data: RejectIncidentRequest
): Promise<IncidentReport> {
  const res = await fetch(`${API_BASE}/${id}/reject`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handle<IncidentReport>(res, 'Failed to reject incident');
}

// ── POST /api/incidents/{id}/hold — reason optional ─────────────────────────
export async function holdIncident(
  id: string,
  data: HoldIncidentRequest = {}
): Promise<IncidentReport> {
  const res = await fetch(`${API_BASE}/${id}/hold`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handle<IncidentReport>(res, 'Failed to hold incident');
}

// ── POST /api/incidents/{id}/unlink — officer reverses a wrong Dedup match ──
export async function unlinkIncident(id: string): Promise<IncidentReport> {
  const res = await fetch(`${API_BASE}/${id}/unlink`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return handle<IncidentReport>(res, 'Failed to unlink incident');
}

// ── POST /api/incidents/{id}/damage-report — deliberately not agentic ──────
export async function submitDamageReport(
  id: string,
  data: CreateDamageReportRequest
): Promise<IncidentReport> {
  const res = await fetch(`${API_BASE}/${id}/damage-report`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handle<IncidentReport>(res, 'Failed to submit damage report');
}