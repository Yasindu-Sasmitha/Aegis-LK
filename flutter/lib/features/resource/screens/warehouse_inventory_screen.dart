import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/resource_models.dart';
import '../services/resource_service.dart';
import '../../../shared/auth/auth_provider.dart';
import '../../../shared/theme/aegis_theme.dart';

/// Sri Lankan districts for the dropdown picker.
const _sriLankaDistricts = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo',
  'Galle', 'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara',
  'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala', 'Mannar',
  'Matale', 'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya',
  'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya',
];

/// Warehouse browser with optional write access for officers/admins.
///
/// Supports search by warehouse name or district, filter by stock status,
/// and shows a summary bar with total warehouses and low-stock items.
/// Officers and Admins see an "Add Warehouse" button and can create new ones.
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

  // ── Add Warehouse Dialog ──────────────────────────────────────────────────

  void _showAddWarehouseDialog() {
    final formKey = GlobalKey<FormState>();
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final latCtrl = TextEditingController();
    final lngCtrl = TextEditingController();
    String? selectedDistrict;
    bool submitting = false;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setDialogState) {
            return Dialog(
              backgroundColor: const Color(0xFF0F172A),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: const BorderSide(color: Color(0xFF1E3A8A)),
              ),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 500),
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Form(
                    key: formKey,
                    child: SingleChildScrollView(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // ── Header
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: kAccent.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Icon(Icons.add_business_outlined,
                                    color: kAccent, size: 24),
                              ),
                              const SizedBox(width: 12),
                              const Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Add New Warehouse',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 18,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                    SizedBox(height: 2),
                                    Text(
                                      'Fill in the details to register a new warehouse',
                                      style: TextStyle(
                                        color: Color(0xFF94A3B8),
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              IconButton(
                                icon: const Icon(Icons.close,
                                    color: Color(0xFF94A3B8), size: 20),
                                onPressed: () => Navigator.pop(ctx),
                              ),
                            ],
                          ),
                          const SizedBox(height: 20),
                          const Divider(color: Color(0xFF1E3A8A), height: 1),
                          const SizedBox(height: 20),

                          // ── Name
                          _dialogField(
                            label: 'Warehouse Name',
                            icon: Icons.warehouse_outlined,
                            child: TextFormField(
                              controller: nameCtrl,
                              style: const TextStyle(color: Colors.white),
                              decoration: _inputDeco('e.g. Colombo Central Hub'),
                              validator: (v) =>
                                  (v == null || v.trim().isEmpty) ? 'Required' : null,
                            ),
                          ),
                          const SizedBox(height: 16),

                          // ── District
                          _dialogField(
                            label: 'District',
                            icon: Icons.location_city_outlined,
                            child: DropdownButtonFormField<String>(
                              value: selectedDistrict,
                              dropdownColor: const Color(0xFF0F2B48),
                              style: const TextStyle(color: Colors.white, fontSize: 14),
                              decoration: _inputDeco('Select district'),
                              items: _sriLankaDistricts
                                  .map((d) => DropdownMenuItem(
                                      value: d, child: Text(d)))
                                  .toList(),
                              onChanged: (v) =>
                                  setDialogState(() => selectedDistrict = v),
                              validator: (v) => v == null ? 'Required' : null,
                            ),
                          ),
                          const SizedBox(height: 16),

                          // ── Lat / Lng row
                          Row(
                            children: [
                              Expanded(
                                child: _dialogField(
                                  label: 'Latitude',
                                  icon: Icons.explore_outlined,
                                  child: TextFormField(
                                    controller: latCtrl,
                                    keyboardType:
                                        const TextInputType.numberWithOptions(
                                            decimal: true, signed: true),
                                    style: const TextStyle(color: Colors.white),
                                    decoration: _inputDeco('e.g. 6.9271'),
                                    validator: (v) {
                                      if (v == null || v.trim().isEmpty) return 'Required';
                                      if (double.tryParse(v.trim()) == null) {
                                        return 'Invalid';
                                      }
                                      return null;
                                    },
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: _dialogField(
                                  label: 'Longitude',
                                  icon: Icons.explore_outlined,
                                  child: TextFormField(
                                    controller: lngCtrl,
                                    keyboardType:
                                        const TextInputType.numberWithOptions(
                                            decimal: true, signed: true),
                                    style: const TextStyle(color: Colors.white),
                                    decoration: _inputDeco('e.g. 79.8612'),
                                    validator: (v) {
                                      if (v == null || v.trim().isEmpty) return 'Required';
                                      if (double.tryParse(v.trim()) == null) {
                                        return 'Invalid';
                                      }
                                      return null;
                                    },
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),

                          // ── Contact Phone
                          _dialogField(
                            label: 'Contact Phone (optional)',
                            icon: Icons.phone_outlined,
                            child: TextFormField(
                              controller: phoneCtrl,
                              keyboardType: TextInputType.phone,
                              style: const TextStyle(color: Colors.white),
                              decoration: _inputDeco('e.g. 0771234567'),
                            ),
                          ),
                          const SizedBox(height: 24),

                          // ── Actions
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              TextButton(
                                onPressed: submitting
                                    ? null
                                    : () => Navigator.pop(ctx),
                                child: const Text('Cancel'),
                              ),
                              const SizedBox(width: 12),
                              ElevatedButton.icon(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: kAccent,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 20, vertical: 12),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                ),
                                onPressed: submitting
                                    ? null
                                    : () async {
                                        if (!formKey.currentState!.validate()) return;
                                        setDialogState(() => submitting = true);
                                        try {
                                          await _service.createWarehouse(
                                            name: nameCtrl.text.trim(),
                                            district: selectedDistrict!,
                                            latitude:
                                                double.parse(latCtrl.text.trim()),
                                            longitude:
                                                double.parse(lngCtrl.text.trim()),
                                            contactPhone:
                                                phoneCtrl.text.trim().isEmpty
                                                    ? null
                                                    : phoneCtrl.text.trim(),
                                          );
                                          if (ctx.mounted) Navigator.pop(ctx);
                                          _load(); // refresh list
                                          if (mounted) {
                                            ScaffoldMessenger.of(context)
                                                .showSnackBar(
                                              const SnackBar(
                                                content: Text(
                                                    'Warehouse created successfully'),
                                                backgroundColor:
                                                    Color(0xFF059669),
                                              ),
                                            );
                                          }
                                        } catch (e) {
                                          setDialogState(
                                              () => submitting = false);
                                          if (ctx.mounted) {
                                            ScaffoldMessenger.of(ctx)
                                                .showSnackBar(
                                              SnackBar(
                                                content: Text(
                                                    'Failed: ${e.toString().replaceFirst("Exception: ", "")}'),
                                                backgroundColor: Colors.red,
                                              ),
                                            );
                                          }
                                        }
                                      },
                                icon: submitting
                                    ? const SizedBox(
                                        width: 16,
                                        height: 16,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.white,
                                        ),
                                      )
                                    : const Icon(Icons.add, size: 18),
                                label: Text(
                                    submitting ? 'Creating…' : 'Create Warehouse'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  /// Labelled field wrapper used inside the dialog.
  Widget _dialogField({
    required String label,
    required IconData icon,
    required Widget child,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 14, color: const Color(0xFF94A3B8)),
            const SizedBox(width: 6),
            Text(
              label,
              style: const TextStyle(
                color: Color(0xFFCBD5E1),
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        child,
      ],
    );
  }

  InputDecoration _inputDeco(String hint) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: Color(0xFF475569), fontSize: 13),
      filled: true,
      fillColor: const Color(0xFF0F2B48),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0xFF1E3A8A)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Color(0xFF1E3A8A)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: kAccent, width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: Colors.redAccent),
      ),
    );
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final isOfficer = auth.isOfficerOrAdmin;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Warehouse Inventory'),
        actions: [
          if (isOfficer)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: kAccent,
                  foregroundColor: Colors.white,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                icon: const Icon(Icons.add, size: 18),
                label: const Text('Add Warehouse',
                    style:
                        TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                onPressed: _showAddWarehouseDialog,
              ),
            ),
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