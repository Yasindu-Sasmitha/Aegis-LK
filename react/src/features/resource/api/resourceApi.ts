import { getAuthHeaders } from '../../../shared/auth/authApi';
import type {
  AdjustInventoryDto,
  ApprovedIncidentSummary,
  CreateDispatchRequestDto,
  CreateInventoryDto,
  CreateWarehouseDto,
  DispatchPlan,
  InventoryItem,
  ResourceListResponse,
  UpdateInventoryDto,
  UpdateWarehouseDto,
  Warehouse,
} from '../types/resourceTypes';

const API_BASE = '/api/resource';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const buildQueryString = (
  params: Record<string, string | number | boolean | undefined>,
) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      qs.append(key, String(value));
    }
  });
  const query = qs.toString();
  return query ? `?${query}` : '';
};

const normalizeListResponse = <T>(payload: any): ResourceListResponse<T> => {
  if (Array.isArray(payload)) {
    return {
      total: payload.length,
      page: 1,
      pageSize: payload.length,
      items: payload,
    };
  }
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return {
    total: Number(payload?.total ?? items.length ?? 0),
    page: Number(payload?.page ?? 1),
    pageSize: Number(payload?.pageSize ?? items.length ?? 20),
    items,
  };
};

const readError = async (res: Response, fallback: string) => {
  try {
    const body = await res.json();
    return (body as any)?.message || (body as any)?.error || fallback;
  } catch {
    return fallback;
  }
};

