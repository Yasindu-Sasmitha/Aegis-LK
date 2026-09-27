import 'package:flutter/material.dart';
import '../../../shared/theme/aegis_theme.dart';
import '../models/recovery_models.dart';
import '../services/recovery_service.dart';

class ShelterFinderScreen extends StatefulWidget {
  final bool showAppBar;
  const ShelterFinderScreen({super.key, this.showAppBar = true});

  @override
  State<ShelterFinderScreen> createState() => _ShelterFinderScreenState();
}

class _ShelterFinderScreenState extends State<ShelterFinderScreen> {
  final RecoveryService _service = RecoveryService();
  late Future<List<ShelterModel>> _sheltersFuture;
  String _selectedDistrict = 'All';
  String _searchQuery = '';

  final List<String> _districts = [
    'All', 'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle',
    'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle',
    'Kilinochchi', 'Kurunegala', 'Mannar', 'Matale', 'Matara', 'Monaragala',
    'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura',
    'Trincomalee', 'Vavuniya'
  ];

  @override
  void initState() {
    super.initState();
    _loadShelters();
  }

  void _loadShelters() {
    setState(() {
      _sheltersFuture = _service.fetchShelters(
        district: _selectedDistrict == 'All' ? null : _selectedDistrict,
      );
    });
  }

