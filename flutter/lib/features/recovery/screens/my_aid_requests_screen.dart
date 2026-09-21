import 'package:flutter/material.dart';
import '../../../shared/theme/aegis_theme.dart';
import '../models/recovery_models.dart';
import '../services/recovery_service.dart';

class MyAidRequestsScreen extends StatefulWidget {
  final bool showAppBar;
  const MyAidRequestsScreen({super.key, this.showAppBar = true});

  @override
  State<MyAidRequestsScreen> createState() => _MyAidRequestsScreenState();
}

class _MyAidRequestsScreenState extends State<MyAidRequestsScreen> {
  final RecoveryService _service = RecoveryService();
  late Future<List<AidRequestModel>> _requestsFuture;
  String _selectedStatus = 'All';

  @override
  void initState() {
    super.initState();
    _loadRequests();
  }

  void _loadRequests() {
    setState(() {
      _requestsFuture = _service.fetchMyAidRequests();
    });
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'fulfilled':
        return kSuccess;
      case 'pending':
        return kWarning;
      case 'rejected':
      case 'cancelled':
        return kDanger;
      default:
        return const Color(0xFF2563EB);
    }
  }

  Color _getUrgencyColor(String urgency) {
    switch (urgency.toLowerCase()) {
      case 'critical':
        return kDanger;
      case 'high':
        return const Color(0xFFEA580C);
      case 'medium':
        return kWarning;
      default:
        return const Color(0xFF10B981);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kSurface,
      appBar: widget.showAppBar
          ? AppBar(
              backgroundColor: kNavBg,
              iconTheme: const IconThemeData(color: Colors.white),
              title: const Text('My Aid Applications', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            )
          : null,
      body: Column(
        children: [
          // Filter Row
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              color: kNavBg,
              borderRadius: BorderRadius.only(
                bottomLeft: Radius.circular(16),
                bottomRight: Radius.circular(16),
              ),
            ),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: ['All', 'Pending', 'Approved', 'Fulfilled', 'Rejected'].map((st) {
                  final isSelected = _selectedStatus == st;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(st),
                      selected: isSelected,
                      selectedColor: kAccent,
                      backgroundColor: const Color(0xFF0F2B48),
                      labelStyle: TextStyle(
                        color: isSelected ? const Color(0xFF07162C) : Colors.white,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        fontSize: 12,
                      ),
                      onSelected: (val) {
                        if (val) setState(() => _selectedStatus = st);
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
          ),

          // Content List
          Expanded(
            child: FutureBuilder<List<AidRequestModel>>(
              future: _requestsFuture,
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
                          Text('Failed to load aid applications: ${snapshot.error}', textAlign: TextAlign.center, style: const TextStyle(color: kTextSecondary)),
                          const SizedBox(height: 14),
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0F2B48)),
                            onPressed: _loadRequests,
                            child: const Text('Try Again', style: TextStyle(color: Colors.white)),
                          ),
                        ],
                      ),
                    ),
                  );
                }

                final all = snapshot.data ?? [];
                final filtered = all.where((r) {
                  if (_selectedStatus == 'All') return true;
                  return r.status.toLowerCase() == _selectedStatus.toLowerCase();
                }).toList();

                if (filtered.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.assignment_outlined, size: 50, color: Colors.grey[400]),
                        const SizedBox(height: 10),
                        Text(
                          _selectedStatus == 'All'
                              ? 'No aid applications submitted yet.'
                              : 'No applications found with status $_selectedStatus.',
                          style: const TextStyle(color: kTextSecondary, fontSize: 14),
                        ),
                      ],
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async => _loadRequests(),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: filtered.length,
                    itemBuilder: (context, index) {
                      final r = filtered[index];
                      final statusColor = _getStatusColor(r.status);
                      final urgencyColor = _getUrgencyColor(r.urgency);

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
                                      color: const Color(0xFF0F2B48).withValues(alpha: 0.08),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: const Icon(Icons.handshake_outlined, color: Color(0xFF0F2B48), size: 24),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          '${r.aidType} Aid',
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: kTextPrimary),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          'Applicant: ${r.victimName}  •  ${r.familySize} Family Member(s)',
                                          style: const TextStyle(color: kTextSecondary, fontSize: 12),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: statusColor.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(color: statusColor.withValues(alpha: 0.4)),
                                    ),
                                    child: Text(
                                      r.status.toUpperCase(),
                                      style: TextStyle(
                                        color: statusColor,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 11,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              const Divider(height: 1),
                              const SizedBox(height: 10),

                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: urgencyColor.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      '${r.urgency} Urgency',
                                      style: TextStyle(color: urgencyColor, fontSize: 11, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    '📍 ${r.district} District',
                                    style: const TextStyle(fontSize: 12, color: kTextSecondary),
                                  ),
                                ],
                              ),

                              if (r.shelterName != null && r.shelterName!.isNotEmpty) ...[
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    const Icon(Icons.night_shelter_outlined, size: 14, color: kAccent),
                                    const SizedBox(width: 4),
                                    Text(
                                      'Assigned Shelter: ${r.shelterName}',
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF0F2B48)),
                                    ),
                                  ],
                                ),
                              ],

                              if (r.notes.isNotEmpty) ...[
                                const SizedBox(height: 8),
                                Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF8FAFC),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    r.notes,
                                    style: const TextStyle(fontSize: 12, color: kTextSecondary, fontStyle: FontStyle.italic),
                                  ),
                                ),
                              ],
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
