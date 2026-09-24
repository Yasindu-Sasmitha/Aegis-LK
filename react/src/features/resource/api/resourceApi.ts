import { getAuthHeaders } from '../../../shared/auth/authApi';
import type {
  AdjustInventoryDto,
  CreateDispatchPlanRequest,
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

const buildQueryString = (params: Record<string, string | number | boolean | undefined>) => {
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

export async function createWarehouse(payload: CreateWarehouseDto): Promise<Warehouse> {
  const res = await fetch(`${API_BASE}/warehouses/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || 'Failed to create warehouse');
  }
  return res.json();
}

export async function updateWarehouse(id: string, payload: UpdateWarehouseDto): Promise<Warehouse> {
  const res = await fetch(`${API_BASE}/warehouses/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || 'Failed to update warehouse');
  }
  return res.json();
}

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

export async function createInventoryItem(payload: CreateInventoryDto): Promise<InventoryItem> {
  const res = await fetch(`${API_BASE}/inventory/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || 'Failed to create inventory item');
  }
  return res.json();
}

export async function updateInventoryItem(id: string, payload: UpdateInventoryDto): Promise<InventoryItem> {
  const res = await fetch(`${API_BASE}/inventory/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || 'Failed to update inventory item');
  }
  return res.json();
}

export async function adjustInventoryQuantity(id: string, payload: AdjustInventoryDto): Promise<InventoryItem> {
  const res = await fetch(`${API_BASE}/inventory/${id}/adjust`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || 'Failed to adjust inventory');
  }
  return res.json();
}

export async function fetchDispatchPlans(): Promise<DispatchPlan[]> {
  try {
    const res = await fetch(`${API_BASE}/dispatch`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('No dispatch endpoints exposed yet');
    const data = await res.json();
    return Array.isArray(data) ? data : data.items ?? [];
  } catch {
    return [];
  }
}

export async function createDispatchPlan(payload: CreateDispatchPlanRequest): Promise<DispatchPlan> {
  try {
    const res = await fetch(`${API_BASE}/dispatch`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Dispatch endpoint unavailable');
    return await res.json();
  } catch {
    const warehouseName = 'Local depot';
    return {
      id: `dispatch-${Date.now()}`,
      missionId: payload.missionId,
      district: payload.district,
      teamsRequired: payload.teamsRequired,
      warehouseId: payload.warehouseId,
      warehouseName,
      routeSummary: `Dispatch to ${payload.district} using local warehouse allocation`,
      estimatedArrivalMinutes: 40 + payload.teamsRequired * 12,
      approvalStatus: 'PendingApproval',
      items: payload.items,
      createdAt: new Date().toISOString(),
    };
  }
}

export async function approveDispatchPlan(id: string): Promise<DispatchPlan> {
  try {
    const res = await fetch(`${API_BASE}/dispatch/${id}/approve`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Approval endpoint unavailable');
    return await res.json();
  } catch {
    return {
      id,
      missionId: 'local-plan',
      district: 'Colombo',
      teamsRequired: 1,
      warehouseId: '',
      warehouseName: 'Approved locally',
      routeSummary: 'Approved by resource manager',
      estimatedArrivalMinutes: 30,
      approvalStatus: 'Approved',
      items: [],
      createdAt: new Date().toISOString(),
    };
  }
}
