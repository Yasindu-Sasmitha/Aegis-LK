import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../shared/auth/auth_provider.dart';
import '../../../shared/theme/aegis_theme.dart';
import '../models/recovery_models.dart';
import '../services/recovery_service.dart';

class AidRequestScreen extends StatefulWidget {
  final bool showAppBar;
  const AidRequestScreen({super.key, this.showAppBar = true});

  @override
  State<AidRequestScreen> createState() => _AidRequestScreenState();
}

class _AidRequestScreenState extends State<AidRequestScreen> {
  final _formKey = GlobalKey<FormState>();
  final RecoveryService _service = RecoveryService();

  final _victimNameController = TextEditingController();
  final _contactPhoneController = TextEditingController();
  String _district = 'Kalutara';
  String _aidType = 'Food Rations';
  final _familySizeController = TextEditingController(text: '4');
  String _urgency = 'High';
  final _notesController = TextEditingController();
  String? _selectedShelterId;
  List<ShelterModel> _availableShelters = [];
  bool _loadingShelters = false;
  bool _submitting = false;
  bool _initializedUser = false;

  final List<String> _districts = [
    'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle',
    'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle',
    'Kilinochchi', 'Kurunegala', 'Mannar', 'Matale', 'Matara', 'Monaragala',
    'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura',
    'Trincomalee', 'Vavuniya'
  ];

  final List<String> _aidTypes = [
    'Food Rations',
    'Clean Drinking Water',
    'Emergency Medical Kit',
    'Baby Care & Infant Formula',
    'Temporary Shelter & Bedding',
    'Cash Living Stipend',
    'Clothing & Blankets',
  ];

  final List<String> _urgencyLevels = ['Critical', 'High', 'Medium', 'Low'];

