import 'package:flutter/material.dart';
import '../../../shared/theme/aegis_theme.dart';
import '../models/recovery_models.dart';
import '../services/recovery_service.dart';

class RecoveryReportsScreen extends StatefulWidget {
  final bool showAppBar;
  const RecoveryReportsScreen({super.key, this.showAppBar = true});

  @override
  State<RecoveryReportsScreen> createState() => _RecoveryReportsScreenState();
}

class _RecoveryReportsScreenState extends State<RecoveryReportsScreen> {
  final RecoveryService _service = RecoveryService();
  late Future<List<RecoveryReportModel>> _reportsFuture;
  String _selectedDistrict = 'All';

  final List<String> _districts = [
    'All', 'Kalutara', 'Ratnapura', 'Matara', 'Colombo', 'Galle', 'Kegalle', 'Badulla'
  ];

  @override
  void initState() {
    super.initState();
    _loadReports();
  }

  void _loadReports() {
    setState(() {
      _reportsFuture = _service.fetchReports();
    });
  }

  void _showReportDetails(RecoveryReportModel report) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        maxChildSize: 0.95,
        minChildSize: 0.5,
        expand: false,
        builder: (_, scrollController) => ListView(
          controller: scrollController,
          padding: const EdgeInsets.all(20),
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(2)),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    report.title,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: kTextPrimary),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: kSuccess.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    report.status,
                    style: const TextStyle(color: kSuccess, fontWeight: FontWeight.bold, fontSize: 11),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              '${report.district} District  •  ${report.disasterType}  •  ${report.generatedAt}',
              style: const TextStyle(color: kTextSecondary, fontSize: 12),
            ),
            const Divider(height: 24),

            const Text('Executive Financial Summary', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: kTextPrimary)),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: _buildMetricTile(
                    label: 'Estimated Loss',
                    value: 'LKR ${report.totalEstimatedLoss.toStringAsFixed(0)}',
                    color: const Color(0xFFDC2626),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _buildMetricTile(
                    label: 'Funds Disbursed',
                    value: 'LKR ${report.fundsDisbursed.toStringAsFixed(0)}',
                    color: const Color(0xFF047857),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: _buildMetricTile(
                    label: 'People Assisted',
                    value: '${report.peopleAssisted} persons',
                    color: const Color(0xFF2563EB),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _buildMetricTile(
                    label: 'Operational Shelters',
                    value: '${report.sheltersOperational} centers',
                    color: const Color(0xFF7C3AED),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            const Text('Relief Audit & Findings', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: kTextPrimary)),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: kBorder),
              ),
              child: Text(
                report.summaryNotes.isNotEmpty
                    ? report.summaryNotes
                    : 'Relief distribution and rebuilding works verified according to standard disaster recovery guidelines.',
                style: const TextStyle(fontSize: 13, color: kTextPrimary, height: 1.4),
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0F2B48),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Close Audit Report', style: TextStyle(color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricTile({required String label, required String value, required Color color}) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text(value, style: TextStyle(color: color, fontSize: 14, fontWeight: FontWeight.bold)),
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
              title: const Text('Recovery & Audit Reports', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            )
          : null,
      body: FutureBuilder<List<RecoveryReportModel>>(
        future: _reportsFuture,
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
                    Text('Failed to load recovery reports: ${snapshot.error}', textAlign: TextAlign.center, style: const TextStyle(color: kTextSecondary)),
                    const SizedBox(height: 14),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0F2B48)),
                      onPressed: _loadReports,
                      child: const Text('Reload', style: TextStyle(color: Colors.white)),
                    ),
                  ],
                ),
              ),
            );
          }

          final allReports = snapshot.data ?? [];
          final filtered = allReports.where((r) {
            if (_selectedDistrict == 'All') return true;
            return r.district.toLowerCase() == _selectedDistrict.toLowerCase();
          }).toList();

          final totalLoss = allReports.fold<double>(0.0, (sum, r) => sum + r.totalEstimatedLoss);
          final totalDisbursed = allReports.fold<double>(0.0, (sum, r) => sum + r.fundsDisbursed);
          final totalAssisted = allReports.fold<int>(0, (sum, r) => sum + r.peopleAssisted);

          return RefreshIndicator(
            onRefresh: () async => _loadReports(),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Top KPI Summary Card
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F2B48),
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 6, offset: Offset(0, 2))],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('National Recovery Summary', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: kAccent.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Text('Live DMC Audit', style: TextStyle(color: kAccent, fontSize: 10, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Total Loss Assessed', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                                const SizedBox(height: 2),
                                Text('LKR ${totalLoss.toStringAsFixed(0)}', style: const TextStyle(color: Color(0xFFFCA5A5), fontWeight: FontWeight.bold, fontSize: 15)),
                              ],
                            ),
                          ),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Relief Disbursed', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                                const SizedBox(height: 2),
                                Text('LKR ${totalDisbursed.toStringAsFixed(0)}', style: const TextStyle(color: Color(0xFF6EE7B7), fontWeight: FontWeight.bold, fontSize: 15)),
                              ],
                            ),
                          ),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Beneficiaries', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                                const SizedBox(height: 2),
                                Text('$totalAssisted', style: const TextStyle(color: Color(0xFF93C5FD), fontWeight: FontWeight.bold, fontSize: 15)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Filter Row
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: _districts.map((d) {
                      final isSel = _selectedDistrict == d;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(d == 'All' ? 'All Districts' : '$d District'),
                          selected: isSel,
                          selectedColor: const Color(0xFF0F2B48),
                          backgroundColor: Colors.white,
                          labelStyle: TextStyle(
                            color: isSel ? Colors.white : kTextPrimary,
                            fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                            fontSize: 12,
                          ),
                          onSelected: (val) {
                            if (val) setState(() => _selectedDistrict = d);
                          },
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 16),

                if (filtered.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 40),
                    child: Center(
                      child: Column(
                        children: [
                          Icon(Icons.assessment_outlined, size: 48, color: Colors.grey[400]),
                          const SizedBox(height: 8),
                          const Text('No audit reports found for this filter.', style: TextStyle(color: kTextSecondary)),
                        ],
                      ),
                    ),
                  )
                else
                  ...filtered.map((r) {
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: ListTile(
                        contentPadding: const EdgeInsets.all(16),
                        leading: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: const Color(0xFF0F2B48).withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.analytics_outlined, color: Color(0xFF0F2B48), size: 24),
                        ),
                        title: Text(r.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: kTextPrimary)),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: 4),
                            Text('📍 ${r.district} District  •  ${r.disasterType}', style: const TextStyle(color: kTextSecondary, fontSize: 12)),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                Text('Disbursed: LKR ${r.fundsDisbursed.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF047857), fontSize: 12)),
                                const SizedBox(width: 8),
                                Text('•  ${r.peopleAssisted} assisted', style: const TextStyle(color: kTextMuted, fontSize: 11)),
                              ],
                            ),
                          ],
                        ),
                        trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: kTextMuted),
                        onTap: () => _showReportDetails(r),
                      ),
                    );
                  }),
              ],
            ),
          );
        },
      ),
    );
  }
}
