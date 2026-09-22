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
        title: Row(
          children: const [
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
    );
  }
}
