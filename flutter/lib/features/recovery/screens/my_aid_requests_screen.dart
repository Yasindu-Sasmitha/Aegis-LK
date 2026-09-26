import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../shared/auth/auth_provider.dart';
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
        return const Color(0xFF16A34A);
      case 'pending':
        return const Color(0xFFB45309);
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
        return const Color(0xFFD97706);
      default:
        return const Color(0xFF16A34A);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final isOfficer = auth.isOfficerOrAdmin;
    final userName = (auth.user?.fullName ?? '').trim().toLowerCase();
    final userPhone = (auth.user?.phoneNumber ?? '').trim().replaceAll(RegExp(r'[^0-9]'), '');

    return Scaffold(
      backgroundColor: kSurface,
      appBar: widget.showAppBar
          ? AppBar(
              backgroundColor: kNavBg,
              iconTheme: const IconThemeData(color: Colors.white),
              title: Text(isOfficer ? 'Citizen Relief Aid Applications' : 'My Aid Applications',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            )
          : null,
      body: Column(
        children: [
          // Filter Row
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: const BoxDecoration(
              color: kNavBg,
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

          // List View
          Expanded(
            child: FutureBuilder<List<AidRequestModel>>(
              future: _requestsFuture,
              builder: (ctx, snap) {
                if (snap.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snap.hasError) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.error_outline, color: kDanger, size: 40),
                          const SizedBox(height: 8),
                          Text('Error loading requests: ${snap.error}', textAlign: TextAlign.center, style: const TextStyle(color: kDanger)),
                          const SizedBox(height: 12),
                          ElevatedButton(onPressed: _loadRequests, child: const Text('Try Again')),
                        ],
                      ),
                    ),
                  );
                }

                final rawList = snap.data ?? [];

                // Filter by citizen ownership (privacy guard)
                final ownedList = rawList.where((r) {
                  if (isOfficer) return true; // Officers see all aid applications
                  if (auth.user == null) return false;
                  final rName = r.victimName.trim().toLowerCase();
                  final rPhone = r.contactPhone.trim().replaceAll(RegExp(r'[^0-9]'), '');
                  if (userName.isNotEmpty && (rName == userName || rName.contains(userName) || userName.contains(rName))) return true;
                  if (userPhone.isNotEmpty && rPhone.isNotEmpty && (userPhone.endsWith(rPhone) || rPhone.endsWith(userPhone))) return true;
                  return false;
                }).toList();

                final filteredList = ownedList.where((r) {
                  if (_selectedStatus == 'All') return true;
                  return r.status.toLowerCase() == _selectedStatus.toLowerCase();
                }).toList();

                if (filteredList.isEmpty) {
                  return Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.inbox_outlined, size: 56, color: Colors.grey[400]),
                          const SizedBox(height: 12),
                          Text(
                            isOfficer ? 'No aid applications match this status.' : 'You have no active relief applications.',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: kTextPrimary),
                          ),
                          const SizedBox(height: 6),
                          const Text('Apply for food, shelter or medical supplies from the Request Aid screen.', style: TextStyle(color: kTextSecondary, fontSize: 13)),
                        ],
                      ),
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: () async => _loadRequests(),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: filteredList.length,
                    itemBuilder: (ctx, i) {
                      final item = filteredList[i];
                      final statusColor = _getStatusColor(item.status);
                      final urgencyColor = _getUrgencyColor(item.urgency);

                      return Card(
                        margin: const EdgeInsets.only(bottom: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: kBorder)),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    item.aidType,
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: kTextPrimary),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: statusColor.withValues(alpha: 0.12),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      item.status,
                                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: statusColor),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text('Applicant: ${item.victimName} • District: ${item.district}', style: const TextStyle(fontSize: 12, color: kTextSecondary)),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(color: urgencyColor.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(4)),
                                    child: Text('${item.urgency} Urgency', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: urgencyColor)),
                                  ),
                                  const SizedBox(width: 8),
                                  Text('Family Size: ${item.familySize}', style: const TextStyle(fontSize: 12, color: kTextSecondary)),
                                ],
                              ),
                              if (item.shelterName != null) ...[
                                const SizedBox(height: 6),
                                Text('Allocated Center: ${item.shelterName}', style: const TextStyle(fontSize: 12, color: Color(0xFF2563EB), fontWeight: FontWeight.w600)),
                              ],
                              if (item.notes.isNotEmpty) ...[
                                const SizedBox(height: 6),
                                Text('Notes: ${item.notes}', style: const TextStyle(fontSize: 11, color: kTextMuted)),
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
