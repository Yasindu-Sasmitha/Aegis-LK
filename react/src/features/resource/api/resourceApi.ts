import { getAuthHeaders } from '../../../shared/auth/authApi';
import type {
  DeliveryItem,
  DispatchItem,
  InventoryItem,
  ResourceRequest,
  ResourceSummary,
  Warehouse,
} from '../types/resourceTypes';

const API_BASE = 'http://localhost:5012/api';

const fallbackWarehouses: Warehouse[] = [
  { id: 'W-101', name: 'Colombo Central Depot', district: 'Colombo', capacity: 1200, availableStock: 880, status: 'Active', updatedAt: '2026-09-18T08:30:00Z' },
  { id: 'W-204', name: 'Kandy Relief Hub', district: 'Kandy', capacity: 900, availableStock: 310, status: 'Low', updatedAt: '2026-09-18T07:15:00Z' },
  { id: 'W-315', name: 'Galle Supply Base', district: 'Galle', capacity: 1300, availableStock: 230, status: 'Critical', updatedAt: '2026-09-18T06:45:00Z' },
];

const fallbackInventory: InventoryItem[] = [
  { id: 'I-1', warehouseId: 'W-101', itemName: 'Water Bottles', quantity: 420, unit: 'cases', reorderLevel: 200, lastUpdated: '2026-09-18T08:00:00Z' },
  { id: 'I-2', warehouseId: 'W-101', itemName: 'Medical Kits', quantity: 70, unit: 'kits', reorderLevel: 80, lastUpdated: '2026-09-18T08:00:00Z' },
  { id: 'I-3', warehouseId: 'W-204', itemName: 'Rice Bags', quantity: 180, unit: 'bags', reorderLevel: 150, lastUpdated: '2026-09-18T07:10:00Z' },
  { id: 'I-4', warehouseId: 'W-315', itemName: 'Blankets', quantity: 120, unit: 'packs', reorderLevel: 200, lastUpdated: '2026-09-18T06:40:00Z' },
];

const fallbackRequests: ResourceRequest[] = [
  { id: 'R-1', itemName: 'Water Bottles', quantity: 250, priority: 'High', status: 'Approved', requester: 'District Office', district: 'Colombo' },
  { id: 'R-2', itemName: 'Medical Kits', quantity: 45, priority: 'High', status: 'Pending', requester: 'Kandy Hospital', district: 'Kandy' },
  { id: 'R-3', itemName: 'Blankets', quantity: 90, priority: 'Medium', status: 'Dispatched', requester: 'Galle Field Unit', district: 'Galle' },
];

const fallbackDispatches: DispatchItem[] = [
  { id: 'D-1', requestId: 'R-1', destination: 'Colombo North Shelter', status: 'InTransit', vehicleCount: 3, eta: '2026-09-18T10:30:00Z' },
  { id: 'D-2', requestId: 'R-2', destination: 'Kandy Clinic', status: 'Scheduled', vehicleCount: 2, eta: '2026-09-18T12:00:00Z' },
  { id: 'D-3', requestId: 'R-3', destination: 'Galle Community Center', status: 'Delivered', vehicleCount: 1, eta: '2026-09-18T05:00:00Z' },
];

const fallbackDeliveries: DeliveryItem[] = [
  { id: 'L-1', dispatchId: 'D-1', itemName: 'Water Bottles', quantity: 150, delivered: false },
  { id: 'L-2', dispatchId: 'D-2', itemName: 'Medical Kits', quantity: 25, delivered: false },
  { id: 'L-3', dispatchId: 'D-3', itemName: 'Blankets', quantity: 90, delivered: true, deliveredAt: '2026-09-18T05:05:00Z' },
];

const fallbackSummary: ResourceSummary = {
  warehouseCount: 3,
  totalInventory: 790,
  criticalItems: 2,
  activeDispatches: 2,
};

export type DispatchPlanRequest = {
  missionId?: string;
  teamsRequired: number;
  district?: string;
  location: {
    lat: number;
    lng: number;
  };
};

export type DispatchPlanResult = {
  requestId: string;
  missionId: string;
  status: string;
  dispatchPlan?: {
    missionId: string;
    warehouseId: string;
    warehouseName: string;
    district: string;
    vehicleCount: number;
    items: Array<{ itemName: string; quantity: number }>;
    routeSummary: string;
    approvalStatus: string;
  };
  estimatedArrival: number;
  requestedAt: string;
  resourceRequestStatus: string;
};