  @override
  void initState() {
    super.initState();
    _loadSheltersForDistrict(_district);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initializedUser) {
      _initializedUser = true;
      final auth = Provider.of<AuthProvider>(context, listen: false);
      if (auth.user != null) {
        if (_victimNameController.text.isEmpty) {
          _victimNameController.text = auth.user!.fullName;
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
    _victimNameController.dispose();
    _contactPhoneController.dispose();
    _familySizeController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _loadSheltersForDistrict(String district) async {
    setState(() {
      _loadingShelters = true;
      _selectedShelterId = null;
    });
    try {
      final shelters = await _service.fetchShelters(district: district);
      if (mounted) {
        setState(() {
          _availableShelters = shelters;
          _loadingShelters = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingShelters = false);
    }
  }

  void _resetForm() {
    _notesController.clear();
    _familySizeController.text = '4';
    _selectedShelterId = null;
    setState(() {});
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    _formKey.currentState!.save();

    final fSize = int.tryParse(_familySizeController.text.trim()) ?? 1;

    setState(() => _submitting = true);

    try {
      await _service.submitAidRequest(
        victimName: _victimNameController.text.trim(),
        contactPhone: _contactPhoneController.text.trim(),
        district: _district,
        aidType: _aidType,
        familySize: fSize,
        urgency: _urgency,
        shelterId: _selectedShelterId,
        notes: _notesController.text.trim(),
      );

      if (mounted) {
        _resetForm();
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            backgroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            title: const Row(
              children: [
                Icon(Icons.check_circle, color: kSuccess, size: 24),
                SizedBox(width: 8),
                Text('Request Submitted!',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17, color: kTextPrimary)),
              ],
            ),
            content: const Text(
              'Your emergency humanitarian aid request has been received by the Disaster Management Centre desk for immediate triage and dispatch.',
              style: TextStyle(fontSize: 13, color: kTextSecondary),
            ),
            actions: [
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2563EB)),
                onPressed: () => Navigator.pop(ctx),
                child: const Text('OK', style: TextStyle(color: Colors.white)),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e'), backgroundColor: kDanger),
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
              title: const Text('Request Emergency Relief Aid',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            )
          : null,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF07162C), Color(0xFF1E3A8A)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Humanitarian Relief Intake Portal',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                    SizedBox(height: 4),
                    Text('Direct intake for flood, cyclone and landslide victims to receive rations, medical kits, and shelter assistance.',
                        style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 12)),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Applicant Details Card
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
                    const Text('Applicant Information',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: kTextPrimary)),
                    const SizedBox(height: 2),
                    const Text('Primary contact for verification and relief dispatch',
                        style: TextStyle(fontSize: 11, color: kTextSecondary)),
                    const Divider(height: 20, color: kBorder),
                    TextFormField(
                      controller: _victimNameController,
                      decoration: const InputDecoration(labelText: 'Applicant / Victim Name *', border: OutlineInputBorder()),
                      validator: (v) => v?.trim().isEmpty == true ? 'Applicant name required' : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _contactPhoneController,
                      decoration: const InputDecoration(labelText: 'Contact Phone Number *', border: OutlineInputBorder()),
                      keyboardType: TextInputType.phone,
                      validator: (v) => (v?.trim().length ?? 0) < 9 ? 'Valid phone number required' : null,
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: _district,
                      decoration: const InputDecoration(labelText: 'District *', border: OutlineInputBorder()),
                      items: _districts.map((d) => DropdownMenuItem(value: d, child: Text(d))).toList(),
                      onChanged: (v) {
                        setState(() => _district = v!);
                        _loadSheltersForDistrict(v!);
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Relief Requirements Card
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
                    const Text('Relief Requirements',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: kTextPrimary)),
                    const SizedBox(height: 2),
                    const Text('Specify category and urgency level',
                        style: TextStyle(fontSize: 11, color: kTextSecondary)),
                    const Divider(height: 20, color: kBorder),
                    DropdownButtonFormField<String>(
                      initialValue: _aidType,
                      decoration: const InputDecoration(labelText: 'Primary Aid Category *', border: OutlineInputBorder()),
                      items: _aidTypes.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                      onChanged: (v) => setState(() => _aidType = v!),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _familySizeController,
                            decoration: const InputDecoration(labelText: 'Family Size (Members) *', border: OutlineInputBorder()),
                            keyboardType: TextInputType.number,
                            validator: (v) => (int.tryParse(v ?? '') ?? 0) < 1 ? 'Minimum 1' : null,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            initialValue: _urgency,
                            decoration: const InputDecoration(labelText: 'Urgency Level *', border: OutlineInputBorder()),
                            items: _urgencyLevels.map((u) => DropdownMenuItem(value: u, child: Text(u))).toList(),
                            onChanged: (v) => setState(() => _urgency = v!),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (_aidType.contains('Shelter') || _aidType.contains('Bedding')) ...[
                      DropdownButtonFormField<String>(
                        initialValue: _selectedShelterId,
                        decoration: InputDecoration(
                          labelText: 'Requested Evacuation Shelter',
                          border: const OutlineInputBorder(),
                          suffixIcon: _loadingShelters
                              ? const SizedBox(width: 16, height: 16, child: Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator(strokeWidth: 2)))
                              : null,
                        ),
                        items: [
                          const DropdownMenuItem(value: null, child: Text('Assign nearest open shelter')),
                          ..._availableShelters.map((s) => DropdownMenuItem(value: s.id, child: Text('${s.name} (${s.remainingBeds} beds)'))),
                        ],
                        onChanged: (v) => setState(() => _selectedShelterId = v),
                      ),
                      const SizedBox(height: 12),
                    ],
                    TextFormField(
                      controller: _notesController,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        labelText: 'Situation Notes & Specific Requirements',
                        hintText: 'e.g. Infant dry milk required, elderly member needing insulin',
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
                onPressed: _submitting ? null : _submit,
                child: _submitting
                    ? const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)),
                          SizedBox(width: 10),
                          Text('Submitting Request...', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        ],
                      )
                    : const Text('Submit Relief Aid Application',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
              ),
              const SizedBox(height: 30),
            ],
          ),
        ),
      ),
    );
  }
}
