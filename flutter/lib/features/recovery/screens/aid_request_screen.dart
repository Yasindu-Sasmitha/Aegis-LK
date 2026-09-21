import 'package:flutter/material.dart';
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

  String _victimName = '';
  String _contactPhone = '';
  String _district = 'Kalutara';
  String _aidType = 'Shelter';
  int _familySize = 3;
  String _urgency = 'High';
  String _notes = '';
  String? _selectedShelterId;
  List<ShelterModel> _availableShelters = [];
  bool _loadingShelters = false;
  bool _submitting = false;

  final List<String> _districts = [
    'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle',
    'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle',
    'Kilinochchi', 'Kurunegala', 'Mannar', 'Matale', 'Matara', 'Monaragala',
    'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura',
    'Trincomalee', 'Vavuniya'
  ];

  final List<String> _aidTypes = [
    'Shelter', 'Food & Ration Packs', 'Medical Assistance', 'Financial Subsistence',
    'Clean Water & Sanitation', 'Clothing & Bedding'
  ];

  final List<String> _urgencyLevels = ['Critical', 'High', 'Medium', 'Low'];

  @override
  void initState() {
    super.initState();
    _loadSheltersForDistrict(_district);
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

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    _formKey.currentState!.save();

    setState(() => _submitting = true);

    try {
      final req = await _service.submitAidRequest(
        victimName: _victimName.trim(),
        contactPhone: _contactPhone.trim(),
        district: _district,
        aidType: _aidType,
        familySize: _familySize,
        urgency: _urgency,
        shelterId: _selectedShelterId,
        notes: _notes.trim(),
      );

      if (mounted) {
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            backgroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            title: Row(
              children: const [
                Icon(Icons.check_circle, color: kSuccess, size: 24),
                SizedBox(width: 8),
                Text('Request Submitted!', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17, color: kTextPrimary)),
              ],
            ),
            content: Text(
              'Your emergency aid request (#${req.id}) for $_familySize family member(s) in $_district has been forwarded to the DMC field coordinators.',
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
                  if (widget.showAppBar) {
                    Navigator.pop(context);
                  }
                },
                child: const Text('OK', style: TextStyle(color: Colors.white)),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Submission failed: $e'),
            backgroundColor: kDanger,
          ),
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
              title: const Text('Apply for Emergency Aid', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            )
          : null,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF1E3A8A), Color(0xFF2563EB)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: const [
                    BoxShadow(color: Colors.black12, blurRadius: 6, offset: Offset(0, 2)),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.handshake_outlined, color: Colors.white, size: 28),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text(
                            'Emergency Relief Application',
                            style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          SizedBox(height: 3),
                          Text(
                            'Request essential shelter, rations, medical care or monetary relief.',
                            style: TextStyle(color: Color(0xFFBFDBFE), fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Applicant Information', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: kTextPrimary)),
                      const Divider(height: 20),
                      TextFormField(
                        initialValue: 'Kamal Perera',
                        decoration: const InputDecoration(
                          labelText: 'Head of Household / Applicant Name',
                          border: OutlineInputBorder(),
                          isDense: true,
                        ),
                        validator: (val) => val == null || val.trim().isEmpty ? 'Required' : null,
                        onSaved: (val) => _victimName = val ?? '',
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        initialValue: '+94 71 890 1234',
                        decoration: const InputDecoration(
                          labelText: 'Contact Phone Number',
                          border: OutlineInputBorder(),
                          isDense: true,
                        ),
                        keyboardType: TextInputType.phone,
                        validator: (val) => val == null || val.trim().isEmpty ? 'Required' : null,
                        onSaved: (val) => _contactPhone = val ?? '',
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        value: _district,
                        decoration: const InputDecoration(
                          labelText: 'District',
                          border: OutlineInputBorder(),
                          isDense: true,
                        ),
                        items: _districts.map((d) => DropdownMenuItem(value: d, child: Text(d))).toList(),
                        onChanged: (val) {
                          if (val != null) {
                            setState(() => _district = val);
                            _loadSheltersForDistrict(val);
                          }
                        },
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Aid Requirement Details', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: kTextPrimary)),
                      const Divider(height: 20),
                      DropdownButtonFormField<String>(
                        value: _aidType,
                        decoration: const InputDecoration(
                          labelText: 'Primary Aid Category',
                          border: OutlineInputBorder(),
                          isDense: true,
                        ),
                        items: _aidTypes.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                        onChanged: (val) => setState(() => _aidType = val ?? 'Shelter'),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              initialValue: '3',
                              decoration: const InputDecoration(
                                labelText: 'Family Members Count',
                                border: OutlineInputBorder(),
                                isDense: true,
                              ),
                              keyboardType: TextInputType.number,
                              validator: (val) => (int.tryParse(val ?? '') ?? 0) < 1 ? 'Min 1' : null,
                              onSaved: (val) => _familySize = int.tryParse(val ?? '1') ?? 1,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              value: _urgency,
                              decoration: const InputDecoration(
                                labelText: 'Urgency Level',
                                border: OutlineInputBorder(),
                                isDense: true,
                              ),
                              items: _urgencyLevels.map((u) => DropdownMenuItem(value: u, child: Text(u))).toList(),
                              onChanged: (val) => setState(() => _urgency = val ?? 'High'),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Optional Shelter Assignment Dropdown
                      if (_loadingShelters)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 8),
                          child: Center(child: LinearProgressIndicator()),
                        )
                      else if (_availableShelters.isNotEmpty)
                        DropdownButtonFormField<String>(
                          value: _selectedShelterId,
                          decoration: const InputDecoration(
                            labelText: 'Preferred Target Shelter (Optional)',
                            border: OutlineInputBorder(),
                            isDense: true,
                          ),
                          items: [
                            const DropdownMenuItem(value: null, child: Text('No specific shelter preference')),
                            ..._availableShelters.map((s) => DropdownMenuItem(
                              value: s.id,
                              child: Text('${s.name} (${s.remainingBeds} beds available)'),
                            )),
                          ],
                          onChanged: (val) => setState(() => _selectedShelterId = val),
                        ),
                      const SizedBox(height: 12),

                      TextFormField(
                        initialValue: 'Elderly parents and one infant needing dry ration packs and baby formula.',
                        decoration: const InputDecoration(
                          labelText: 'Additional Notes & Specific Medical / Dietary Needs',
                          border: OutlineInputBorder(),
                        ),
                        maxLines: 3,
                        onSaved: (val) => _notes = val ?? '',
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
                      : const Icon(Icons.send, color: Colors.white),
                  label: Text(
                    _submitting ? 'Submitting Application...' : 'Submit Emergency Aid Application',
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF1E3A8A),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
