import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../shared/auth/auth_provider.dart';
import '../../../shared/theme/aegis_theme.dart';
import '../models/recovery_models.dart';
import '../services/recovery_service.dart';

class DonateScreen extends StatefulWidget {
  final bool showAppBar;
  const DonateScreen({super.key, this.showAppBar = true});

  @override
  State<DonateScreen> createState() => _DonateScreenState();
}

class _DonateScreenState extends State<DonateScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _formKey = GlobalKey<FormState>();
  final RecoveryService _service = RecoveryService();

  final _donorNameController = TextEditingController();
  final _donorContactController = TextEditingController();
  String _donationType = 'Monetary';
  final _amountController = TextEditingController();
  final _descriptionController = TextEditingController();
  String? _selectedShelterId;
  List<ShelterModel> _shelters = [];
  bool _submitting = false;
  bool _initializedUser = false;

  late Future<List<DonationModel>> _donationsFuture;

  final List<double> _presetAmounts = [2500, 5000, 10000, 25000, 50000, 100000];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadShelters();
    _loadDonations();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initializedUser) {
      _initializedUser = true;
      final auth = Provider.of<AuthProvider>(context, listen: false);
      if (auth.user != null) {
        if (_donorNameController.text.isEmpty) {
          _donorNameController.text = auth.user!.fullName;
        }
        if (_donorContactController.text.isEmpty && auth.user!.phoneNumber != null) {
          _donorContactController.text = auth.user!.phoneNumber!;
        }
      }
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _donorNameController.dispose();
    _donorContactController.dispose();
    _amountController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _loadShelters() async {
    try {
      final s = await _service.fetchShelters();
      if (mounted) setState(() => _shelters = s);
    } catch (_) {}
  }

  void _loadDonations() {
    setState(() {
      _donationsFuture = _service.fetchDonations();
    });
  }

  void _resetForm() {
    _amountController.clear();
    _descriptionController.clear();
    _selectedShelterId = null;
    setState(() {});
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    _formKey.currentState!.save();

    final amountVal = double.tryParse(_amountController.text.trim()) ?? 0;
    if (amountVal <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a positive donation amount or quantity'), backgroundColor: kDanger),
      );
      return;
    }

    setState(() => _submitting = true);

    try {
      final success = await _service.submitDonation(
        donorName: _donorNameController.text.trim(),
        donorContact: _donorContactController.text.trim(),
        donationType: _donationType,
        amountOrQuantity: amountVal,
        itemDescription: _descriptionController.text.trim().isEmpty
            ? 'General Emergency Disaster Relief'
            : _descriptionController.text.trim(),
        targetShelterId: _selectedShelterId,
      );

      if (mounted && success) {
        _resetForm();
        _loadDonations();
        _tabController.animateTo(1); // Switch to ledger tab
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            backgroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            title: const Row(
              children: [
                Icon(Icons.volunteer_activism, color: kSuccess, size: 24),
                SizedBox(width: 8),
                Text('Donation Recorded!',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17, color: kTextPrimary)),
              ],
            ),
            content: Text(
              'Your generous relief contribution of ${_donationType == "Monetary" ? "LKR ${amountVal.toStringAsFixed(0)}" : "${amountVal.toStringAsFixed(0)} units"} has been logged into the national relief transparency ledger.',
              style: const TextStyle(fontSize: 13, color: kTextSecondary),
            ),
            actions: [
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2563EB),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: () => Navigator.pop(ctx),
                child: const Text('View Ledger', style: TextStyle(color: Colors.white)),
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
    return Scaffold(
      backgroundColor: kSurface,
      appBar: widget.showAppBar
          ? AppBar(
              backgroundColor: kNavBg,
              iconTheme: const IconThemeData(color: Colors.white),
              title: const Text('Disaster Relief Donations',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              bottom: TabBar(
                controller: _tabController,
                indicatorColor: kAccent,
                labelColor: Colors.white,
                unselectedLabelColor: const Color(0xFF94A3B8),
                tabs: const [
                  Tab(icon: Icon(Icons.volunteer_activism), text: 'Make a Donation'),
                  Tab(icon: Icon(Icons.receipt_long), text: 'Transparency Ledger'),
                ],
              ),
            )
          : null,
      body: TabBarView(
        controller: _tabController,
        children: [
          // ── TAB 1: CLEAN DONATION FORM ──
          SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Donor Info Card
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
                        const Text('Donor Information',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: kTextPrimary)),
                        const SizedBox(height: 2),
                        const Text('Individual or organization contributor details',
                            style: TextStyle(fontSize: 11, color: kTextSecondary)),
                        const Divider(height: 20, color: kBorder),
                        TextFormField(
                          controller: _donorNameController,
                          decoration: const InputDecoration(labelText: 'Donor / Organization Name *', border: OutlineInputBorder()),
                          validator: (v) => v?.trim().isEmpty == true ? 'Donor name required' : null,
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _donorContactController,
                          decoration: const InputDecoration(labelText: 'Contact Phone / Email', border: OutlineInputBorder()),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Donation Details Card
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
                        const Text('Donation Contribution',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: kTextPrimary)),
                        const SizedBox(height: 2),
                        const Text('Select monetary funds or relief supplies in-kind',
                            style: TextStyle(fontSize: 11, color: kTextSecondary)),
                        const Divider(height: 20, color: kBorder),
                        Row(
                          children: [
                            Expanded(
                              child: ChoiceChip(
                                label: const Center(child: Text('Monetary Aid (LKR)')),
                                selected: _donationType == 'Monetary',
                                selectedColor: const Color(0xFF2563EB),
                                labelStyle: TextStyle(
                                  color: _donationType == 'Monetary' ? Colors.white : kTextPrimary,
                                  fontWeight: FontWeight.bold,
                                ),
                                onSelected: (val) {
                                  if (val) setState(() => _donationType = 'Monetary');
                                },
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: ChoiceChip(
                                label: const Center(child: Text('Relief Supplies (Items)')),
                                selected: _donationType != 'Monetary',
                                selectedColor: const Color(0xFF2563EB),
                                labelStyle: TextStyle(
                                  color: _donationType != 'Monetary' ? Colors.white : kTextPrimary,
                                  fontWeight: FontWeight.bold,
                                ),
                                onSelected: (val) {
                                  if (val) setState(() => _donationType = 'Supplies');
                                },
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),

                        if (_donationType == 'Monetary') ...[
                          const Text('Quick Select Amount:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: kTextPrimary)),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: _presetAmounts.map((amt) {
                              final isSelected = _amountController.text == amt.toStringAsFixed(0);
                              return ActionChip(
                                label: Text('Rs. ${amt.toStringAsFixed(0)}'),
                                backgroundColor: isSelected ? const Color(0xFF2563EB) : const Color(0xFFF1F5F9),
                                labelStyle: TextStyle(
                                  color: isSelected ? Colors.white : kTextPrimary,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                                onPressed: () {
                                  setState(() => _amountController.text = amt.toStringAsFixed(0));
                                },
                              );
                            }).toList(),
                          ),
                          const SizedBox(height: 12),
                        ],

                        TextFormField(
                          controller: _amountController,
                          decoration: InputDecoration(
                            labelText: _donationType == 'Monetary' ? 'Contribution Amount (LKR) *' : 'Quantity of Items *',
                            border: const OutlineInputBorder(),
                            prefixIcon: Icon(_donationType == 'Monetary' ? Icons.payments_outlined : Icons.inventory_2_outlined, color: const Color(0xFF2563EB)),
                          ),
                          keyboardType: TextInputType.number,
                          validator: (v) => (double.tryParse(v ?? '') ?? 0) <= 0 ? 'Enter a valid amount' : null,
                        ),
                        const SizedBox(height: 12),

                        TextFormField(
                          controller: _descriptionController,
                          decoration: const InputDecoration(
                            labelText: 'Item Description / Purpose',
                            hintText: 'e.g. Drinking water bottles, blankets, infant formula',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 12),

                        DropdownButtonFormField<String>(
                          initialValue: _selectedShelterId,
                          decoration: const InputDecoration(labelText: 'Target Evacuation Center (Optional)', border: OutlineInputBorder()),
                          items: [
                            const DropdownMenuItem(value: null, child: Text('General Community Relief (Unallocated)')),
                            ..._shelters.map((s) => DropdownMenuItem(value: s.id, child: Text('${s.name} (${s.district})'))),
                          ],
                          onChanged: (v) => setState(() => _selectedShelterId = v),
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
                    onPressed: _submitting ? null : _submit,
                    child: _submitting
                        ? const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)),
                              SizedBox(width: 10),
                              Text('Recording Donation...', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                            ],
                          )
                        : const Text('Record Donation Contribution',
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                  ),
                  const SizedBox(height: 30),
                ],
              ),
            ),
          ),

          // ── TAB 2: TRANSPARENCY LEDGER ──
          FutureBuilder<List<DonationModel>>(
            future: _donationsFuture,
            builder: (ctx, snap) {
              if (snap.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              final list = snap.data ?? [];
              if (list.isEmpty) {
                return Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.receipt_long, size: 56, color: Colors.grey[400]),
                        const SizedBox(height: 12),
                        const Text('No public donations recorded yet.', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: kTextPrimary)),
                        const SizedBox(height: 6),
                        const Text('Contribute monetary funds or relief packs to appear in the transparent ledger.', style: TextStyle(color: kTextSecondary, fontSize: 13)),
                      ],
                    ),
                  ),
                );
              }

              return RefreshIndicator(
                onRefresh: () async => _loadDonations(),
                child: ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: list.length,
                  itemBuilder: (ctx, i) {
                    final d = list[i];
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
                                Text(d.donorName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: kTextPrimary)),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: d.allocationStatus == 'Allocated' || d.allocationStatus == 'Distributed'
                                        ? const Color(0xFFDCFCE7)
                                        : const Color(0xFFFEF3C7),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    d.allocationStatus,
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: d.allocationStatus == 'Allocated' || d.allocationStatus == 'Distributed'
                                          ? const Color(0xFF16A34A)
                                          : const Color(0xFFB45309),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              d.donationType == 'Monetary'
                                  ? 'LKR ${d.amountOrQuantity.toStringAsFixed(0)}'
                                  : '${d.amountOrQuantity.toStringAsFixed(0)} units (${d.itemDescription})',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF2563EB)),
                            ),
                            if (d.targetShelterName != null) ...[
                              const SizedBox(height: 4),
                              Text('Allocated to: ${d.targetShelterName}', style: const TextStyle(fontSize: 12, color: kTextSecondary)),
                            ],
                            const SizedBox(height: 4),
                            Text('Logged: ${d.createdAt.length >= 10 ? d.createdAt.substring(0, 10) : d.createdAt}',
                                style: const TextStyle(fontSize: 11, color: kTextMuted)),
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
