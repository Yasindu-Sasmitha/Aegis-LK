import 'package:flutter_test/flutter_test.dart';
import 'package:aegis_lk/features/resource/models/resource_models.dart';

void main() {
  group('Resource & Logistics Models Unit Tests', () {
    test('Warehouse.fromJson deserializes coordinates and fleet properties', () {
      final json = {
        'id': 'wh-colombo-01',
        'name': 'Colombo Central Relief Depot',
        'district': 'Colombo',
        'latitude': 6.9271,
        'longitude': 79.8612,
        'contactPhone': '+94 11 234 5678',
        'inventoryItemCount': 12,
        'vehicleCount': 4,
      };

      final warehouse = Warehouse.fromJson(json);

      expect(warehouse.id, 'wh-colombo-01');
      expect(warehouse.name, 'Colombo Central Relief Depot');
      expect(warehouse.district, 'Colombo');
      expect(warehouse.latitude, 6.9271);
      expect(warehouse.longitude, 79.8612);
      expect(warehouse.contactPhone, '+94 11 234 5678');
      expect(warehouse.inventoryItemCount, 12);
      expect(warehouse.vehicleCount, 4);
    });

    test('InventoryItem.fromJson deserializes stock quantity and threshold warnings', () {
      final json = {
        'id': 'inv-item-001',
        'warehouseId': 'wh-colombo-01',
        'warehouseName': 'Colombo Central Relief Depot',
        'itemName': 'Emergency First Aid Kits',
        'itemType': 'Medical',
        'quantityAvailable': 15,
        'unit': 'Boxes',
        'reorderThreshold': 20,
        'isLowStock': true,
      };

      final item = InventoryItem.fromJson(json);

      expect(item.id, 'inv-item-001');
      expect(item.warehouseName, 'Colombo Central Relief Depot');
      expect(item.itemName, 'Emergency First Aid Kits');
      expect(item.itemType, 'Medical');
      expect(item.quantityAvailable, 15);
      expect(item.unit, 'Boxes');
      expect(item.reorderThreshold, 20);
      expect(item.isLowStock, true);
    });

    test('DispatchPlan.fromJson parses approval status and route information', () {
      final json = {
        'id': 'disp-plan-888',
        'missionId': 'mis-101',
        'district': 'Kalutara',
        'teamsRequired': 2,
        'warehouseId': 'wh-colombo-01',
        'warehouseName': 'Colombo Central Relief Depot',
        'routeSummary': 'Via A2 highway to Kalutara Relief Camp',
        'estimatedArrivalMinutes': 60,
        'approvalStatus': 'PendingApproval',
        'createdAt': '2026-10-08T14:00:00.000Z',
        'items': [
          {
            'itemName': 'Bottled Water 5L',
            'quantity': 500,
          }
        ],
      };

      final plan = DispatchPlan.fromJson(json);

      expect(plan.id, 'disp-plan-888');
      expect(plan.missionId, 'mis-101');
      expect(plan.district, 'Kalutara');
      expect(plan.teamsRequired, 2);
      expect(plan.warehouseName, 'Colombo Central Relief Depot');
      expect(plan.routeSummary, 'Via A2 highway to Kalutara Relief Camp');
      expect(plan.estimatedArrivalMinutes, 60);
      expect(plan.approvalStatus, 'PendingApproval');
      expect(plan.items.length, 1);
      expect(plan.items.first.itemName, 'Bottled Water 5L');
      expect(plan.items.first.quantity, 500);
    });
  });
}
