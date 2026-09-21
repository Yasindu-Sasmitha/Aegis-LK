import 'package:flutter/material.dart';
import '../../../shared/theme/aegis_theme.dart';
import '../models/recovery_models.dart';
import '../services/recovery_service.dart';
import 'recovery_plan_status_screen.dart';

class CitizenDamageReportScreen extends StatefulWidget {
  final bool showAppBar;
  const CitizenDamageReportScreen({super.key, this.showAppBar = true});

  @override
  State<CitizenDamageReportScreen> createState() => _CitizenDamageReportScreenState();
}

class _CitizenDamageReportScreenState extends State<CitizenDamageReportScreen> {
  final _formKey = GlobalKey<FormState>();
  final _service = RecoveryService();

  String _district = 'Kalutara';
  String _disasterType = 'Flood';
  final _locationController = TextEditingController(text: 'Nagoda, Kalutara South');
  final _housesDamagedController = TextEditingController(text: '15');
  final _displacedFamiliesController = TextEditingController(text: '12');
  final _reportedByController = TextEditingController(text: 'Citizen Reporter');
  final _reporterContactController = TextEditingController(text: '+94 77 123 4567');
  final _notesController = TextEditingController(text: 'Severe flash flood caused river bank overflow. Clean drinking water and immediate shelter required.');

  final List<InfrastructureDamageItem> _infraItems = [
    InfrastructureDamageItem(
      assetName: 'Village Access Bridge',
      assetType: 'Bridge',
      damageLevel: 'Severe',
      estimatedCost: 350000,
      description: 'Main bridge approach collapsed due to flood surge',
    ),
    InfrastructureDamageItem(
      assetName: 'Primary School Boundary Wall',
      assetType: 'School',
      damageLevel: 'Moderate',
      estimatedCost: 120000,
      description: 'Ground erosion under perimeter wall',
    ),
  ];

  bool _isSubmitting = false;

  final List<String> _districts = [
    'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle',
    'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle',
    'Kilinochchi', 'Kurunegala', 'Mannar', 'Matale', 'Matara', 'Monaragala',
    'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura',
    'Trincomalee', 'Vavuniya'
  ];

  final List<String> _disasterTypes = [
    'Flood', 'Landslide', 'Tsunami', 'Cyclone', 'Drought', 'Coastal Erosion', 'Urban Inundation'
  ];

