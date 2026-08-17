import 'package:flutter/material.dart';
import '../services/recovery_service.dart';

class DonateScreen extends StatefulWidget {
  const DonateScreen({Key? key}) : super(key: key);

  @override
  State<DonateScreen> createState() => _DonateScreenState();
}

class _DonateScreenState extends State<DonateScreen> {
  final _formKey = GlobalKey<FormState>();
  final RecoveryService _service = RecoveryService();

  String _donorName = '';
  String _donorContact = '';
  String _donationType = 'Monetary';
  double _amountOrQuantity = 5000;
  String _description = '';
  bool _submitting = false;

  void _submit() async {
    if (!_formKey.currentState!.validate()) return;
    _formKey.currentState!.save();

    setState(() => _submitting = true);

    try {
      final success = await _service.submitDonation(
        donorName: _donorName,
        donorContact: _donorContact,
        donationType: _donationType,
        amountOrQuantity: _amountOrQuantity,
        itemDescription: _description,
      );
      if (mounted && success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Donation successfully recorded. Thank you for your support!')),
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
        title: const Text('Donate & Contribute'),
        backgroundColor: Colors.green[700],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Public Relief Contribution', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              TextFormField(
                decoration: const InputDecoration(labelText: 'Donor Name / Organization', border: OutlineInputBorder()),
                validator: (val) => val == null || val.isEmpty ? 'Required' : null,
                onSaved: (val) => _donorName = val!,
              ),
              const SizedBox(height: 12),
              TextFormField(
                decoration: const InputDecoration(labelText: 'Contact Info (Private)', border: OutlineInputBorder()),
                onSaved: (val) => _donorContact = val ?? '',
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: _donationType,
                decoration: const InputDecoration(labelText: 'Contribution Type', border: OutlineInputBorder()),
                items: ['Monetary', 'Supplies', 'Equipment']
                    .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                    .toList(),
                onChanged: (val) => setState(() => _donationType = val!),
              ),
              const SizedBox(height: 12),
              TextFormField(
                decoration: InputDecoration(
                  labelText: _donationType == 'Monetary' ? 'Amount (LKR)' : 'Quantity / Packages',
                  border: const OutlineInputBorder(),
                ),
                keyboardType: TextInputType.number,
                initialValue: '5000',
                validator: (val) => (double.tryParse(val ?? '') ?? 0) <= 0 ? 'Must be greater than 0' : null,
                onSaved: (val) => _amountOrQuantity = double.parse(val!),
              ),
              const SizedBox(height: 12),
              TextFormField(
                decoration: const InputDecoration(labelText: 'Description / Target Shelter Notes', border: OutlineInputBorder()),
                maxLines: 2,
                onSaved: (val) => _description = val ?? '',
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: _submitting ? null : _submit,
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.green[700]),
                  child: _submitting ? const CircularProgressIndicator(color: Colors.white) : const Text('Submit Donation', style: TextStyle(fontSize: 16)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