  void _showShelterContactDialog(ShelterModel s) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        title: const Row(
          children: [
            Icon(Icons.contact_phone_outlined, color: kAccent, size: 22),
            SizedBox(width: 8),
            Text('Shelter Contact', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17, color: kTextPrimary)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(s.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: kTextPrimary)),
            const SizedBox(height: 4),
            Text('Location: ${s.location} (${s.district})', style: const TextStyle(fontSize: 13, color: kTextSecondary)),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.person_outline, size: 16, color: kTextSecondary),
                      const SizedBox(width: 6),
                      Text('Officer: ${s.contactPerson.isNotEmpty ? s.contactPerson : "DMC Coordinator"}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.phone, size: 16, color: kAccent),
                      const SizedBox(width: 6),
                      Text('Phone: ${s.contactPhone.isNotEmpty ? s.contactPhone : "+94 11 213 6136"}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F2B48))),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Close', style: TextStyle(color: kTextSecondary)),
          ),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0F2B48),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            icon: const Icon(Icons.copy, size: 16, color: Colors.white),
            label: const Text('Dismiss', style: TextStyle(color: Colors.white)),
            onPressed: () => Navigator.pop(ctx),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kSurface,
      appBar: widget.showAppBar
          ? AppBar(
              backgroundColor: kNavBg,
              iconTheme: const IconThemeData(color: Colors.white),
              title: const Text('Safe Emergency Shelters', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            )
          : null,
      body: Column(
        children: [
          // Filter Header Bar
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              color: kNavBg,
              borderRadius: BorderRadius.only(
                bottomLeft: Radius.circular(16),
                bottomRight: Radius.circular(16),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        height: 44,
                        decoration: BoxDecoration(
                          color: const Color(0xFF0F2B48),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFF1E3A8A)),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: _selectedDistrict,
                            dropdownColor: const Color(0xFF0C2242),
                            icon: const Icon(Icons.arrow_drop_down, color: kAccent),
                            style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                            items: _districts
                                .map((d) => DropdownMenuItem(value: d, child: Text(d == 'All' ? 'All Districts' : '$d District')))
                                .toList(),
                            onChanged: (val) {
                              if (val != null) {
                                _selectedDistrict = val;
                                _loadShelters();
                              }
                            },
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    IconButton(
                      icon: const Icon(Icons.refresh, color: kAccent),
                      tooltip: 'Reload shelters',
                      onPressed: _loadShelters,
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Container(
                  height: 40,
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F2B48),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFF1E3A8A)),
                  ),
                  child: TextField(
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                    decoration: const InputDecoration(
                      hintText: 'Search by shelter name or location...',
                      hintStyle: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                      prefixIcon: Icon(Icons.search, size: 18, color: Color(0xFF94A3B8)),
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.symmetric(vertical: 10),
                    ),
                    onChanged: (val) => setState(() => _searchQuery = val.toLowerCase().trim()),
                  ),
                ),
              ],
            ),
          ),

          // Shelters List
          Expanded(
            child: FutureBuilder<List<ShelterModel>>(
              future: _sheltersFuture,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.error_outline, color: kDanger, size: 40),
                          const SizedBox(height: 10),
                          Text('Failed to load shelters: ${snapshot.error}', textAlign: TextAlign.center, style: const TextStyle(color: kTextSecondary)),
                          const SizedBox(height: 14),
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0F2B48)),
                            onPressed: _loadShelters,
                            child: const Text('Try Again', style: TextStyle(color: Colors.white)),
                          ),
                        ],
                      ),
                    ),
                  );
                }

                final allShelters = snapshot.data ?? [];
                final filtered = allShelters.where((s) {
                  if (_searchQuery.isEmpty) return true;
                  return s.name.toLowerCase().contains(_searchQuery) ||
                      s.location.toLowerCase().contains(_searchQuery) ||
                      s.district.toLowerCase().contains(_searchQuery);
                }).toList();

                if (filtered.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.night_shelter_outlined, size: 50, color: Colors.grey[400]),
                        const SizedBox(height: 10),
                        Text(
                          _selectedDistrict == 'All'
                              ? 'No shelters found.'
                              : 'No active shelters registered in $_selectedDistrict District.',
                          style: const TextStyle(color: kTextSecondary, fontSize: 14),
                        ),
                      ],
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async => _loadShelters(),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: filtered.length,
                    itemBuilder: (context, index) {
                      final s = filtered[index];
                      final isFull = s.status.toLowerCase() == 'full' || s.remainingBeds <= 0;
                      final occupancyPercent = s.capacity > 0
                          ? ((s.currentOccupancy / s.capacity) * 100).clamp(0, 100).round()
                          : 0;

                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: isFull
                                          ? kDanger.withValues(alpha: 0.1)
                                          : kSuccess.withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Icon(
                                      Icons.night_shelter_outlined,
                                      color: isFull ? kDanger : kSuccess,
                                      size: 24,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          s.name,
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: kTextPrimary),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          '📍 ${s.location} (${s.district})',
                                          style: const TextStyle(color: kTextSecondary, fontSize: 13),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: isFull
                                          ? kDanger.withValues(alpha: 0.15)
                                          : kSuccess.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(
                                        color: isFull ? kDanger.withValues(alpha: 0.4) : kSuccess.withValues(alpha: 0.4),
                                      ),
                                    ),
                                    child: Text(
                                      isFull ? 'FULL' : 'OPEN',
                                      style: TextStyle(
                                        color: isFull ? kDanger : kSuccess,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 11,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 14),

                              // Capacity Bar
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'Occupancy: ${s.currentOccupancy} / ${s.capacity} persons',
                                    style: const TextStyle(fontSize: 12, color: kTextSecondary),
                                  ),
                                  Text(
                                    '$occupancyPercent% (${s.remainingBeds} beds free)',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: isFull ? kDanger : const Color(0xFF0F2B48),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              ClipRRect(
                                borderRadius: BorderRadius.circular(4),
                                child: LinearProgressIndicator(
                                  value: s.capacity > 0 ? (s.currentOccupancy / s.capacity).clamp(0.0, 1.0) : 0,
                                  minHeight: 7,
                                  backgroundColor: const Color(0xFFE2E8F0),
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                    isFull ? kDanger : (occupancyPercent > 80 ? kWarning : kSuccess),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 14),

                              // Bottom row with contact and action
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Row(
                                      children: [
                                        const Icon(Icons.person_outline, size: 15, color: kTextMuted),
                                        const SizedBox(width: 4),
                                        Flexible(
                                          child: Text(
                                            s.contactPerson.isNotEmpty ? s.contactPerson : 'DMC Officer',
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(fontSize: 12, color: kTextSecondary),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  ElevatedButton.icon(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF0F2B48),
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                    ),
                                    icon: const Icon(Icons.phone, size: 14, color: kAccent),
                                    label: const Text('Contact', style: TextStyle(color: Colors.white, fontSize: 12)),
                                    onPressed: () => _showShelterContactDialog(s),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFF0D9488),
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_location_alt_outlined),
        label: const Text('Add Shelter', style: TextStyle(fontWeight: FontWeight.bold)),
        onPressed: () => _showAddShelterModal(context),
      ),
    );
  }

  void _showAddShelterModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _AddShelterSheet(
        districts: _districts.where((d) => d != 'All').toList(),
        onShelterCreated: () {
          _loadShelters();
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              backgroundColor: kSuccess,
              content: Text('✅ Emergency Shelter registered successfully!'),
            ),
          );
        },
      ),
    );
  }
}

