export type ItemTypeName =
  | 'Food'
  | 'Medical'
  | 'Shelter'
  | 'RescueEquipment'
  | 'Fuel'
  | 'Other';

export type ResourceItemType = ItemTypeName | number;

export interface Warehouse {
  id: string;
  name: string;
  district: string;
  latitude: number;
  longitude: number;
  contactPhone?: string | null;
  inventoryItemCount?: number;
  vehicleCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryItem {
  id: string;
  warehouseId: string;
  warehouseName: string;
  itemName: string;
  itemType: ResourceItemType;
  quantityAvailable: number;
  unit: string;
  reorderThreshold?: number | null;
  isLowStock: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ResourceListResponse<T> {
  total: number;
  page: number;
  pageSize: number;
  items: T[];
}

export interface CreateWarehouseDto {
  name: string;
  district: string;
  latitude: number;
  longitude: number;
  contactPhone?: string;
}

export interface UpdateWarehouseDto extends CreateWarehouseDto {}

export interface CreateInventoryDto {
  warehouseId: string;
  itemName: string;
  itemType: ResourceItemType;
  quantityAvailable: number;
  unit?: string;
  reorderThreshold?: number | null;
}

export interface UpdateInventoryDto {
  itemName: string;
  itemType: ResourceItemType;
  quantityAvailable: number;
  unit?: string;
  reorderThreshold?: number | null;
}

export interface AdjustInventoryDto {
  quantityChange: number;
  reason?: string;
}

export interface DispatchAllocationItem {
  itemName: string;
  quantity: number;
}

export interface DispatchPlan {
  id: string;
  missionId: string;
  district: string;
  teamsRequired: number;
  warehouseId: string;
  warehouseName: string;
  routeSummary: string;
  estimatedArrivalMinutes: number;
  approvalStatus: 'PendingApproval' | 'Approved' | 'Rejected';
  items: DispatchAllocationItem[];
  createdAt: string;
}

export interface CreateDispatchPlanRequest {
  missionId: string;
  district: string;
  teamsRequired: number;
  warehouseId: string;
  items: DispatchAllocationItem[];
}

export const ITEM_TYPE_LABELS: Record<string, string> = {
  Food: 'Food',
  Medical: 'Medical',
  Shelter: 'Shelter',
  RescueEquipment: 'Rescue Equipment',
  Fuel: 'Fuel',
  Other: 'Other',
};

export function getItemTypeLabel(itemType: ResourceItemType): string {
  if (typeof itemType === 'string') {
    return ITEM_TYPE_LABELS[itemType] ?? itemType;
  }

  const map: Record<number, string> = {
    0: 'Food',
    1: 'Medical',
    2: 'Shelter',
    3: 'Rescue Equipment',
    4: 'Fuel',
    5: 'Other',
  };

  return map[itemType] ?? 'Other';
}
