import { getAuthHeaders } from '../../../shared/auth/authApi';
import type {
  AdjustInventoryDto,
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

export async function fetchDispatchPlans(): Promise<DispatchPlan[]> {
  const res = await fetch(`${API_BASE}/dispatch/`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to fetch dispatch plans');
  const data = await res.json();
  const plans = Array.isArray(data) ? data : [];
  return plans.map(mapDispatchResponse);
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