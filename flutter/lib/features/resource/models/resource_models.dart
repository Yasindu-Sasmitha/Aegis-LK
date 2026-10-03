/// Data models for the Resource & Logistics module.
///
/// These mirror the DTOs returned by the ASP.NET Core backend at
/// /api/resource/* and are intentionally minimal — only the fields
/// the mobile UI actually renders.
library;

class Warehouse {
  final String id;
  final String name;
  final String district;
  final double latitude;
  final double longitude;
  final String? contactPhone;
  final int inventoryItemCount;
  final int vehicleCount;

  Warehouse({
    required this.id,
    required this.name,
    required this.district,
    required this.latitude,
    required this.longitude,
    this.contactPhone,
    this.inventoryItemCount = 0,
    this.vehicleCount = 0,
  });

  factory Warehouse.fromJson(Map<String, dynamic> json) => Warehouse(
        id: (json['id'] ?? json['Id'] ?? '') as String,
        name: (json['name'] ?? json['Name'] ?? '') as String,
        district: (json['district'] ?? json['District'] ?? '') as String,
        latitude: (json['latitude'] ?? json['Latitude'] ?? 0).toDouble(),
        longitude: (json['longitude'] ?? json['Longitude'] ?? 0).toDouble(),
        contactPhone: (json['contactPhone'] ?? json['ContactPhone']) as String?,
        inventoryItemCount: (json['inventoryItemCount'] ?? json['InventoryItemCount'] ?? 0) as int,
        vehicleCount: (json['vehicleCount'] ?? json['VehicleCount'] ?? 0) as int,
      );
}

class InventoryItem {
  final String id;
  final String warehouseId;
  final String warehouseName;
  final String itemName;
  final String itemType;
  final int quantityAvailable;
  final String unit;
  final int? reorderThreshold;
  final bool isLowStock;

  InventoryItem({
    required this.id,
    required this.warehouseId,
    required this.warehouseName,
    required this.itemName,
    required this.itemType,
    required this.quantityAvailable,
    required this.unit,
    this.reorderThreshold,
    required this.isLowStock,
  });

  factory InventoryItem.fromJson(Map<String, dynamic> json) => InventoryItem(
        id: (json['id'] ?? json['Id'] ?? '') as String,
        warehouseId: (json['warehouseId'] ?? json['WarehouseId'] ?? '') as String,
        warehouseName: (json['warehouseName'] ?? json['WarehouseName'] ?? '') as String,
        itemName: (json['itemName'] ?? json['ItemName'] ?? '') as String,
        itemType: _itemTypeLabel(json['itemType'] ?? json['ItemType']),
        quantityAvailable: (json['quantityAvailable'] ?? json['QuantityAvailable'] ?? 0) as int,
        unit: (json['unit'] ?? json['Unit'] ?? '') as String,
        reorderThreshold: (json['reorderThreshold'] ?? json['ReorderThreshold']) as int?,
        isLowStock: (json['isLowStock'] ?? json['IsLowStock'] ?? false) as bool,
      );

  static String _itemTypeLabel(dynamic raw) {
    if (raw is String) return raw;
    switch (raw as int?) {
      case 0:
        return 'Food';
      case 1:
        return 'Medical';
      case 2:
        return 'Shelter';
      case 3:
        return 'Rescue Equipment';
      case 4:
        return 'Fuel';
      default:
        return 'Other';
    }
  }
}

class DispatchPlanItem {
  final String itemName;
  final int quantity;

  DispatchPlanItem({required this.itemName, required this.quantity});

  factory DispatchPlanItem.fromJson(Map<String, dynamic> json) => DispatchPlanItem(
        itemName: (json['itemName'] ?? json['ItemName'] ?? '') as String,
        quantity: (json['quantity'] ?? json['Quantity'] ?? 0) as int,
      );
}

class DispatchPlan {
  final String id;
  final String missionId;
  final String district;
  final int teamsRequired;
  final String warehouseId;
  final String warehouseName;
  final String routeSummary;
  final int estimatedArrivalMinutes;
  final String approvalStatus;
  final List<DispatchPlanItem> items;
  final DateTime createdAt;

  DispatchPlan({
    required this.id,
    required this.missionId,
    required this.district,
    required this.teamsRequired,
    required this.warehouseId,
    required this.warehouseName,
    required this.routeSummary,
    required this.estimatedArrivalMinutes,
    required this.approvalStatus,
    required this.items,
    required this.createdAt,
  });

  factory DispatchPlan.fromJson(Map<String, dynamic> json) {
    final rawItems = (json['items'] ?? json['Items'] ?? []) as List<dynamic>;
    return DispatchPlan(
      id: (json['id'] ?? json['Id'] ?? '') as String,
      missionId: (json['missionId'] ?? json['MissionId'] ?? '') as String,
      district: (json['district'] ?? json['District'] ?? '') as String,
      teamsRequired: (json['teamsRequired'] ?? json['TeamsRequired'] ?? 0) as int,
      warehouseId: (json['warehouseId'] ?? json['WarehouseId'] ?? '') as String,
      warehouseName: (json['warehouseName'] ?? json['WarehouseName'] ?? '') as String,
      routeSummary: (json['routeSummary'] ?? json['RouteSummary'] ?? '') as String,
      estimatedArrivalMinutes:
          (json['estimatedArrivalMinutes'] ?? json['EstimatedArrivalMinutes'] ?? 0) as int,
      approvalStatus: (json['approvalStatus'] ?? json['ApprovalStatus'] ?? 'PendingApproval') as String,
      items: rawItems.map((e) => DispatchPlanItem.fromJson(e as Map<String, dynamic>)).toList(),
      createdAt: DateTime.tryParse((json['createdAt'] ?? json['CreatedAt'] ?? '') as String) ??
          DateTime.now(),
    );
  }
}

class ResourceListResponse<T> {
  final int total;
  final int page;
  final int pageSize;
  final List<T> items;

  ResourceListResponse({
    required this.total,
    required this.page,
    required this.pageSize,
    required this.items,
  });

  factory ResourceListResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>) itemParser,
  ) {
    final rawItems = (json['items'] ?? json['Items'] ?? []) as List<dynamic>;
    return ResourceListResponse(
      total: (json['total'] ?? json['Total'] ?? rawItems.length) as int,
      page: (json['page'] ?? json['Page'] ?? 1) as int,
      pageSize: (json['pageSize'] ?? json['PageSize'] ?? rawItems.length) as int,
      items: rawItems.map((e) => itemParser(e as Map<String, dynamic>)).toList(),
    );
  }
}