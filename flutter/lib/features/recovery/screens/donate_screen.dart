import 'package:flutter/material.dart';
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

  String _donorName = 'Rotary Club Colombo';
  String _donorContact = '+94 77 987 6543';
  String _donationType = 'Monetary';
  final _amountController = TextEditingController(text: '25000');
  final _descriptionController = TextEditingController(text: 'Drinking water bottles, emergency blankets & infant dry food rations');
  String? _selectedShelterId;
  List<ShelterModel> _shelters = [];
  bool _submitting = false;

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
  void dispose() {
    _tabController.dispose();
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

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    _formKey.currentState!.save();

    final amountVal = double.tryParse(_amountController.text.trim()) ?? 0;
    if (amountVal <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid amount or quantity'), backgroundColor: kDanger),
      );
      return;
    }

    setState(() => _submitting = true);

    try {
      final success = await _service.submitDonation(
        donorName: _donorName.trim(),
        donorContact: _donorContact.trim(),
        donationType: _donationType,
        amountOrQuantity: amountVal,
        itemDescription: _descriptionController.text.trim(),
        targetShelterId: _selectedShelterId,
      );

      if (mounted && success) {
        _loadDonations();
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            backgroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            title: Row(
              children: const [
                Icon(Icons.volunteer_activism, color: kSuccess, size: 24),
                SizedBox(width: 8),
                Text('Thank You!', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17, color: kTextPrimary)),
              ],
            ),
            content: Text(
              'Your generous relief contribution of ${_donationType == "Monetary" ? "LKR " + amountVal.toStringAsFixed(0) : amountVal.toStringAsFixed(0) + " units"} has been logged into the national disaster relief ledger.',
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
                  _tabController.animateTo(1); // Switch to ledger tab
                },
                child: const Text('View Relief Ledger', style: TextStyle(color: Colors.white)),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Donation failed: $e'), backgroundColor: kDanger),
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
              title: const Text('Donate & Relief Support', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              bottom: TabBar(
                controller: _tabController,
                indicatorColor: kAccent,
                labelColor: Colors.white,
                unselectedLabelColor: const Color(0xFF94A3B8),
                tabs: const [
                  Tab(icon: Icon(Icons.favorite_outline, size: 18), text: 'Contribute Aid'),
                  Tab(icon: Icon(Icons.receipt_long_outlined, size: 18), text: 'Donation Ledger'),
                ],
              ),
            )
          : null,
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildDonateFormTab(),
          _buildDonationLedgerTab(),
        ],
      ),
    );
  }

  Widget _buildDonateFormTab() {
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
                  colors: [Color(0xFF065F46), Color(0xFF047857)],
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
                    child: const Icon(Icons.volunteer_activism, color: Colors.white, size: 28),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text(
                          'Community Relief Fund',
                          style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        SizedBox(height: 3),
                        Text(
                          '100% of contributions are audited and directly allocated to emergency shelters & victims.',
                          style: TextStyle(color: Color(0xFFA7F3D0), fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Contribution Type Selector
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Contribution Details', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: kTextPrimary)),
                    const Divider(height: 20),
                    DropdownButtonFormField<String>(
                      value: _donationType,
                      decoration: const InputDecoration(
                        labelText: 'Donation Category',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                      items: ['Monetary', 'Supplies & Ration Packs', 'Medical Equipment', 'Building Materials']
                          .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                          .toList(),
                      onChanged: (val) => setState(() => _donationType = val ?? 'Monetary'),
                    ),
                    const SizedBox(height: 12),

                    if (_donationType == 'Monetary') ...[
                      const Text('Quick Amount Select (LKR)', style: TextStyle(fontSize: 12, color: kTextSecondary, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: _presetAmounts.map((amt) {
                          final isSel = _amountController.text == amt.toStringAsFixed(0);
                          return ChoiceChip(
                            label: Text('Rs. ${amt.toStringAsFixed(0)}'),
                            selected: isSel,
                            selectedColor: const Color(0xFF047857),
                            backgroundColor: const Color(0xFFF1F5F9),
                            labelStyle: TextStyle(
                              color: isSel ? Colors.white : kTextPrimary,
                              fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                              fontSize: 12,
                            ),
                            onSelected: (val) {
                              if (val) setState(() => _amountController.text = amt.toStringAsFixed(0));
                            },
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 12),
                    ],

                    TextFormField(
                      controller: _amountController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(
                        labelText: _donationType == 'Monetary' ? 'Amount (LKR)' : 'Quantity / Number of Packages',
                        border: const OutlineInputBorder(),
                        isDense: true,
                        prefixText: _donationType == 'Monetary' ? 'LKR ' : '',
                      ),
                      validator: (val) => (double.tryParse(val ?? '') ?? 0) <= 0 ? 'Must be greater than 0' : null,
                    ),
                    const SizedBox(height: 12),

                    if (_shelters.isNotEmpty)
                      DropdownButtonFormField<String>(
                        value: _selectedShelterId,
                        decoration: const InputDecoration(
                          labelText: 'Target Emergency Shelter (Optional)',
                          border: OutlineInputBorder(),
                          isDense: true,
                        ),
                        items: [
                          const DropdownMenuItem(value: null, child: Text('General Relief Pool (All Shelters)')),
                          ..._shelters.map((s) => DropdownMenuItem(
                            value: s.id,
                            child: Text('${s.name} (${s.district})'),
                          )),
                        ],
                        onChanged: (val) => setState(() => _selectedShelterId = val),
                      ),
                    const SizedBox(height: 12),

                    TextFormField(
                      controller: _descriptionController,
                      maxLines: 2,
                      decoration: const InputDecoration(
                        labelText: 'Item Description / Note to Disaster Relief Team',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Donor Information Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Donor / Organization Information', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: kTextPrimary)),
                    const Divider(height: 20),
                    TextFormField(
                      initialValue: _donorName,
                      decoration: const InputDecoration(
                        labelText: 'Donor Name / Organization Name',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                      validator: (val) => val == null || val.trim().isEmpty ? 'Required' : null,
                      onSaved: (val) => _donorName = val ?? '',
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      initialValue: _donorContact,
                      decoration: const InputDecoration(
                        labelText: 'Contact Phone or Email (Private receipt)',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                      onSaved: (val) => _donorContact = val ?? '',
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
                onPressed: _submitting ? null : _submit,
                icon: _submitting
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.volunteer_activism, color: Colors.white),
                label: Text(
                  _submitting ? 'Recording Donation...' : 'Submit Donation Contribution',
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF047857),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDonationLedgerTab() {
    return FutureBuilder<List<DonationModel>>(
      future: _donationsFuture,
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
                  Text('Failed to load donation ledger: ${snapshot.error}', textAlign: TextAlign.center, style: const TextStyle(color: kTextSecondary)),
                  const SizedBox(height: 14),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0F2B48)),
                    onPressed: _loadDonations,
                    child: const Text('Reload', style: TextStyle(color: Colors.white)),
                  ),
                ],
              ),
            ),
          );
        }

        final donations = snapshot.data ?? [];
        if (donations.isEmpty) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.receipt_long_outlined, size: 50, color: Colors.grey[400]),
                const SizedBox(height: 10),
                const Text('No public donations logged yet.', style: TextStyle(color: kTextSecondary, fontSize: 14)),
              ],
            ),
          );
        }

        final totalFunds = donations
            .where((d) => d.donationType.toLowerCase().contains('money') || d.donationType.toLowerCase().contains('monetary'))
            .fold<double>(0, (sum, d) => sum + d.amountOrQuantity);

        return RefreshIndicator(
          onRefresh: () async => _loadDonations(),
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
                        const Text('Total Audited Relief Funds', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                        const SizedBox(height: 4),
                        Text('LKR ${totalFunds.toStringAsFixed(0)}', style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    Text('${donations.length} Contributions', style: const TextStyle(color: kAccent, fontWeight: FontWeight.w600, fontSize: 13)),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              ...donations.map((d) {
                final isMoney = d.donationType.toLowerCase().contains('money') || d.donationType.toLowerCase().contains('monetary');
                return Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: kSuccess.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Icon(isMoney ? Icons.payments_outlined : Icons.inventory_2_outlined, color: kSuccess, size: 22),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(d.donorName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: kTextPrimary)),
                              const SizedBox(height: 2),
                              Text(
                                '${d.donationType}  •  ${isMoney ? "LKR " + d.amountOrQuantity.toStringAsFixed(0) : d.amountOrQuantity.toStringAsFixed(0) + " items"}',
                                style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFF047857), fontSize: 13),
                              ),
                              if (d.itemDescription.isNotEmpty)
                                Text(d.itemDescription, style: const TextStyle(color: kTextSecondary, fontSize: 12)),
                              if (d.targetShelterName != null && d.targetShelterName!.isNotEmpty)
                                Text('Target: ${d.targetShelterName}', style: const TextStyle(color: kAccent, fontSize: 11, fontWeight: FontWeight.w500)),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(d.status, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: kTextSecondary)),
                        ),
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
