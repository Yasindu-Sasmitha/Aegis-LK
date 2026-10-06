import 'package:flutter_test/flutter_test.dart';
import 'package:aegis_lk/features/resource/models/resource_models.dart';

void main() {
  group('Resource Models Test', () {
    test('Warehouse model should parse JSON correctly', () {
      final json = {
        "id": "11111111-1111-1111-1111-111111111111",
        "name": "Colombo Central Warehouse",
        "district": "Colombo",
        "latitude": 6.9271,
        "longitude": 79.8612,
        "contactPhone": "0112345678"
      };

      final warehouse = Warehouse.fromJson(json);

      expect(warehouse.id, "11111111-1111-1111-1111-111111111111");
      expect(warehouse.name, "Colombo Central Warehouse");
      expect(warehouse.district, "Colombo");
      expect(warehouse.latitude, 6.9271);
      expect(warehouse.longitude, 79.8612);
    });

    test('Inventory model should parse JSON correctly', () {
      final json = {
        "id": "22222222-2222-2222-2222-222222222222",
        "warehouseId": "11111111-1111-1111-1111-111111111111",
        "itemName": "Water Bottles",
        "itemType": 0,
        "quantityAvailable": 5000,
        "unit": "units",
        "reorderThreshold": 500
      };

      final inventory = Inventory.fromJson(json);

      expect(inventory.itemName, "Water Bottles");
      expect(inventory.quantityAvailable, 5000);
      expect(inventory.isLowStock, false); // 5000 > 500
    });

    test('Inventory model should flag low stock correctly', () {
      final json = {
        "itemName": "Medical Kits",
        "quantityAvailable": 10,
        "reorderThreshold": 20
      };

      final inventory = Inventory.fromJson(json);
      expect(inventory.isLowStock, true); // 10 < 20
    });
  });
}