  @override
  void dispose() {
    _locationController.dispose();
    _housesDamagedController.dispose();
    _displacedFamiliesController.dispose();
    _reportedByController.dispose();
    _reporterContactController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  void _showAddInfraDialog() {
    String name = '';
    String type = 'Bridge';
    String severity = 'Moderate';
    double cost = 100000;
    String desc = '';

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              title: Row(
                children: const [
                  Icon(Icons.add_business_outlined, color: kAccent, size: 22),
                  SizedBox(width: 8),
                  Text('Add Damaged Asset', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17, color: kTextPrimary)),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      decoration: const InputDecoration(
                        labelText: 'Asset Name (e.g. Village Culvert)',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                      onChanged: (v) => name = v,
                    ),
                    const SizedBox(height: 10),
                    DropdownButtonFormField<String>(
                      initialValue: type,
                      decoration: const InputDecoration(
                        labelText: 'Asset Type',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                      items: ['Bridge', 'Road', 'Water', 'Hospital', 'School', 'Power', 'Community Hall']
                          .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                          .toList(),
                      onChanged: (v) => setDialogState(() => type = v ?? 'Bridge'),
                    ),
                    const SizedBox(height: 10),
                    DropdownButtonFormField<String>(
                      initialValue: severity,
                      decoration: const InputDecoration(
                        labelText: 'Damage Level',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                      items: ['Destroyed', 'Severe', 'Moderate', 'Minor']
                          .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                          .toList(),
                      onChanged: (v) => setDialogState(() => severity = v ?? 'Moderate'),
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Estimated Repair Cost (LKR)',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                      onChanged: (v) => cost = double.tryParse(v) ?? 100000,
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      maxLines: 2,
                      decoration: const InputDecoration(
                        labelText: 'Description / Notes',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                      onChanged: (v) => desc = v,
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Cancel', style: TextStyle(color: kTextSecondary)),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0F2B48),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: () {
                    if (name.trim().isNotEmpty) {
                      setState(() {
                        _infraItems.add(InfrastructureDamageItem(
                          assetName: name.trim(),
                          assetType: type,
                          damageLevel: severity,
                          estimatedCost: cost,
                          description: desc.trim().isNotEmpty ? desc.trim() : null,
                        ));
                      });
                    }
                    Navigator.pop(ctx);
                  },
                  child: const Text('Add Asset', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _submitReport() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);
    try {
      final intake = DamageIntakeModel(
        district: _district,
        disasterType: _disasterType,
        location: _locationController.text.trim(),
        housesDamaged: int.tryParse(_housesDamagedController.text.trim()) ?? 0,
        displacedFamilies: int.tryParse(_displacedFamiliesController.text.trim()) ?? 0,
        reportedBy: _reportedByController.text.trim().isEmpty ? 'Citizen Reporter' : _reportedByController.text.trim(),
        reporterContact: _reporterContactController.text.trim(),
        notes: _notesController.text.trim(),
        infrastructureDamage: _infraItems,
      );

      final plan = await _service.submitDamageIntake(intake);

      if (mounted) {
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            backgroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: Row(
              children: const [
                Icon(Icons.check_circle, color: kSuccess, size: 28),
                SizedBox(width: 10),
                Expanded(
                  child: Text('AI Plan Generated!', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: kTextPrimary)),
                ),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Damage intake for $_district has been synthesized by the 4-agent recovery pipeline.',
                  style: const TextStyle(fontSize: 13, color: kTextSecondary),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: kBorder),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Plan ID: ${plan.id}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: kTextPrimary)),
                      const SizedBox(height: 4),
                      Text('Status: ${plan.status}', style: const TextStyle(fontSize: 12, color: Color(0xFF2563EB), fontWeight: FontWeight.w600)),
                      Text('Estimated Cost: LKR ${plan.totalCost.toStringAsFixed(0)}', style: const TextStyle(fontSize: 12, color: kTextSecondary)),
                      Text('Assigned Tasks: ${plan.tasks.length}', style: const TextStyle(fontSize: 12, color: kTextSecondary)),
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
                icon: const Icon(Icons.analytics_outlined, size: 16, color: kAccent),
                label: const Text('Inspect Plan Trace', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => RecoveryPlanStatusScreen(
                        showAppBar: true,
                        initialPlanId: plan.id,
                      ),
                    ),
                  );
                },
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
      if (mounted) setState(() => _isSubmitting = false);
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
              title: const Text('Report Disaster Damage', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            )
          : null,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
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
                    colors: [Color(0xFF7F1D1D), Color(0xFF991B1B)],
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
                      child: const Icon(Icons.crisis_alert, color: Colors.white, size: 28),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text(
                            'Disaster Incident & Damage Intake',
                            style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          SizedBox(height: 3),
                          Text(
                            'Feeds directly into the autonomous 4-agent recovery synthesis engine.',
                            style: TextStyle(color: Color(0xFFFECACA), fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // General Info Card
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Incident Information', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: kTextPrimary)),
                      const Divider(height: 20),
                      DropdownButtonFormField<String>(
                        initialValue: _district,
                        decoration: const InputDecoration(
                          labelText: 'Affected District',
                          border: OutlineInputBorder(),
                          isDense: true,
                        ),
                        items: _districts.map((d) => DropdownMenuItem(value: d, child: Text(d))).toList(),
                        onChanged: (v) => setState(() => _district = v ?? 'Kalutara'),
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        initialValue: _disasterType,
                        decoration: const InputDecoration(
                          labelText: 'Disaster Type',
                          border: OutlineInputBorder(),
                          isDense: true,
                        ),
                        items: _disasterTypes.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                        onChanged: (v) => setState(() => _disasterType = v ?? 'Flood'),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _locationController,
                        decoration: const InputDecoration(
                          labelText: 'Specific Location / Grama Niladhari Division',
                          border: OutlineInputBorder(),
                          isDense: true,
                        ),
                        validator: (v) => (v == null || v.trim().isEmpty) ? 'Please enter location' : null,
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _housesDamagedController,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(
                                labelText: 'Houses Damaged',
                                border: OutlineInputBorder(),
                                isDense: true,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: _displacedFamiliesController,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(
                                labelText: 'Displaced Families',
                                border: OutlineInputBorder(),
                                isDense: true,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Reporter & Situation Card
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Reporter Details & Notes', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: kTextPrimary)),
                      const Divider(height: 20),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _reportedByController,
                              decoration: const InputDecoration(
                                labelText: 'Reporter Name',
                                border: OutlineInputBorder(),
                                isDense: true,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: _reporterContactController,
                              keyboardType: TextInputType.phone,
                              decoration: const InputDecoration(
                                labelText: 'Contact Phone',
                                border: OutlineInputBorder(),
                                isDense: true,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _notesController,
                        maxLines: 2,
                        decoration: const InputDecoration(
                          labelText: 'Immediate Community Needs & Notes',
                          border: OutlineInputBorder(),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Infrastructure Card
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Damaged Public Assets', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: kTextPrimary)),
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF0F2B48),
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            onPressed: _showAddInfraDialog,
                            icon: const Icon(Icons.add, size: 16, color: kAccent),
                            label: const Text('Add Asset', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                      const Divider(height: 20),
                      if (_infraItems.isEmpty)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 8),
                          child: Text('No damaged public assets specified.', style: TextStyle(color: kTextMuted, fontSize: 13)),
                        )
                      else
                        ..._infraItems.asMap().entries.map((entry) {
                          final idx = entry.key;
                          final item = entry.value;
                          return Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: kBorder),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: Colors.amber.withValues(alpha: 0.2),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Icon(Icons.construction_outlined, color: Colors.amber, size: 20),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '${item.assetName} (${item.assetType})',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: kTextPrimary),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'Damage: ${item.damageLevel}  •  Est: LKR ${item.estimatedCost.toStringAsFixed(0)}',
                                        style: const TextStyle(fontSize: 12, color: kTextSecondary),
                                      ),
                                      if (item.description != null && item.description!.isNotEmpty)
                                        Text(
                                          item.description!,
                                          style: const TextStyle(fontSize: 11, color: kTextMuted, fontStyle: FontStyle.italic),
                                        ),
                                    ],
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline, color: kDanger, size: 20),
                                  onPressed: () => setState(() => _infraItems.removeAt(idx)),
                                ),
                              ],
                            ),
                          );
                        }),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Submit Button
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton.icon(
                  onPressed: _isSubmitting ? null : _submitReport,
                  icon: _isSubmitting
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.send, color: Colors.white),
                  label: Text(
                    _isSubmitting ? 'Synthesizing with 4 AI Agents...' : 'Submit Report & Trigger AI Recovery',
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF991B1B),
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
