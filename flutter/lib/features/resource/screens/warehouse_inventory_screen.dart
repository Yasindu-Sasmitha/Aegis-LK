import 'package:flutter/material.dart';

import '../models/resource_models.dart';
import '../services/resource_service.dart';

/// Read-only browser for field officers: warehouses + their stock.
///
/// Supports search by warehouse name or district, filter by stock status,
/// and shows a summary bar with total warehouses and low-stock items.
class WarehouseInventoryScreen extends StatefulWidget {
  const WarehouseInventoryScreen({super.key});

  @override
  State<WarehouseInventoryScreen> createState() => _WarehouseInventoryScreenState();
}

class _WarehouseInventoryScreenState extends State<WarehouseInventoryScreen> {
  final _service = ResourceService();
  final _searchController = TextEditingController();

  List<Warehouse> _warehouses = [];
  List<InventoryItem> _inventory = [];
  bool _loading = true;
  String? _error;
  String _filter = 'all'; // all | low

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final whRes = await _service.fetchWarehouses(pageSize: 100);
      final invRes = await _service.fetchInventoryItems(pageSize: 200);
      setState(() {
        _warehouses = whRes.items;
        _inventory = invRes.items;
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  List<Warehouse> get _filteredWarehouses {
    final q = _searchController.text.trim().toLowerCase();
    if (q.isEmpty) return _warehouses;
    return _warehouses
        .where((w) =>
            w.name.toLowerCase().contains(q) ||
            w.district.toLowerCase().contains(q))
        .toList();
  }

  List<InventoryItem> _itemsFor(String warehouseId) {
    final items = _inventory.where((i) => i.warehouseId == warehouseId).toList();
    if (_filter == 'low') {
      return items.where((i) => i.isLowStock).toList();
    }
    return items;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Warehouse Inventory'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _load,
          ),
        ],
      ),
      body: Column(
        children: [
          _buildSummaryBar(),
          _buildSearchBar(),
          _buildFilterChips(),
          Expanded(child: _buildBody()),
        ],
      ),
    );
  }

  Widget _buildSummaryBar() {
    final totalLow = _inventory.where((i) => i.isLowStock).length;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      color: const Color(0xFF0F172A),
      child: Row(
        children: [
          _kpi('${_warehouses.length}', 'Warehouses'),
          const SizedBox(width: 24),
          _kpi('${_inventory.length}', 'Items'),
          const SizedBox(width: 24),
          _kpi('$totalLow', 'Low stock', valueColor: Colors.amber),
        ],
      ),
    );
  }

  Widget _kpi(String value, String label, {Color? valueColor}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          value,
          style: TextStyle(
            color: valueColor ?? Colors.white,
            fontSize: 20,
            fontWeight: FontWeight.w800,
          ),
        ),
        Text(
          label,
          style: const TextStyle(color: Colors.white70, fontSize: 12),
        ),
      ],
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: TextField(
        controller: _searchController,
        decoration: InputDecoration(
          hintText: 'Search warehouse or district…',
          prefixIcon: const Icon(Icons.search),
          suffixIcon: _searchController.text.isEmpty
              ? null
              : IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: () {
                    _searchController.clear();
                    setState(() {});
                  },
                ),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
        onChanged: (_) => setState(() {}),
      ),
    );
  }

  Widget _buildFilterChips() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          FilterChip(
            label: const Text('All'),
            selected: _filter == 'all',
            onSelected: (_) => setState(() => _filter = 'all'),
          ),
          const SizedBox(width: 8),
          FilterChip(
            label: const Text('Low stock only'),
            selected: _filter == 'low',
            onSelected: (_) => setState(() => _filter = 'low'),
          ),
        ],
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, color: Colors.red, size: 48),
              const SizedBox(height: 12),
              Text(_error!, textAlign: TextAlign.center),
              const SizedBox(height: 12),
              ElevatedButton(onPressed: _load, child: const Text('Retry')),
            ],
          ),
        ),
      );
    }

    final warehouses = _filteredWarehouses;
    if (warehouses.isEmpty) {
      return const Center(child: Text('No warehouses match your search.'));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: warehouses.length,
      itemBuilder: (context, index) {
        final w = warehouses[index];
        final items = _itemsFor(w.id);
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ExpansionTile(
            title: Text(
              w.name,
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
            subtitle: Text('${w.district} • ${w.contactPhone ?? "no contact"}'),
            children: [
              if (items.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(16),
                  child: Text('No matching stock items.'),
                )
              else
                ...items.map((i) => ListTile(
                      dense: true,
                      title: Text(i.itemName),
                      subtitle: Text('${i.itemType} • ${i.unit}'),
                      trailing: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '${i.quantityAvailable}',
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 15,
                            ),
                          ),
                          if (i.isLowStock)
                            const Text(
                              'LOW',
                              style: TextStyle(
                                color: Colors.orange,
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                        ],
                      ),
                    )),
            ],
          ),
        );
      },
    );
  }
}