import 'dart:io';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../../shared/auth/auth_provider.dart';
import '../../../shared/theme/aegis_theme.dart';
import '../services/incident_service.dart';

class ReportIncidentScreen extends StatefulWidget {
  final bool showAppBar;
  final VoidCallback? onSubmitted; // lets the shell jump to "My Reports" afterwards
  const ReportIncidentScreen({super.key, this.showAppBar = true, this.onSubmitted});

  @override
  State<ReportIncidentScreen> createState() => _ReportIncidentScreenState();
}

class _ReportIncidentScreenState extends State<ReportIncidentScreen> {
  final _formKey = GlobalKey<FormState>();
  final IncidentService _service = IncidentService();
  final ImagePicker _picker = ImagePicker();

  final _descriptionController = TextEditingController();
  String _disasterType = 'Flood';
  String _severity = 'Medium';

  double? _latitude;
  double? _longitude;
  bool _locating = false;
  String? _locationError;

  File? _photo;
  bool _submitting = false;

  static const _disasterTypes = ['Flood', 'Landslide', 'Cyclone', 'Fire', 'Other'];
  static const _severities = ['Low', 'Medium', 'High', 'Critical'];

  @override
  void initState() {
    super.initState();
    _captureLocation();
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _captureLocation() async {
    setState(() {
      _locating = true;
      _locationError = null;
    });
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        throw Exception('Location services are turned off on this device.');
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        throw Exception('Location permission was denied.');
      }
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      if (!mounted) return;
      setState(() {
        _latitude = position.latitude;
        _longitude = position.longitude;
        _locating = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _locationError = e.toString().replaceFirst('Exception: ', '');
        _locating = false;
      });
    }
  }

  Future<void> _pickPhoto(ImageSource source) async {
    final picked = await _picker.pickImage(source: source, imageQuality: 80, maxWidth: 1600);
    if (picked != null && mounted) {
      setState(() => _photo = File(picked.path));
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_latitude == null || _longitude == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Your location is required to submit a report.')),
      );
      return;
    }
    final user = context.read<AuthProvider>().user;
    if (user == null) return;

    setState(() => _submitting = true);
    try {
      final created = await _service.submitReport(
        disasterType: _disasterType,
        description: _descriptionController.text.trim(),
        severityReported: _severity,
        latitude: _latitude!,
        longitude: _longitude!,
        reportedByUserId: user.id,
      );

      // Photo upload needs the incident to exist first, so it's a separate step.
      // A failed upload shouldn't lose the report itself.
      String? photoWarning;
      if (_photo != null) {
        try {
          await _service.uploadPhoto(created.id, _photo!);
        } catch (_) {
          photoWarning = ' (photo upload failed)';
        }
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: kSuccess,
          content: Text('Report submitted${photoWarning ?? ''}. Our system is checking it now.'),
        ),
      );
      _descriptionController.clear();
      setState(() => _photo = null);
      widget.onSubmitted?.call();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: kDanger,
          content: Text(e.toString().replaceFirst('Exception: ', '')),
        ),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final body = SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Report an Incident',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: kTextPrimary),
            ),
            const SizedBox(height: 4),
            const Text(
              'Tell us what is happening. Officers are notified once your report is screened.',
              style: TextStyle(fontSize: 13, color: kTextSecondary),
            ),
            const SizedBox(height: 20),

            DropdownButtonFormField<String>(
              initialValue: _disasterType,
              decoration: const InputDecoration(labelText: 'Type of disaster', border: OutlineInputBorder()),
              items: _disasterTypes.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
              onChanged: (v) => setState(() => _disasterType = v ?? _disasterType),
            ),
            const SizedBox(height: 14),

            DropdownButtonFormField<String>(
              initialValue: _severity,
              decoration: const InputDecoration(labelText: 'How severe is it?', border: OutlineInputBorder()),
              items: _severities.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
              onChanged: (v) => setState(() => _severity = v ?? _severity),
            ),
            const SizedBox(height: 14),

            TextFormField(
              controller: _descriptionController,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'What do you see?',
                hintText: 'e.g. Water rising fast near the market, several houses affected',
                border: OutlineInputBorder(),
                alignLabelWithHint: true,
              ),
              validator: (v) => (v == null || v.trim().length < 10)
                  ? 'Please describe what is happening (at least 10 characters)'
                  : null,
            ),
            const SizedBox(height: 14),

            // Location card
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: kCardBg,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: kBorder),
              ),
              child: Row(
                children: [
                  Icon(
                    _latitude != null ? Icons.location_on : Icons.location_off,
                    color: _latitude != null ? kSuccess : kWarning,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _locating
                        ? const Text('Getting your location…', style: TextStyle(color: kTextSecondary))
                        : _latitude != null
                            ? Text(
                                'Location captured: ${_latitude!.toStringAsFixed(4)}, ${_longitude!.toStringAsFixed(4)}',
                                style: const TextStyle(color: kTextPrimary, fontSize: 13),
                              )
                            : Text(
                                _locationError ?? 'Location not available',
                                style: const TextStyle(color: kDanger, fontSize: 13),
                              ),
                  ),
                  TextButton(onPressed: _locating ? null : _captureLocation, child: const Text('Retry')),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Photo
            if (_photo != null)
              Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: Image.file(_photo!, height: 180, width: double.infinity, fit: BoxFit.cover),
                  ),
                  Positioned(
                    top: 6,
                    right: 6,
                    child: CircleAvatar(
                      backgroundColor: Colors.black54,
                      child: IconButton(
                        icon: const Icon(Icons.close, color: Colors.white),
                        onPressed: () => setState(() => _photo = null),
                      ),
                    ),
                  ),
                ],
              )
            else
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _pickPhoto(ImageSource.camera),
                      icon: const Icon(Icons.camera_alt),
                      label: const Text('Take photo'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _pickPhoto(ImageSource.gallery),
                      icon: const Icon(Icons.photo_library),
                      label: const Text('Choose photo'),
                    ),
                  ),
                ],
              ),
            const SizedBox(height: 22),

            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: _submitting ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: kNavBg,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: _submitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Submit Report', style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ),
          ],
        ),
      ),
    );

    if (!widget.showAppBar) return body;
    return Scaffold(
      backgroundColor: kSurface,
      appBar: AppBar(title: const Text('Report an Incident'), backgroundColor: kNavBg, foregroundColor: Colors.white),
      body: body,
    );
  }
}