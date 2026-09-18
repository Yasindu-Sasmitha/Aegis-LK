// Mirrors backend/Aegis.Incident/Models/IncidentModels.cs and Dtos/IncidentDtos.cs.
// Keep field names/casing in sync with the C# side — System.Text.Json serializes
// with camelCase by default, so these TS names match the JSON on the wire exactly.

export type IncidentStatus =
  | 'Reported'
  | 'Assessed'
  | 'OnHold'
  | 'Rejected'
  | 'MissionApproved'
  | 'Closed';

export type DisasterType = 'Flood' | 'Landslide' | string; // open-ended: backend stores free text

export type SeverityLevel = 'Low' | 'Medium' | 'High' | 'Critical' | string;

// ── Core entity — GET /api/incidents, GET /api/incidents/{id} ──────────────
export interface IncidentReport {
  id: string;
  disasterType: DisasterType;
  description: string;
  severityReported: SeverityLevel;
  severityAssessed: SeverityLevel | null;
  latitude: number;
  longitude: number;
  photoUrl: string | null;

  plausibilityScore: number | null;
  plausibilityReasoning: string | null;

  linkedIncidentId: string | null;
  linkedIncident: IncidentReport | null; // present only when the API chooses to include it

  status: IncidentStatus;
  rejectionReason: string | null;

  reportedByUserId: string;
  createdAt: string; // ISO 8601
  updatedAt: string | null;

  rescueMission: RescueMission | null;
  damageReport: DamageReport | null;
}

export interface RescueMission {
  id: string;
  incidentId: string;
  approvedByOfficerId: string;
  teamsRequired: number;
  status: string;
  createdAt: string;
}

export interface DamageReport {
  id: string;
  incidentId: string;
  housesDamaged: number;
  displacedFamilies: number;
  infrastructureDamageNotes: string;
  infrastructureDamage: InfrastructureDamageItem[];
  createdAt: string;
}

export interface InfrastructureDamageItem {
  assetName: string;
  assetType: string; // e.g. "Road"
  damageLevel: string; // e.g. "Moderate"
  estimatedCost: number;
}

// ── POST /api/incidents ─────────────────────────────────────────────────────
export interface CreateIncidentRequest {
  disasterType: string;
  description: string;
  severityReported: string;
  latitude: number;
  longitude: number;
  photoUrl?: string | null;
  reportedByUserId: string;
}

// ── POST /api/incidents/{id}/assess ─────────────────────────────────────────
export interface AssessIncidentResponse {
  incidentId: string;
  severityAssessed: SeverityLevel;
  teamsRequired: number;
  recommendation: string;
  overallStatus: 'Success' | 'Failed' | string;
  error: string | null;
}

// ── POST /api/incidents/{id}/approve ────────────────────────────────────────
export interface ApproveIncidentRequest {
  approvedByOfficerId: string;
  teamsRequiredOverride?: number | null;
}

// ── POST /api/incidents/{id}/reject ─────────────────────────────────────────
export interface RejectIncidentRequest {
  reason: string; // required
}

// ── POST /api/incidents/{id}/hold ───────────────────────────────────────────
export interface HoldIncidentRequest {
  reason?: string | null; // optional
}

// ── POST /api/incidents/{id}/damage-report ──────────────────────────────────
export interface CreateDamageReportRequest {
  housesDamaged: number;
  displacedFamilies: number;
  infrastructureDamageNotes: string;
  infrastructureDamage: InfrastructureDamageItem[];
}

// ── GET /api/incidents/nearby ────────────────────────────────────────────────
export interface NearbyIncidentResponse {
  id: string;
  disasterType: string;
  description: string;
  severityReported: string;
  latitude: number;
  longitude: number;
  createdAt: string;
}

// ── GET /api/incidents/{id}/related-reports ─────────────────────────────────
export type RelatedReport = IncidentReport; // duplicates are just IncidentReports linked via linkedIncidentId