async function readJson<T>(endpoint: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export const resourceApi = {
  getWarehouses: async (): Promise<Warehouse[]> => {
    const [warehouseRows, inventoryRows] = await Promise.all([
      readJson<Array<{ id: string; name: string; district: string; updatedAt?: string }>>('/resource/warehouses', []),
      readJson<Array<{ warehouseId: string; quantityAvailable?: number; quantity?: number; itemName?: string; reorderThreshold?: number; updatedAt?: string }>>('/resource/inventory', []),
    ]);

    if (!warehouseRows.length) return fallbackWarehouses;

    const perWarehouse = new Map<string, Array<{ quantity: number; reorderLevel: number; lastUpdated: string }>>();
    for (const item of inventoryRows) {
      const warehouseId = String(item.warehouseId ?? '');
      if (!warehouseId) continue;
      const qty = Number(item.quantityAvailable ?? item.quantity ?? 0);
      const entry = perWarehouse.get(warehouseId) ?? [];
      entry.push({ quantity: qty, reorderLevel: Number(item.reorderThreshold ?? 0), lastUpdated: item.updatedAt ?? new Date().toISOString() });
      perWarehouse.set(warehouseId, entry);
    }

    return warehouseRows.map((warehouse) => {
      const values = perWarehouse.get(warehouse.id) ?? [];
      const availableStock = values.reduce((sum, item) => sum + item.quantity, 0);
      const capacity = Math.max(500, Math.round(availableStock * 1.4));
      const ratio = capacity > 0 ? availableStock / capacity : 0;
      const status: Warehouse['status'] = ratio < 0.35 ? 'Critical' : ratio < 0.6 ? 'Low' : 'Active';

      return {
        id: warehouse.id,
        name: warehouse.name,
        district: warehouse.district,
        capacity,
        availableStock,
        status,
        updatedAt: values[0]?.lastUpdated ?? warehouse.updatedAt ?? new Date().toISOString(),
      } satisfies Warehouse;
    });
  },

  getInventory: async (): Promise<InventoryItem[]> => {
    const rows = await readJson<Array<{ id: string; warehouseId: string; itemName: string; quantityAvailable?: number; quantity?: number; unit?: string; reorderThreshold?: number; updatedAt?: string; lastUpdated?: string }>>('/resource/inventory', []);
    if (!rows.length) return fallbackInventory;

    return rows.map((row) => ({
      id: row.id,
      warehouseId: row.warehouseId,
      itemName: row.itemName,
      quantity: Number(row.quantityAvailable ?? row.quantity ?? 0),
      unit: row.unit ?? 'units',
      reorderLevel: Number(row.reorderThreshold ?? 0),
      lastUpdated: row.updatedAt ?? row.lastUpdated ?? new Date().toISOString(),
    } satisfies InventoryItem));
  },

  getRequests: async (): Promise<ResourceRequest[]> => {
    const rows = await readJson<Array<{ id: string; itemName: string; quantity: number; priority: ResourceRequest['priority']; status: ResourceRequest['status']; requester: string; district: string }>>('/resource/requests', []);
    return rows.length ? rows : fallbackRequests;
  },

  getDispatches: async (): Promise<DispatchItem[]> => {
    const rows = await readJson<Array<{ id: string; requestId: string; destination: string; status: DispatchItem['status']; vehicleCount: number; eta: string }>>('/resource/dispatches', []);
    return rows.length ? rows : fallbackDispatches;
  },

  getDeliveries: async (): Promise<DeliveryItem[]> => {
    const rows = await readJson<Array<{ id: string; dispatchId: string; itemName: string; quantity: number; delivered: boolean; deliveredAt?: string }>>('/resource/deliveries', []);
    return rows.length ? rows : fallbackDeliveries;
  },

  getSummary: async (): Promise<ResourceSummary> => {
    const summary = await readJson<ResourceSummary>('/resource/summary', fallbackSummary);
    return summary ?? fallbackSummary;
  },

  generateDispatchPlan: async (payload: DispatchPlanRequest): Promise<DispatchPlanResult> => {
    const response = await fetch(`${API_BASE}/resource/dispatch-requests`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        missionId: payload.missionId ?? `mission-${Date.now()}`,
        teamsRequired: payload.teamsRequired,
        district: payload.district ?? 'Colombo',
        location: payload.location,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(errorBody || 'Failed to generate dispatch plan');
    }

    return (await response.json()) as DispatchPlanResult;
  },

  updateDispatchStatus: async (dispatchId: string, status: DispatchItem['status']) => {
    const response = await fetch(`${API_BASE}/resource/dispatches/${dispatchId}/status`, {
      method: 'PATCH',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) throw new Error('Failed to update dispatch status');
    return response.json();
  },

  completeDelivery: async (deliveryId: string) => {
    const response = await fetch(`${API_BASE}/resource/deliveries/${deliveryId}/complete`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to complete delivery');
    return response.json();
  },
};
