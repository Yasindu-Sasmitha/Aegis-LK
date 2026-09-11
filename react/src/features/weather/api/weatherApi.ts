import type {
  District,
  HistoricalWeather,
  ForecastResponse,
  PredictResponse,
  AlertsResponse,
  AlertReviewResponse,
  AnalyticsResponse,
} from '../types/weatherTypes';
import { getAuthHeaders } from '../../../shared/auth/authApi';

const API_BASE = '/api/weather';

// ── Districts ────────────────────────────────────────────────────────────────

export async function fetchDistricts(): Promise<District[]> {
  const res = await fetch(`${API_BASE}/districts`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch districts');
  return res.json();
}

export async function fetchHistorical(districtId: string): Promise<HistoricalWeather[]> {
  const res = await fetch(`${API_BASE}/districts/${districtId}/historical`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch historical data');
  return res.json();
}

// ── Forecast ─────────────────────────────────────────────────────────────────

export async function fetchForecast(districtId: string): Promise<ForecastResponse> {
  const res = await fetch(`${API_BASE}/forecast/${districtId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Weather service unavailable');
  return res.json();
}

// ── Prediction (AI agent) ─────────────────────────────────────────────────────

export async function runPrediction(districtId: string): Promise<PredictResponse> {
  const res = await fetch(`${API_BASE}/predict/${districtId}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || (err as any).title || `Prediction failed (${res.status})`);
  }
  return res.json();
}

// ── Alerts ───────────────────────────────────────────────────────────────────

export async function fetchAlerts(params?: {
  status?: string;
  districtId?: string;
  hazardType?: string;
  page?: number;
  pageSize?: number;
}): Promise<AlertsResponse> {
  const qs = new URLSearchParams();
  if (params?.status) qs.append('status', params.status);
  if (params?.districtId) qs.append('districtId', params.districtId);
  if (params?.hazardType) qs.append('hazardType', params.hazardType);
  if (params?.page) qs.append('page', String(params.page));
  if (params?.pageSize) qs.append('pageSize', String(params.pageSize));

  const res = await fetch(`${API_BASE}/alerts?${qs.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

export async function reviewAlert(
  id: string,
  decision: 'Approved' | 'Rejected',
  reviewNotes?: string
): Promise<AlertReviewResponse> {
  const headers = getAuthHeaders();
  const res = await fetch(`${API_BASE}/alerts/${id}/review`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ decision, reviewNotes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || `Review failed (${res.status})`);
  }
  return res.json();
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export async function fetchAnalytics(): Promise<AnalyticsResponse> {
  const res = await fetch(`${API_BASE}/analytics/accuracy`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}
