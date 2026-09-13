import 'package:flutter/material.dart';
import '../services/recovery_service.dart';

class AidRequestScreen extends StatefulWidget {
  const AidRequestScreen({Key? key}) : super(key: key);

  @override
  State<AidRequestScreen> createState() => _AidRequestScreenState();
}

class _AidRequestScreenState extends State<AidRequestScreen> {
  final _formKey = GlobalKey<FormState>();
  final RecoveryService _service = RecoveryService();

  String _name = '';
  String _phone = '';
  String _district = 'Kalutara';
  String _aidType = 'Shelter';
  int _familySize = 1;
  String _urgency = 'Medium';
  String _notes = '';
  bool _submitting = false;

  void _submit() async {
    if (!_formKey.currentState!.validate()) return;
    _formKey.currentState!.save();

    setState(() => _submitting = true);

    try {
      await _service.submitAidRequest(
        victimName: _name,
        contactPhone: _phone,
        district: _district,
        aidType: _aidType,
        familySize: _familySize,
        urgency: _urgency,
        notes: _notes,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Aid request submitted successfully!')),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString()}')),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Apply for Emergency Aid'),
        backgroundColor: Colors.blue[700],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Submit Emergency Aid Application', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              TextFormField(
                decoration: const InputDecoration(labelText: 'Applicant Name', border: OutlineInputBorder()),
                validator: (val) => val == null || val.isEmpty ? 'Required' : null,
                onSaved: (val) => _name = val!,
              ),
              const SizedBox(height: 12),
              TextFormField(
                decoration: const InputDecoration(labelText: 'Contact Phone Number', border: OutlineInputBorder()),
                keyboardType: TextInputType.phone,
                validator: (val) => val == null || val.isEmpty ? 'Required' : null,
                onSaved: (val) => _phone = val!,
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: _district,
                decoration: const InputDecoration(labelText: 'District', border: OutlineInputBorder()),
                items: ['Kalutara', 'Ratnapura', 'Matara', 'Colombo', 'Galle']
                    .map((d) => DropdownMenuItem(value: d, child: Text(d)))
                    .toList(),
                onChanged: (val) => setState(() => _district = val!),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: _aidType,
                decoration: const InputDecoration(labelText: 'Type of Aid Needed', border: OutlineInputBorder()),
                items: ['Shelter', 'Food', 'Medical', 'Financial', 'Clothing']
                    .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                    .toList(),
                onChanged: (val) => setState(() => _aidType = val!),
              ),
              const SizedBox(height: 12),
              TextFormField(
                decoration: const InputDecoration(labelText: 'Family Size (Number of People)', border: OutlineInputBorder()),
                keyboardType: TextInputType.number,
                initialValue: '1',
                validator: (val) => (int.tryParse(val ?? '') ?? 0) < 1 ? 'Must be at least 1' : null,
                onSaved: (val) => _familySize = int.parse(val!),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: _urgency,
                decoration: const InputDecoration(labelText: 'Urgency Level', border: OutlineInputBorder()),
                items: ['Critical', 'High', 'Medium', 'Low']
                    .map((u) => DropdownMenuItem(value: u, child: Text(u)))
                    .toList(),
                onChanged: (val) => setState(() => _urgency = val!),
              ),
              const SizedBox(height: 12),
              TextFormField(
                decoration: const InputDecoration(labelText: 'Additional Notes / Specific Needs', border: OutlineInputBorder()),
                maxLines: 3,
                onSaved: (val) => _notes = val ?? '',
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: _submitting ? null : _submit,
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.blue[700]),
                  child: _submitting ? const CircularProgressIndicator(color: Colors.white) : const Text('Submit Application', style: TextStyle(fontSize: 16)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