// ---------------------------------------------------------------------------
// Warehouses
// ---------------------------------------------------------------------------
export async function fetchWarehouses(params?: {
  district?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<ResourceListResponse<Warehouse>> {
  const query = buildQueryString({
    district: params?.district,
    search: params?.search,
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 20,
  });

  const res = await fetch(`${API_BASE}/warehouses/${query}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch warehouses');
  return normalizeListResponse<Warehouse>(await res.json());
}

export async function fetchWarehouseById(id: string): Promise<Warehouse> {
  const res = await fetch(`${API_BASE}/warehouses/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch warehouse');
  return res.json();
}

export async function createWarehouse(
  payload: CreateWarehouseDto,
): Promise<Warehouse> {
  const res = await fetch(`${API_BASE}/warehouses/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readError(res, 'Failed to create warehouse'));
  return res.json();
}

export async function updateWarehouse(
  id: string,
  payload: UpdateWarehouseDto,
): Promise<Warehouse> {
  const res = await fetch(`${API_BASE}/warehouses/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readError(res, 'Failed to update warehouse'));
  return res.json();
}

export async function deleteWarehouse(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/warehouses/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(await readError(res, 'Failed to delete warehouse'));
  }
}
// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------
export async function fetchInventoryItems(params?: {
  warehouseId?: string;
  itemType?: string;
  lowStockOnly?: boolean;
  descending?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<ResourceListResponse<InventoryItem>> {
  const query = buildQueryString({
    warehouseId: params?.warehouseId,
    itemType: params?.itemType,
    lowStockOnly: params?.lowStockOnly,
    descending: params?.descending ?? false,
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 20,
  });

  const res = await fetch(`${API_BASE}/inventory/${query}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch inventory');
  return normalizeListResponse<InventoryItem>(await res.json());
}

export async function fetchInventoryById(id: string): Promise<InventoryItem> {
  const res = await fetch(`${API_BASE}/inventory/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch inventory item');
  return res.json();
}

export async function createInventoryItem(
  payload: CreateInventoryDto,
): Promise<InventoryItem> {
  const res = await fetch(`${API_BASE}/inventory/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok)
    throw new Error(await readError(res, 'Failed to create inventory item'));
  return res.json();
}

export async function updateInventoryItem(
  id: string,
  payload: UpdateInventoryDto,
): Promise<InventoryItem> {
  const res = await fetch(`${API_BASE}/inventory/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok)
    throw new Error(await readError(res, 'Failed to update inventory item'));
  return res.json();
}

export async function adjustInventoryQuantity(
  id: string,
  payload: AdjustInventoryDto,
): Promise<InventoryItem> {
  const res = await fetch(`${API_BASE}/inventory/${id}/adjust`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok)
    throw new Error(await readError(res, 'Failed to adjust inventory'));
  return res.json();
}

// ---------------------------------------------------------------------------
// Dispatch — real backend endpoints, no localStorage fallback
// ---------------------------------------------------------------------------
export async function createDispatchPlan(
  payload: CreateDispatchRequestDto,
): Promise<DispatchPlan> {
  const res = await fetch(`${API_BASE}/dispatch/requests`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    if (res.status === 422) {
      // Agent returned SafeFailure — propagate the reason to the UI
      const body = await res.json();
      throw new Error(body?.error || 'Dispatch planning failed validation.');
    }
    if (res.status === 503) {
      throw new Error(
        'Agent service unavailable. Confirm the Python service is running on port 8003.',
      );
    }
    throw new Error(await readError(res, 'Failed to create dispatch plan'));
  }

  const result = await res.json();
  return mapDispatchResponse(result);
}

export async function approveDispatchPlan(id: string): Promise<DispatchPlan> {
  const res = await fetch(`${API_BASE}/dispatch/${id}/approve`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok)
    throw new Error(await readError(res, 'Failed to approve dispatch plan'));
  const result = await res.json();
  return mapDispatchResponse(result);
}

export async function deleteDispatchPlan(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/dispatch/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(await readError(res, 'Failed to delete dispatch plan'));
  }
}

export async function fetchDispatchPlans(): Promise<DispatchPlan[]> {
  const res = await fetch(`${API_BASE}/dispatch/`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch dispatch plans');
  const data = await res.json();
  const plans = Array.isArray(data) ? data : [];
  return plans.map(mapDispatchResponse);
}

export async function fetchApprovedIncidents(): Promise<ApprovedIncidentSummary[]> {
  const res = await fetch(
    `/api/incidents/?status=MissionApproved&pageSize=100`,
    { headers: getAuthHeaders() },
  );

  if (!res.ok) {
    throw new Error('Failed to fetch approved incidents');
  }

  const data = await res.json();
  const items: any[] = Array.isArray(data) ? data : (data.items ?? []);

  return items.map((i) => ({
    id: i.id ?? i.Id ?? '',
    disasterType: i.disasterType ?? i.DisasterType ?? '',
    severityAssessed: i.severityAssessed ?? i.SeverityAssessed ?? null,
    severityReported: i.severityReported ?? i.SeverityReported ?? '',
    // Approximate district label from coordinates
    district: deriveDistrictLabel(
      Number(i.latitude ?? i.Latitude ?? 0),
      Number(i.longitude ?? i.Longitude ?? 0),
    ),
    latitude: Number(i.latitude ?? i.Latitude ?? 0),
    longitude: Number(i.longitude ?? i.Longitude ?? 0),
    createdAt: i.createdAt ?? i.CreatedAt ?? new Date().toISOString(),
  }));
}

/**
 * Approximate district label from a lat/lng pair.
 * Matches the district centroids used in the backend seeder and the
 * Incident module's DistrictHelper so the frontend label lines up with
 * the dispatched district.
 */
function deriveDistrictLabel(lat: number, lng: number): string {
  const centroids: Array<[string, number, number]> = [
    ['Colombo', 6.9271, 79.8612],
    ['Gampaha', 7.0917, 79.9997],
    ['Kalutara', 6.5854, 79.9607],
    ['Kandy', 7.2906, 80.6337],
    ['Nuwara Eliya', 6.9497, 80.7891],
    ['Ratnapura', 6.6828, 80.3992],
    ['Galle', 6.0535, 80.2210],
    ['Matara', 5.9549, 80.5550],
    ['Kegalle', 7.2513, 80.3464],
  ];

  let best = 'Colombo';
  let bestDist = Number.POSITIVE_INFINITY;
  for (const [name, cLat, cLng] of centroids) {
    const d = (lat - cLat) ** 2 + (lng - cLng) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = name;
    }
  }
  return best;
}
// ---------------------------------------------------------------------------
// Response → UI shape mapper (backend uses PascalCase-friendly JSON via
// default ASP.NET Core JSON options, so both camelCase and PascalCase work)
// ---------------------------------------------------------------------------
function mapDispatchResponse(raw: any): DispatchPlan {
  return {
    id: raw.id ?? raw.Id ?? '',
    missionId: raw.missionId ?? raw.MissionId ?? '',
    district: raw.district ?? raw.District ?? '',
    teamsRequired: raw.teamsRequired ?? raw.TeamsRequired ?? 0,
    warehouseId: raw.warehouseId ?? raw.WarehouseId ?? '',
    warehouseName: raw.warehouseName ?? raw.WarehouseName ?? '',
    routeSummary: raw.routeSummary ?? raw.RouteSummary ?? '',
    estimatedArrivalMinutes:
      raw.estimatedArrivalMinutes ?? raw.EstimatedArrivalMinutes ?? 0,
    approvalStatus: raw.approvalStatus ?? raw.ApprovalStatus ?? 'PendingApproval',
    items: (raw.items ?? raw.Items ?? []).map((i: any) => ({
      itemName: i.itemName ?? i.ItemName ?? '',
      quantity: i.quantity ?? i.Quantity ?? 0,
    })),
    createdAt: raw.createdAt ?? raw.CreatedAt ?? new Date().toISOString(),
  };
}