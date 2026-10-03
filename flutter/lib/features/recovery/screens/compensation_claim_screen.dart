import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../shared/auth/auth_provider.dart';
import '../../../shared/theme/aegis_theme.dart';
import '../models/recovery_models.dart';
import '../services/recovery_service.dart';

class CompensationClaimScreen extends StatefulWidget {
  final bool showAppBar;
  const CompensationClaimScreen({super.key, this.showAppBar = true});

  @override
  State<CompensationClaimScreen> createState() => _CompensationClaimScreenState();
}

class _CompensationClaimScreenState extends State<CompensationClaimScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _formKey = GlobalKey<FormState>();
  final RecoveryService _service = RecoveryService();

  final _applicantNameController = TextEditingController();
  final _applicantNICController = TextEditingController();
  final _contactPhoneController = TextEditingController();
  String _district = 'Kalutara';
  String _damageCategory = 'Major Structural Damage';
  final _claimAmountController = TextEditingController();
  final _bankDetailsController = TextEditingController();
  final _descriptionController = TextEditingController();

  bool _submitting = false;
  bool _initializedUser = false;
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
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initializedUser) {
      _initializedUser = true;
      final auth = Provider.of<AuthProvider>(context, listen: false);
      if (auth.user != null) {
        if (_applicantNameController.text.isEmpty) {
          _applicantNameController.text = auth.user!.fullName;
        }
        if (_contactPhoneController.text.isEmpty && auth.user!.phoneNumber != null) {
          _contactPhoneController.text = auth.user!.phoneNumber!;
        }
        if (auth.user!.district != null && _districts.contains(auth.user!.district)) {
          _district = auth.user!.district!;
        }
      }
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _applicantNameController.dispose();
    _applicantNICController.dispose();
    _contactPhoneController.dispose();
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

  void _resetForm() {
    _applicantNICController.clear();
    _claimAmountController.clear();
    _bankDetailsController.clear();
    _descriptionController.clear();
    setState(() {});
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
      await _service.submitCompensationClaim(
        applicantName: _applicantNameController.text.trim(),
        applicantNIC: _applicantNICController.text.trim(),
        contactPhone: _contactPhoneController.text.trim(),
        district: _district,
        damageCategory: _damageCategory,
        claimAmount: claimAmt,
        bankDetails: _bankDetailsController.text.trim(),
        description: _descriptionController.text.trim(),
      );

      if (mounted) {
        _resetForm();
        _loadClaims();
        _tabController.animateTo(1);
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            backgroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            title: const Row(
              children: [
                Icon(Icons.check_circle, color: kSuccess, size: 24),
                SizedBox(width: 8),
                Text('Claim Filed!', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17, color: kTextPrimary)),
              ],
            ),
            content: Text(
              'Your property damage compensation claim of LKR ${claimAmt.toStringAsFixed(0)} has been registered. An official field verification officer will review your documents.',
              style: const TextStyle(fontSize: 13, color: kTextSecondary),
            ),
            actions: [
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2563EB)),
                onPressed: () => Navigator.pop(ctx),
                child: const Text('View Claims Ledger', style: TextStyle(color: Colors.white)),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Submission failed: $e'), backgroundColor: kDanger),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
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
              title: const Text('Property Damage Compensation',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              bottom: TabBar(
                controller: _tabController,
                indicatorColor: kAccent,
                labelColor: Colors.white,
                unselectedLabelColor: const Color(0xFF94A3B8),
                tabs: [
                  const Tab(icon: Icon(Icons.note_add), text: 'File Claim'),
                  Tab(icon: const Icon(Icons.history_edu), text: isOfficer ? 'All Claims' : 'My Claims'),
                ],
              ),
            )
          : null,
      body: TabBarView(
        controller: _tabController,
        children: [
          // ── TAB 1: FILE CLAIM FORM ──
          SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Applicant Info Card
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: kBorder),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Claimant Identification',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: kTextPrimary)),
                        const SizedBox(height: 2),
                        const Text('Official legal name and NIC for fund disbursement',
                            style: TextStyle(fontSize: 11, color: kTextSecondary)),
                        const Divider(height: 20, color: kBorder),
                        TextFormField(
                          controller: _applicantNameController,
                          decoration: const InputDecoration(labelText: 'Applicant Full Name *', border: OutlineInputBorder()),
                          validator: (v) => v?.trim().isEmpty == true ? 'Applicant name required' : null,
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                controller: _applicantNICController,
                                decoration: const InputDecoration(labelText: 'National Identity Card (NIC) *', border: OutlineInputBorder()),
                                validator: (v) => v?.trim().isEmpty == true ? 'NIC required' : null,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: TextFormField(
                                controller: _contactPhoneController,
                                decoration: const InputDecoration(labelText: 'Phone Number *', border: OutlineInputBorder()),
                                keyboardType: TextInputType.phone,
                                validator: (v) => (v?.trim().length ?? 0) < 9 ? 'Valid phone required' : null,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        DropdownButtonFormField<String>(
                          initialValue: _district,
                          decoration: const InputDecoration(labelText: 'Disaster Affected District *', border: OutlineInputBorder()),
                          items: _districts.map((d) => DropdownMenuItem(value: d, child: Text(d))).toList(),
                          onChanged: (v) => setState(() => _district = v!),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Claim Assessment Card
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: kBorder),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Damage Assessment & Banking',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: kTextPrimary)),
                        const SizedBox(height: 2),
                        const Text('Category, amount claimed, and verified account details',
                            style: TextStyle(fontSize: 11, color: kTextSecondary)),
                        const Divider(height: 20, color: kBorder),
                        DropdownButtonFormField<String>(
                          initialValue: _damageCategory,
                          decoration: const InputDecoration(labelText: 'Damage Classification *', border: OutlineInputBorder()),
                          items: _damageCategories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                          onChanged: (v) => setState(() => _damageCategory = v!),
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _claimAmountController,
                          decoration: const InputDecoration(
                            labelText: 'Estimated Repair / Replacement Claim (LKR) *',
                            border: OutlineInputBorder(),
                            prefixIcon: Icon(Icons.payments_outlined, color: Color(0xFF2563EB)),
                          ),
                          keyboardType: TextInputType.number,
                          validator: (v) => (double.tryParse(v ?? '') ?? 0) <= 0 ? 'Enter valid claim amount' : null,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _bankDetailsController,
                          decoration: const InputDecoration(
                            labelText: 'Disbursement Bank, Branch & Account No. *',
                            hintText: 'e.g. Bank of Ceylon, Kalutara Branch, A/C: 0012345678',
                            border: OutlineInputBorder(),
                          ),
                          validator: (v) => v?.trim().isEmpty == true ? 'Bank details required' : null,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _descriptionController,
                          maxLines: 3,
                          decoration: const InputDecoration(
                            labelText: 'Damage Narrative & Evidence Details',
                            hintText: 'Describe physical structure loss, flood inundation level, collapse...',
                            border: OutlineInputBorder(),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      elevation: 2,
                    ),
                    onPressed: _submitting ? null : _submitClaim,
                    child: _submitting
                        ? const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)),
                              SizedBox(width: 10),
                              Text('Submitting Claim...', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                            ],
                          )
                        : const Text('File Compensation Claim',
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                  ),
                  const SizedBox(height: 30),
                ],
              ),
            ),
          ),

          // ── TAB 2: CLAIMS LEDGER ──
          FutureBuilder<List<CompensationModel>>(
            future: _claimsFuture,
            builder: (ctx, snap) {
              if (snap.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              final rawList = snap.data ?? [];

              // Privacy filter for citizens
              final list = rawList.where((c) {
                if (isOfficer) return true;
                if (auth.user == null) return false;
                final cName = c.applicantName.trim().toLowerCase();
                final cPhone = c.contactPhone.trim().replaceAll(RegExp(r'[^0-9]'), '');
                if (userName.isNotEmpty && (cName == userName || cName.contains(userName) || userName.contains(cName))) return true;
                if (userPhone.isNotEmpty && cPhone.isNotEmpty && (userPhone.endsWith(cPhone) || cPhone.endsWith(userPhone))) return true;
                return false;
              }).toList();

              if (list.isEmpty) {
                return Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.history_edu, size: 56, color: Colors.grey[400]),
                        const SizedBox(height: 12),
                        Text(
                          isOfficer ? 'No compensation claims registered.' : 'You have no submitted compensation claims.',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: kTextPrimary),
                        ),
                        const SizedBox(height: 6),
                        const Text('Submit your structural damage claim from the File Claim tab.', style: TextStyle(color: kTextSecondary, fontSize: 13)),
                      ],
                    ),
                  ),
                );
              }

              return RefreshIndicator(
                onRefresh: () async => _loadClaims(),
                child: ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: list.length,
                  itemBuilder: (ctx, i) {
                    final c = list[i];
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
                                Text(c.applicantName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: kTextPrimary)),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: c.status == 'Approved'
                                        ? const Color(0xFFDCFCE7)
                                        : c.status == 'Rejected'
                                            ? const Color(0xFFFEE2E2)
                                            : const Color(0xFFFEF3C7),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    c.status,
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: c.status == 'Approved'
                                          ? const Color(0xFF16A34A)
                                          : c.status == 'Rejected'
                                              ? const Color(0xFFDC2626)
                                              : const Color(0xFFB45309),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text('Claimed: LKR ${c.claimAmount.toStringAsFixed(0)} • ${c.damageCategory}',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF2563EB))),
                            const SizedBox(height: 4),
                            Text('District: ${c.district} • NIC: ${c.applicantNIC}', style: const TextStyle(fontSize: 12, color: kTextSecondary)),
                            if (c.verificationNotes != null && c.verificationNotes!.isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Text('Officer Verification: ${c.verificationNotes}', style: const TextStyle(fontSize: 11, color: kTextMuted)),
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
        ],
      ),
    );
  }
}
