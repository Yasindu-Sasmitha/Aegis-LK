export type WarehouseStatus = 'Active' | 'Low' | 'Critical';
export type ResourcePriority = 'Low' | 'Medium' | 'High';
export type DispatchStatus = 'Scheduled' | 'InTransit' | 'Delivered';
export type ResourceRequestStatus = 'Pending' | 'Approved' | 'Dispatched';

export type Warehouse = {
  id: string;
  name: string;
  district: string;
  capacity: number;
  availableStock: number;
  status: WarehouseStatus;
  updatedAt: string;
};

export type InventoryItem = {
  id: string;
  warehouseId: string;
  itemName: string;
  quantity: number;
  unit: string;
  reorderLevel: number;
  lastUpdated: string;
};

export type ResourceRequest = {
  id: string;
  itemName: string;
  quantity: number;
  priority: ResourcePriority;
  status: ResourceRequestStatus;
  requester: string;
  district: string;
};

export type DispatchItem = {
  id: string;
  requestId: string;
  destination: string;
  status: DispatchStatus;
  vehicleCount: number;
  eta: string;
};

export type DeliveryItem = {
  id: string;
  dispatchId: string;
  itemName: string;
  quantity: number;
  delivered: boolean;
  deliveredAt?: string;
};

export type ResourceSummary = {
  warehouseCount: number;
  totalInventory: number;
  criticalItems: number;
  activeDispatches: number;
};