class _AddShelterSheet extends StatefulWidget {
  final List<String> districts;
  final VoidCallback onShelterCreated;

  const _AddShelterSheet({
    required this.districts,
    required this.onShelterCreated,
  });

  @override
  State<_AddShelterSheet> createState() => _AddShelterSheetState();
}

class _AddShelterSheetState extends State<_AddShelterSheet> {
  final _formKey = GlobalKey<FormState>();
  final _service = RecoveryService();

  final _nameCtrl = TextEditingController();
  final _locationCtrl = TextEditingController();
  final _capacityCtrl = TextEditingController(text: '200');
  final _contactPersonCtrl = TextEditingController();
  final _contactPhoneCtrl = TextEditingController(text: '+94 ');

  late String _district;
  bool _isSubmitting = false;

  final List<String> _allFacilities = [
    'Clean Water',
    'Emergency Power',
    'Medical Post',
    'Sanitation & Bathrooms',
    'Relief Kitchen',
    'Bedding & Blankets',
  ];
  final Set<String> _selectedFacilities = {'Clean Water', 'Sanitation & Bathrooms', 'Bedding & Blankets'};

  @override
  void initState() {
    super.initState();
    _district = widget.districts.contains('Colombo') ? 'Colombo' : widget.districts.first;
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _locationCtrl.dispose();
    _capacityCtrl.dispose();
    _contactPersonCtrl.dispose();
    _contactPhoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSubmitting = true);

