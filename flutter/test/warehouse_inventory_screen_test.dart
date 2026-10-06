import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aegis_lk/features/resource/screens/warehouse_inventory_screen.dart';

void main() {
  group('Warehouse Inventory Screen Test', () {
    testWidgets('should display loading indicator initially', (tester) async {
      await tester.pumpWidget(const MaterialApp(
        home: WarehouseInventoryScreen(),
      ));

      // Initially, a loading spinner should be shown
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('should display inventory list after data loads', (tester) async {
      await tester.pumpWidget(const MaterialApp(
        home: WarehouseInventoryScreen(),
      ));

      // Wait for the API call to finish (mock it if needed)
      await tester.pumpAndSettle();

      // Check if the screen title is present
      expect(find.text('Warehouse Inventory'), findsOneWidget);
    });

    testWidgets('should show low stock warning for items below threshold', (tester) async {
      await tester.pumpWidget(const MaterialApp(
        home: WarehouseInventoryScreen(),
      ));
      await tester.pumpAndSettle();

      // If an item is low stock, a warning icon should be visible
      expect(find.byIcon(Icons.warning), findsWidgets);
    });
  });
}