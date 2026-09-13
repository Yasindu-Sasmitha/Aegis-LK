import 'package:flutter/material.dart';
import '../models/recovery_models.dart';
import '../services/recovery_service.dart';

class CitizenDamageReportScreen extends StatefulWidget {
  const CitizenDamageReportScreen({Key? key}) : super(key: key);

  @override
  State<CitizenDamageReportScreen> createState() => _CitizenDamageReportScreenState();
}

class _CitizenDamageReportScreenState extends State<CitizenDamageReportScreen> {
  final _formKey = GlobalKey<FormState>();
  final _service = RecoveryService();

  String _district = 'Kalutara';
  String _disasterType = 'Flood';
  final _locationController = TextEditingController(text: 'Nagoda, Kalutara');
  final _housesDamagedController = TextEditingController(text: '15');
  final _displacedFamiliesController = TextEditingController(text: '12');
  final _reportedByController = TextEditingController();
  final _reporterContactController = TextEditingController();
  final _notesController = TextEditingController();

  final List<InfrastructureDamageItem> _infraItems = [
    InfrastructureDamageItem(
      assetName: 'Village Access Bridge',
      assetType: 'Bridge',
      damageLevel: 'Severe',
      estimatedCost: 350000,
      description: 'Main bridge approach collapsed due to river overflow',
    )
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
    'Flood', 'Landslide', 'Tsunami', 'Cyclone', 'Drought', 'Coastal Erosion'
  ];

  void _addInfraItem() {
    showDialog(
      context: context,
      builder: (ctx) {
        String name = '';
        String type = 'Bridge';
        String severity = 'Moderate';
        double cost = 100000;
        return AlertDialog(
          title: const Text('Add Damaged Infrastructure'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  decoration: const InputDecoration(labelText: 'Asset Name (e.g. Pipeline B12)'),
                  onChanged: (v) => name = v,
                ),
                DropdownButtonFormField<String>(
                  value: type,
                  decoration: const InputDecoration(labelText: 'Asset Type'),
                  items: ['Bridge', 'Road', 'Water', 'Hospital', 'School', 'Power']
                      .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                      .toList(),
                  onChanged: (v) => type = v ?? 'Bridge',
                ),
                DropdownButtonFormField<String>(
                  value: severity,
                  decoration: const InputDecoration(labelText: 'Damage Level'),
                  items: ['Destroyed', 'Severe', 'Moderate', 'Minor']
                      .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                      .toList(),
                  onChanged: (v) => severity = v ?? 'Moderate',
                ),
                TextField(
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Estimated Repair Cost (LKR)'),
                  onChanged: (v) => cost = double.tryParse(v) ?? 100000,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            ElevatedButton(
              onPressed: () {
                if (name.isNotEmpty) {
                  setState(() {
                    _infraItems.add(InfrastructureDamageItem(
                      assetName: name,
                      assetType: type,
                      damageLevel: severity,
                      estimatedCost: cost,
                    ));
                  });
                }
                Navigator.pop(ctx);
              },
              child: const Text('Add'),
            ),
          ],
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
        housesDamaged: int.tryParse(_housesDamagedController.text) ?? 0,
        displacedFamilies: int.tryParse(_displacedFamiliesController.text) ?? 0,
        reportedBy: _reportedByController.text.trim().isEmpty ? 'Citizen Reporter' : _reportedByController.text.trim(),
        reporterContact: _reporterContactController.text.trim(),
        notes: _notesController.text.trim(),
        infrastructureDamage: _infraItems,
      );

      final result = await _service.submitDamageIntake(intake);

      if (mounted) {
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Report Submitted Successfully!'),
            content: Text(
              'Damage report for $_district has been recorded.\n'
              'Autonomous Recovery Workflow ID: ${result['workflowId'] ?? 'Generated'}\n'
              'Initial Status: ${result['status'] ?? 'PendingApproval'}',
            ),
            actions: [
              ElevatedButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.pop(context);
                },
                child: const Text('Done'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Submission failed: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Report Disaster Damage'),
        backgroundColor: Colors.red[800],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Citizen Damage & Incident Intake',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              const Text(
                'Submit localized disaster impact data to trigger autonomous AI recovery planning.',
                style: TextStyle(color: Colors.grey, fontSize: 13),
              ),
              const SizedBox(height: 20),

              DropdownButtonFormField<String>(
                value: _district,
                decoration: const InputDecoration(labelText: 'District', border: OutlineInputBorder()),
                items: _districts.map((d) => DropdownMenuItem(value: d, child: Text(d))).toList(),
                onChanged: (v) => setState(() => _district = v ?? 'Kalutara'),
              ),
              const SizedBox(height: 12),

              DropdownButtonFormField<String>(
                value: _disasterType,
                decoration: const InputDecoration(labelText: 'Disaster Type', border: OutlineInputBorder()),
                items: _disasterTypes.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                onChanged: (v) => setState(() => _disasterType = v ?? 'Flood'),
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: _locationController,
                decoration: const InputDecoration(labelText: 'Specific Location / Grama Niladhari Division', border: OutlineInputBorder()),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Please enter location' : null,
              ),
              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _housesDamagedController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Houses Damaged', border: OutlineInputBorder()),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _displacedFamiliesController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Displaced Families', border: OutlineInputBorder()),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: _reportedByController,
                decoration: const InputDecoration(labelText: 'Your Name (Optional)', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: _reporterContactController,
                decoration: const InputDecoration(labelText: 'Contact Phone Number', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: _notesController,
                maxLines: 2,
                decoration: const InputDecoration(labelText: 'Situation Notes & Immediate Needs', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 20),

              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Damaged Public Assets', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  TextButton.icon(
                    onPressed: _addInfraItem,
                    icon: const Icon(Icons.add),
                    label: const Text('Add Asset'),
                  ),
                ],
              ),

              if (_infraItems.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Text('No damaged assets added yet.', style: TextStyle(color: Colors.grey)),
                )
              else
                ..._infraItems.asMap().entries.map((entry) {
                  final idx = entry.key;
                  final item = entry.value;
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      title: Text('${item.assetName} (${item.assetType})'),
                      subtitle: Text('Damage: ${item.damageLevel} — Est: LKR ${item.estimatedCost.toStringAsFixed(0)}'),
                      trailing: IconButton(
                        icon: const Icon(Icons.delete, color: Colors.red),
                        onPressed: () => setState(() => _infraItems.removeAt(idx)),
                      ),
                    ),
                  );
                }),

              const SizedBox(height: 24),

              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton.icon(
                  onPressed: _isSubmitting ? null : _submitReport,
                  icon: _isSubmitting
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.send),
                  label: Text(_isSubmitting ? 'Submitting Report...' : 'Submit Damage Report & Trigger AI'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red[800],
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
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