    try {
      final capacity = int.tryParse(_capacityCtrl.text.trim()) ?? 100;
      await _service.createShelter(
        name: _nameCtrl.text.trim(),
        district: _district,
        location: _locationCtrl.text.trim(),
        capacity: capacity,
        contactPerson: _contactPersonCtrl.text.trim(),
        contactPhone: _contactPhoneCtrl.text.trim(),
        facilities: _selectedFacilities.toList(),
      );

      if (mounted) {
        Navigator.pop(context);
        widget.onShelterCreated();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: kDanger,
            content: Text('Failed to register shelter: $e'),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.only(
        top: 20,
        left: 20,
        right: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.88,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.night_shelter, color: Color(0xFF0D9488), size: 24),
                      SizedBox(width: 8),
                      Text(
                        'Register New Shelter',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: kTextPrimary),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: kTextMuted),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              const Text(
                'Add verified evacuation centers with real-time bed capacity and contacts.',
                style: TextStyle(fontSize: 12, color: kTextSecondary),
              ),
              const Divider(height: 24, color: kBorder),

              // Shelter Name
              const Text('Shelter / Evacuation Camp Name *', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: kTextPrimary)),
              const SizedBox(height: 6),
              TextFormField(
                controller: _nameCtrl,
                decoration: InputDecoration(
                  hintText: 'e.g. Royal College Community Hall',
                  prefixIcon: const Icon(Icons.domain, size: 18, color: kTextMuted),
                  filled: true,
                  fillColor: const Color(0xFFF8FAFC),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: kBorder)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: kBorder)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                ),
                validator: (val) => val == null || val.trim().isEmpty ? 'Please enter shelter name' : null,
              ),
              const SizedBox(height: 14),

              // District & Capacity Row
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    flex: 3,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('District *', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: kTextPrimary)),
                        const SizedBox(height: 6),
                        DropdownButtonFormField<String>(
                          initialValue: _district,
                          decoration: InputDecoration(
                            filled: true,
                            fillColor: const Color(0xFFF8FAFC),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: kBorder)),
                            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: kBorder)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          ),
                          items: widget.districts.map((d) => DropdownMenuItem(value: d, child: Text(d, style: const TextStyle(fontSize: 13)))).toList(),
                          onChanged: (val) {
                            if (val != null) setState(() => _district = val);
                          },
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Bed Capacity *', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: kTextPrimary)),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _capacityCtrl,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                            hintText: '200',
                            prefixIcon: const Icon(Icons.bed, size: 18, color: kTextMuted),
                            filled: true,
                            fillColor: const Color(0xFFF8FAFC),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: kBorder)),
                            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: kBorder)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                          ),
                          validator: (val) {
                            final n = int.tryParse(val ?? '');
                            if (n == null || n <= 0) return 'Invalid';
                            return null;
                          },
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Specific Location
              const Text('Specific Location / Street Address *', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: kTextPrimary)),
              const SizedBox(height: 6),
              TextFormField(
                controller: _locationCtrl,
                decoration: InputDecoration(
                  hintText: 'e.g. Rajakeeya Mawatha, Colombo 07',
                  prefixIcon: const Icon(Icons.location_on_outlined, size: 18, color: kTextMuted),
                  filled: true,
                  fillColor: const Color(0xFFF8FAFC),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: kBorder)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: kBorder)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                ),
                validator: (val) => val == null || val.trim().isEmpty ? 'Please enter address' : null,
              ),
              const SizedBox(height: 14),

              // Coordinator & Contact Phone Row
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Coordinator Name *', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: kTextPrimary)),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _contactPersonCtrl,
                          decoration: InputDecoration(
                            hintText: 'e.g. Kamal Perera',
                            prefixIcon: const Icon(Icons.person_outline, size: 18, color: kTextMuted),
                            filled: true,
                            fillColor: const Color(0xFFF8FAFC),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: kBorder)),
                            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: kBorder)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                          ),
                          validator: (val) => val == null || val.trim().isEmpty ? 'Enter name' : null,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Phone Number *', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: kTextPrimary)),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: _contactPhoneCtrl,
                          keyboardType: TextInputType.phone,
                          decoration: InputDecoration(
                            hintText: '+94 77 123 4567',
                            prefixIcon: const Icon(Icons.phone_outlined, size: 18, color: kTextMuted),
                            filled: true,
                            fillColor: const Color(0xFFF8FAFC),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: kBorder)),
                            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: kBorder)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                          ),
                          validator: (val) => val == null || val.trim().length < 8 ? 'Enter phone' : null,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Facilities Chips
              const Text('Available Facilities', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: kTextPrimary)),
              const SizedBox(height: 6),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: _allFacilities.map((fac) {
                  final isSelected = _selectedFacilities.contains(fac);
                  return FilterChip(
                    label: Text(fac, style: TextStyle(fontSize: 11, color: isSelected ? Colors.white : kTextPrimary)),
                    selected: isSelected,
                    selectedColor: const Color(0xFF0D9488),
                    backgroundColor: const Color(0xFFF1F5F9),
                    checkmarkColor: Colors.white,
                    onSelected: (val) {
                      setState(() {
                        if (val) {
                          _selectedFacilities.add(fac);
                        } else {
                          _selectedFacilities.remove(fac);
                        }
                      });
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 20),

              // Submit Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0D9488),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  icon: _isSubmitting
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Icon(Icons.check_circle_outline, color: Colors.white),
                  label: Text(
                    _isSubmitting ? 'Registering...' : 'Save & Register Shelter',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.white),
                  ),
                  onPressed: _isSubmitting ? null : _submit,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
