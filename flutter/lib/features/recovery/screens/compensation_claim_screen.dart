import 'package:flutter/material.dart';
import '../../../shared/theme/aegis_theme.dart';
import '../models/recovery_models.dart';
import '../services/recovery_service.dart';

class CompensationClaimScreen extends StatefulWidget {
  final bool showAppBar;
  const CompensationClaimScreen({super.key, this.showAppBar = true});

  @override
  State<CompensationClaimScreen> createState() => _CompensationClaimScreenState();
}

class _CompensationClaimScreenState extends State<CompensationClaimScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _formKey = GlobalKey<FormState>();
  final RecoveryService _service = RecoveryService();

  String _applicantName = 'Sunil Shantha';
  String _applicantNIC = '198512345678';
  String _contactPhone = '+94 77 456 7890';
  String _district = 'Kalutara';
  String _damageCategory = 'Major Structural Damage';
  final _claimAmountController = TextEditingController(text: '450000');
  final _bankDetailsController = TextEditingController(text: 'Bank of Ceylon - Kalutara Branch, A/C: 00123456789');
  final _descriptionController = TextEditingController(text: 'Flood waters entered house causing foundation subsidence and collapse of rear kitchen wall.');

  bool _submitting = false;
  late Future<List<CompensationModel>> _claimsFuture;

  final List<String> _districts = [
    'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle',
    'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle',
    'Kilinochchi', 'Kurunegala', 'Mannar', 'Matale', 'Matara', 'Monaragala',
    'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura',
    'Trincomalee', 'Vavuniya'
  ];

  final List<String> _damageCategories = [
    'Total House Collapse',
    'Major Structural Damage',
    'Minor Roof / Wall Repair',
    'Agricultural / Crop Loss',
    'Small Business / Livelihood Loss',
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadClaims();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _claimAmountController.dispose();
    _bankDetailsController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  void _loadClaims() {
    setState(() {
      _claimsFuture = _service.fetchCompensations();
    });
  }

  Future<void> _submitClaim() async {
    if (!_formKey.currentState!.validate()) return;
    _formKey.currentState!.save();

    final claimAmt = double.tryParse(_claimAmountController.text.trim()) ?? 0;
    if (claimAmt <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid claim amount in LKR'), backgroundColor: kDanger),
      );
      return;
    }

    setState(() => _submitting = true);

    try {
      final claim = await _service.submitCompensationClaim(
        applicantName: _applicantName.trim(),
        applicantNIC: _applicantNIC.trim(),
        contactPhone: _contactPhone.trim(),
        district: _district,
        damageCategory: _damageCategory,
        claimAmount: claimAmt,
        bankDetails: _bankDetailsController.text.trim(),
        description: _descriptionController.text.trim(),
      );

      if (mounted) {
        _loadClaims();
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            backgroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            title: Row(
              children: const [
                Icon(Icons.check_circle, color: kSuccess, size: 24),
                SizedBox(width: 8),
                Text('Claim Registered!', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17, color: kTextPrimary)),
              ],
            ),
            content: Text(
              'Your disaster housing compensation claim (#${claim.id}) for LKR ${claimAmt.toStringAsFixed(0)} has been queued for verification by the Divisional Secretariat and DMC.',
              style: const TextStyle(fontSize: 13, color: kTextSecondary),
            ),
            actions: [
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0F2B48),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: () {
                  Navigator.pop(ctx);
                  _tabController.animateTo(1);
                },
                child: const Text('View Claims', style: TextStyle(color: Colors.white)),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Claim submission failed: $e'), backgroundColor: kDanger),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'disbursed':
        return kSuccess;
      case 'underreview':
      case 'under review':
      case 'pending':
        return kWarning;
      case 'rejected':
        return kDanger;
      default:
        return const Color(0xFF2563EB);
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
              title: const Text('Housing Compensation Claims', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              bottom: TabBar(
                controller: _tabController,
                indicatorColor: kAccent,
                labelColor: Colors.white,
                unselectedLabelColor: const Color(0xFF94A3B8),
                tabs: const [
                  Tab(icon: Icon(Icons.note_add_outlined, size: 18), text: 'File Claim'),
                  Tab(icon: Icon(Icons.history_outlined, size: 18), text: 'Claims Ledger'),
                ],
              ),
            )
          : null,
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildFileClaimTab(),
          _buildClaimsLedgerTab(),
        ],
      ),
    );
  }

  Widget _buildFileClaimTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Banner
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF831843), Color(0xFF9D174D)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.home_work_outlined, color: Colors.white, size: 28),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text(
                          'National Property Relief Scheme',
                          style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        SizedBox(height: 3),
                        Text(
                          'Government & humanitarian grant allocation for damaged residential properties.',
                          style: TextStyle(color: Color(0xFFFBCFE8), fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Applicant Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Applicant Identification', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: kTextPrimary)),
                    const Divider(height: 20),
                    TextFormField(
                      initialValue: _applicantName,
                      decoration: const InputDecoration(labelText: 'Applicant Full Name', border: OutlineInputBorder(), isDense: true),
                      validator: (val) => val == null || val.trim().isEmpty ? 'Required' : null,
                      onSaved: (val) => _applicantName = val ?? '',
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            initialValue: _applicantNIC,
                            decoration: const InputDecoration(labelText: 'National Identity Card (NIC)', border: OutlineInputBorder(), isDense: true),
                            validator: (val) => val == null || val.trim().isEmpty ? 'Required' : null,
                            onSaved: (val) => _applicantNIC = val ?? '',
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextFormField(
                            initialValue: _contactPhone,
                            decoration: const InputDecoration(labelText: 'Contact Phone', border: OutlineInputBorder(), isDense: true),
                            keyboardType: TextInputType.phone,
                            validator: (val) => val == null || val.trim().isEmpty ? 'Required' : null,
                            onSaved: (val) => _contactPhone = val ?? '',
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      value: _district,
                      decoration: const InputDecoration(labelText: 'District of Damaged Property', border: OutlineInputBorder(), isDense: true),
                      items: _districts.map((d) => DropdownMenuItem(value: d, child: Text(d))).toList(),
                      onChanged: (val) => setState(() => _district = val ?? 'Kalutara'),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Claim Details Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Damage Category & Bank Transfer', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: kTextPrimary)),
                    const Divider(height: 20),
                    DropdownButtonFormField<String>(
                      value: _damageCategory,
                      decoration: const InputDecoration(labelText: 'Damage Assessment Category', border: OutlineInputBorder(), isDense: true),
                      items: _damageCategories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                      onChanged: (val) => setState(() => _damageCategory = val ?? _damageCategories.first),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _claimAmountController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Claim Compensation Amount (LKR)',
                        border: OutlineInputBorder(),
                        isDense: true,
                        prefixText: 'LKR ',
                      ),
                      validator: (val) => (double.tryParse(val ?? '') ?? 0) <= 0 ? 'Enter valid amount' : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _bankDetailsController,
                      decoration: const InputDecoration(
                        labelText: 'Bank Name, Branch & Account Number',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                      validator: (val) => val == null || val.trim().isEmpty ? 'Bank details required for direct transfer' : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _descriptionController,
                      maxLines: 2,
                      decoration: const InputDecoration(
                        labelText: 'Specific Damage Description & Evidence Notes',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton.icon(
                onPressed: _submitting ? null : _submitClaim,
                icon: _submitting
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.send, color: Colors.white),
                label: Text(
                  _submitting ? 'Submitting Claim...' : 'Submit Compensation Claim',
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF9D174D),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildClaimsLedgerTab() {
    return FutureBuilder<List<CompensationModel>>(
      future: _claimsFuture,
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
                  Text('Failed to load compensation records: ${snapshot.error}', textAlign: TextAlign.center, style: const TextStyle(color: kTextSecondary)),
                  const SizedBox(height: 14),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0F2B48)),
                    onPressed: _loadClaims,
                    child: const Text('Reload', style: TextStyle(color: Colors.white)),
                  ),
                ],
              ),
            ),
          );
        }

        final claims = snapshot.data ?? [];
        if (claims.isEmpty) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.home_repair_service_outlined, size: 50, color: Colors.grey[400]),
                const SizedBox(height: 10),
                const Text('No compensation claims filed yet.', style: TextStyle(color: kTextSecondary, fontSize: 14)),
              ],
            ),
          );
        }

        final totalClaimed = claims.fold<double>(0, (sum, c) => sum + c.claimAmount);

        return RefreshIndicator(
          onRefresh: () async => _loadClaims(),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F2B48),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Total Housing Claims Filed', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                        const SizedBox(height: 4),
                        Text('LKR ${totalClaimed.toStringAsFixed(0)}', style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    Text('${claims.length} Claims', style: const TextStyle(color: kAccent, fontWeight: FontWeight.w600, fontSize: 13)),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              ...claims.map((c) {
                final statusColor = _getStatusColor(c.status);
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: const Color(0xFF9D174D).withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Icon(Icons.roofing_outlined, color: Color(0xFF9D174D), size: 22),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(c.applicantName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: kTextPrimary)),
                                  const SizedBox(height: 2),
                                  Text('NIC: ${c.applicantNIC}  •  📍 ${c.district}', style: const TextStyle(color: kTextSecondary, fontSize: 12)),
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
                                c.status.toUpperCase(),
                                style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 11),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Category: ${c.damageCategory}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12, color: kTextPrimary)),
                              const SizedBox(height: 2),
                              Text('Claim Amount: LKR ${c.claimAmount.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF047857), fontSize: 13)),
                              if (c.bankDetails.isNotEmpty)
                                Text('Bank Account: ${c.bankDetails}', style: const TextStyle(fontSize: 11, color: kTextSecondary)),
                            ],
                          ),
                        ),
                        if (c.description.isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Text(c.description, style: const TextStyle(fontSize: 11, color: kTextMuted, fontStyle: FontStyle.italic)),
                        ],
                      ],
                    ),
                  ),
                );
              }),
            ],
          ),
        );
      },
    );
  }
}
