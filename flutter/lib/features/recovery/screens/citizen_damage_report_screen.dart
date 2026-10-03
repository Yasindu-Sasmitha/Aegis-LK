import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../shared/auth/auth_provider.dart';
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

class _CitizenDamageReportScreenState extends State<CitizenDamageReportScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _formKey = GlobalKey<FormState>();
  final RecoveryService _service = RecoveryService();

  // ── SECTION 1: INCIDENT & LOCATION ──
  String _disasterType = 'Flood';
  final _otherDisasterController = TextEditingController();
  String _district = 'Kalutara';
  final _incidentDateController = TextEditingController(
      text: DateTime.now().toIso8601String().split('T')[0]);
  final _incidentTimeController = TextEditingController(
      text: '${TimeOfDay.now().hour.toString().padLeft(2, '0')}:${TimeOfDay.now().minute.toString().padLeft(2, '0')}');
  final _dsDivisionController = TextEditingController();
  final _gnDivisionController = TextEditingController();
  final _affectedVillageController = TextEditingController();
  final _landmarkController = TextEditingController();

  // ── SECTION 2: HUMAN IMPACT & VULNERABILITIES ──
  final _displacedFamiliesController = TextEditingController();
  final _childrenController = TextEditingController();
  final _elderlyController = TextEditingController();
  final _disabledController = TextEditingController();
  final _pregnantController = TextEditingController();
  final _injuredController = TextEditingController();

  // ── SECTION 3: HOUSING DAMAGE BREAKDOWN ──
  final _destroyedHousesController = TextEditingController();
  final _severeHousesController = TextEditingController();
  final _partialHousesController = TextEditingController();

  // ── SECTION 4: INFRASTRUCTURE DAMAGE BUILDER ──
  final List<InfrastructureDamageItem> _infraItems = [];

  // ── SECTION 5: IMMEDIATE RELIEF ASSISTANCE ──
  final Set<String> _selectedNeeds = {};
  final List<String> _immediateNeedsOptions = [
    'Food Rations',
    'Clean Drinking Water',
    'Emergency Medical Aid',
    'Temporary Shelter / Tents',
    'Blankets & Bedding',
    'Baby & Infant Care',
    'Emergency Clothing',
    'Emergency Transport',
    'Hygiene & Sanitation Kits',
    'Psychosocial Support',
  ];

  // ── SECTION 6: SAFETY & UTILITIES ──
  final String _overallSeverity = 'Moderate';
  String _safetyRisk = 'Potential Risk';
  String _electricityAvailable = 'Yes';
  String _waterAvailable = 'Yes';
  String _roadAccessAvailable = 'Yes';
  final String _networkAvailable = 'Yes';
  final String _medicalAccessAvailable = 'Yes';

  // ── SECTION 7: OBSERVATION NOTES ──
  final _notesController = TextEditingController();

  // ── SECTION 8: REPORTER PROFILE ──
  final _reportedByController = TextEditingController();
  final _reporterContactController = TextEditingController();
  final _reporterEmailController = TextEditingController();
  String _reporterType = 'Citizen';
  final _emergencyContactNameController = TextEditingController();
  final _emergencyContactPhoneController = TextEditingController();
  final _emergencyContactRelationController = TextEditingController();

  bool _isSubmitting = false;
  bool _initializedUser = false;
  String? _generatingPlanReportId;

  // Submissions list state
  List<DamageReportModel> _submissions = [];
  bool _loadingSubmissions = false;

  // Incident Module Integration Queue state
  List<ApprovedIncidentModel> _approvedIncidents = [];
  bool _loadingApprovedIncidents = false;
  String? _selectedIncidentId;
  ApprovedIncidentModel? _selectedIncident;

  Future<void> _generatePlanForReport(DamageReportModel report, {String? revisionGuidance}) async {
    setState(() => _generatingPlanReportId = report.id);
    try {
      final intake = DamageIntakeModel(
        district: report.district,
        disasterType: report.disasterType,
        location: report.location,
        housesDamaged: report.housesDamaged,
        displacedFamilies: report.displacedFamilies,
        reportedBy: report.reporterName,
        reporterContact: report.reporterContact,
        notes: report.additionalNotes,
        infrastructureDamage: report.infrastructureDamage.map((infra) => InfrastructureDamageItem(
          assetName: infra.assetName,
          assetType: infra.assetType,
          damageLevel: infra.damageLevel,
          estimatedCost: infra.estimatedCost,
        )).toList(),
      );

      final plan = await _service.submitDamageIntake(
        intake,
        incidentId: report.incidentId ?? _selectedIncidentId,
        damageReportId: report.id,
        revisionGuidance: revisionGuidance,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('AI Recovery Plan generated for ${report.district}! Budget: LKR ${plan.estimatedTotalBudget.toStringAsFixed(0)}'),
            backgroundColor: kSuccess,
          ),
        );
        _loadSubmissions();
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => RecoveryPlanStatusScreen(
              initialPlanId: plan.id,
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to generate AI plan: $e'), backgroundColor: kDanger),
        );
      }
    } finally {
      if (mounted) setState(() => _generatingPlanReportId = null);
    }
  }

  Future<void> _showRegenerateDialog(DamageReportModel report) async {
    final guidanceController = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        title: const Row(
          children: [
            Icon(Icons.refresh, color: Color(0xFF2563EB), size: 22),
            SizedBox(width: 8),
            Text('Regenerate AI Strategy', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Re-run the 4-agent pipeline for ${report.district} with updated benchmarks or custom guidance:',
                style: const TextStyle(fontSize: 13, color: kTextSecondary)),
            const SizedBox(height: 12),
            TextField(
              controller: guidanceController,
              decoration: const InputDecoration(
                hintText: 'e.g., Prioritize housing repair over public utility restoration; scale budget.',
                border: OutlineInputBorder(),
                isDense: true,
              ),
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2563EB)),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Run Multi-Agent Engine', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      _generatePlanForReport(report, revisionGuidance: guidanceController.text.trim());
    }
  }

  final List<String> _districts = [
    'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle',
    'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle',
    'Kilinochchi', 'Kurunegala', 'Mannar', 'Matale', 'Matara', 'Monaragala',
    'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura',
    'Trincomalee', 'Vavuniya'
  ];

  final List<String> _disasterTypes = [
    'Flood', 'Landslide', 'Tsunami', 'Cyclone', 'Drought', 'Coastal Erosion', 'Other'
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadApprovedIncidents();
    _loadSubmissions();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initializedUser) {
      _initializedUser = true;
      final auth = Provider.of<AuthProvider>(context, listen: false);
      if (auth.user != null) {
        if (_reportedByController.text.isEmpty) {
          _reportedByController.text = auth.user!.fullName;
        }
        if (_reporterContactController.text.isEmpty && auth.user!.phoneNumber != null) {
          _reporterContactController.text = auth.user!.phoneNumber!;
        }
        if (_reporterEmailController.text.isEmpty) {
          _reporterEmailController.text = auth.user!.email;
        }
        if (auth.user!.district != null && _districts.contains(auth.user!.district)) {
          _district = auth.user!.district!;
        }
        if (auth.isOfficerOrAdmin) {
          _reporterType = 'Disaster Officer';
        }
      }
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _otherDisasterController.dispose();
    _incidentDateController.dispose();
    _incidentTimeController.dispose();
    _dsDivisionController.dispose();
    _gnDivisionController.dispose();
    _affectedVillageController.dispose();
    _landmarkController.dispose();
    _displacedFamiliesController.dispose();
    _childrenController.dispose();
    _elderlyController.dispose();
    _disabledController.dispose();
    _pregnantController.dispose();
    _injuredController.dispose();
    _destroyedHousesController.dispose();
    _severeHousesController.dispose();
    _partialHousesController.dispose();
    _notesController.dispose();
    _reportedByController.dispose();
    _reporterContactController.dispose();
    _reporterEmailController.dispose();
    _emergencyContactNameController.dispose();
    _emergencyContactPhoneController.dispose();
    _emergencyContactRelationController.dispose();
    super.dispose();
  }

  int get _totalHousesDamaged {
    final d = int.tryParse(_destroyedHousesController.text.trim()) ?? 0;
    final s = int.tryParse(_severeHousesController.text.trim()) ?? 0;
    final p = int.tryParse(_partialHousesController.text.trim()) ?? 0;
    return d + s + p;
  }

  Future<void> _loadApprovedIncidents() async {
    setState(() => _loadingApprovedIncidents = true);
    try {
      final incidents = await _service.fetchApprovedIncidents();
      if (mounted) {
        setState(() {
          _approvedIncidents = incidents;
          _loadingApprovedIncidents = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingApprovedIncidents = false);
    }
  }

  void _selectIncident(ApprovedIncidentModel incident) {
    setState(() {
      _selectedIncidentId = incident.id;
      _selectedIncident = incident;

      // Disaster type
      final matchingType = _disasterTypes.firstWhere(
        (t) => t.toLowerCase() == incident.disasterType.toLowerCase(),
        orElse: () => 'Other',
      );
      _disasterType = matchingType;
      if (_disasterType == 'Other') {
        _otherDisasterController.text = incident.disasterType;
      }

      // District
      final nearest = incident.nearestDistrict;
      if (_districts.contains(nearest)) {
        _district = nearest;
      }

      // Coordinates / Landmark
      if (incident.latitude != 0.0 || incident.longitude != 0.0) {
        _landmarkController.text = 'GPS: ${incident.latitude.toStringAsFixed(4)}, ${incident.longitude.toStringAsFixed(4)}';
      }

      // Notes
      if (incident.description.isNotEmpty) {
        _notesController.text = '[Incident Ref: #${incident.id.length >= 8 ? incident.id.substring(0, 8).toUpperCase() : incident.id}] ${incident.description}';
      }
    });

    _tabController.animateTo(0);

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle, color: Colors.white, size: 18),
            const SizedBox(width: 8),
            Expanded(
              child: Text('Auto-filled from Incident #${incident.id.length >= 8 ? incident.id.substring(0, 8).toUpperCase() : incident.id} (${incident.disasterType} - ${incident.nearestDistrict})'),
            ),
          ],
        ),
        backgroundColor: const Color(0xFF2563EB),
        duration: const Duration(seconds: 3),
      ),
    );
  }

  void _clearSelectedIncident() {
    setState(() {
      _selectedIncidentId = null;
      _selectedIncident = null;
    });
  }

  Future<void> _loadSubmissions() async {
    setState(() => _loadingSubmissions = true);
    try {
      final reports = await _service.fetchDamageReports();
      if (mounted) {
        setState(() {
          _submissions = reports;
          _loadingSubmissions = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingSubmissions = false);
    }
  }

  String _compileStructuredNotes() {
    final lines = [
      '[Geographic Scope]: District: $_district, DS Division: ${_dsDivisionController.text.trim().isEmpty ? "N/A" : _dsDivisionController.text.trim()}, GN Division: ${_gnDivisionController.text.trim().isEmpty ? "N/A" : _gnDivisionController.text.trim()}, Village: ${_affectedVillageController.text.trim().isEmpty ? "N/A" : _affectedVillageController.text.trim()}, Landmark: ${_landmarkController.text.trim().isEmpty ? "N/A" : _landmarkController.text.trim()}',
      '[Human Impact]: Displaced Families: ${_displacedFamiliesController.text.trim()}',
      '[Vulnerabilities]: Children: ${_childrenController.text.trim().isEmpty ? 0 : _childrenController.text.trim()}, Elderly: ${_elderlyController.text.trim().isEmpty ? 0 : _elderlyController.text.trim()}, Disabled: ${_disabledController.text.trim().isEmpty ? 0 : _disabledController.text.trim()}, Pregnant: ${_pregnantController.text.trim().isEmpty ? 0 : _pregnantController.text.trim()}, Injured: ${_injuredController.text.trim().isEmpty ? 0 : _injuredController.text.trim()}',
      '[Housing Breakdown]: Destroyed: ${_destroyedHousesController.text.trim().isEmpty ? 0 : _destroyedHousesController.text.trim()}, Severe: ${_severeHousesController.text.trim().isEmpty ? 0 : _severeHousesController.text.trim()}, Partial: ${_partialHousesController.text.trim().isEmpty ? 0 : _partialHousesController.text.trim()} (Total Damaged Houses: $_totalHousesDamaged)',
      '[Immediate Relief Needs]: ${_selectedNeeds.isEmpty ? "None specified" : _selectedNeeds.join(", ")}',
      '[Safety & Utilities]: Overall Severity: $_overallSeverity | Risk Level: $_safetyRisk | Power: $_electricityAvailable, Water: $_waterAvailable, Roads: $_roadAccessAvailable, Mobile: $_networkAvailable, Medical: $_medicalAccessAvailable',
      '[Reporter Profile]: Type: $_reporterType, Submitter: ${_reportedByController.text.trim()} (${_reporterContactController.text.trim()}), Email: ${_reporterEmailController.text.trim()} | Emergency Contact: ${_emergencyContactNameController.text.trim()} (${_emergencyContactPhoneController.text.trim()} - ${_emergencyContactRelationController.text.trim()})',
      '[Field Observation Details]: ${_notesController.text.trim()}',
    ];
    return lines.join('\n');
  }

  void _resetForm() {
    _selectedIncidentId = null;
    _selectedIncident = null;
    _dsDivisionController.clear();
    _gnDivisionController.clear();
    _affectedVillageController.clear();
    _landmarkController.clear();
    _displacedFamiliesController.clear();
    _childrenController.clear();
    _elderlyController.clear();
    _disabledController.clear();
    _pregnantController.clear();
    _injuredController.clear();
    _destroyedHousesController.clear();
    _severeHousesController.clear();
    _partialHousesController.clear();
    _notesController.clear();
    _emergencyContactNameController.clear();
    _emergencyContactPhoneController.clear();
    _emergencyContactRelationController.clear();
    _infraItems.clear();
    _selectedNeeds.clear();
    setState(() {});
  }

  void _showAddInfraDialog() {
    String name = '';
    String type = 'Bridge';
    String severity = 'Moderate';
    double cost = 100000;

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              title: const Row(
                children: [
                  Icon(Icons.add_business_outlined, color: Color(0xFF2563EB), size: 22),
                  SizedBox(width: 8),
                  Text('Add Damaged Lifeline',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: kTextPrimary)),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      decoration: const InputDecoration(
                        labelText: 'Asset Name (e.g. Kalu Ganga Bridge)',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                      onChanged: (v) => name = v,
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: type,
                      decoration: const InputDecoration(labelText: 'Asset Type', border: OutlineInputBorder(), isDense: true),
                      items: ['Bridge', 'Road', 'Water', 'Hospital', 'School', 'Power', 'Sanitation', 'Other']
                          .map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                      onChanged: (v) => setDialogState(() => type = v!),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: severity,
                      decoration: const InputDecoration(labelText: 'Damage Level', border: OutlineInputBorder(), isDense: true),
                      items: ['Destroyed', 'Severe', 'Moderate', 'Minor']
                          .map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                      onChanged: (v) => setDialogState(() => severity = v!),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      decoration: const InputDecoration(
                        labelText: 'Estimated Repair Cost (LKR)',
                        border: OutlineInputBorder(),
                        isDense: true,
                      ),
                      keyboardType: TextInputType.number,
                      controller: TextEditingController(text: cost.toStringAsFixed(0)),
                      onChanged: (v) => cost = double.tryParse(v) ?? 100000,
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: () {
                    if (name.trim().isEmpty) return;
                    setState(() {
                      _infraItems.add(InfrastructureDamageItem(
                        assetName: name.trim(),
                        assetType: type,
                        damageLevel: severity,
                        estimatedCost: cost,
                      ));
                    });
                    Navigator.pop(ctx);
                  },
                  child: const Text('Add Asset', style: TextStyle(color: Colors.white)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    _formKey.currentState!.save();

    final disp = int.tryParse(_displacedFamiliesController.text.trim()) ?? 0;
    if (_totalHousesDamaged == 0 && disp == 0 && _infraItems.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please provide non-zero damage impact (damaged houses, displaced families, or damaged infrastructure).'),
          backgroundColor: kDanger,
        ),
      );
      return;
    }

    final notes = _notesController.text.trim();
    if (notes.length < 5) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter detailed field situation notes.'), backgroundColor: kDanger),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final activeDisaster = _disasterType == 'Other' ? _otherDisasterController.text.trim() : _disasterType;
      final compiled = _compileStructuredNotes();

      final newReport = await _service.submitCitizenDamageReport(
        incidentId: _selectedIncidentId,
        district: _district,
        location: _affectedVillageController.text.trim().isNotEmpty
            ? '${_affectedVillageController.text.trim()}, $_district'
            : _district,
        disasterType: activeDisaster,
        housesDamaged: _totalHousesDamaged,
        displacedFamilies: disp,
        reporterName: _reportedByController.text.trim(),
        reporterContact: _reporterContactController.text.trim(),
        additionalNotes: compiled,
        infrastructureDamage: _infraItems.map((i) => DamageIntakeInfrastructureItemModel(
          assetName: i.assetName,
          assetType: i.assetType,
          damageLevel: i.damageLevel,
          estimatedCost: i.estimatedCost,
        )).toList(),
      );

      if (mounted) {
        _resetForm();
        _loadSubmissions();
        _tabController.animateTo(2); // switch to submissions ledger tab

        final auth = Provider.of<AuthProvider>(context, listen: false);
        final isOfficer = auth.isOfficerOrAdmin;

        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            backgroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            title: const Row(
              children: [
                Icon(Icons.check_circle, color: kSuccess, size: 24),
                SizedBox(width: 8),
                Text('Assessment Submitted!',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17, color: kTextPrimary)),
              ],
            ),
            content: Text(
              isOfficer
                  ? 'Your damage assessment has been registered. As an administrator / disaster officer, you can now immediately trigger the 4-agent autonomous recovery strategy to decompose phases, assign NGOs, and approve tasks.'
                  : 'Your disaster damage & impact assessment has been logged into the Aegis-LK national registry. Disaster officers will review your submission and initiate the 4-agent recovery engine.',
              style: const TextStyle(fontSize: 13, color: kTextSecondary),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('View Submissions'),
              ),
              if (isOfficer)
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: () {
                    Navigator.pop(ctx);
                    _generatePlanForReport(newReport);
                  },
                  icon: const Icon(Icons.bolt, size: 16, color: Colors.white),
                  label: const Text('Generate AI Plan Now', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
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
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final isOfficer = auth.isOfficerOrAdmin;
    final userName = (auth.user?.fullName ?? '').trim().toLowerCase();
    final userPhone = (auth.user?.phoneNumber ?? '').trim().replaceAll(RegExp(r'[^0-9]'), '');

    // Filter submissions for citizens vs officers
    final displayedSubmissions = _submissions.where((s) {
      if (isOfficer) return true; // Officers see all submissions
      if (auth.user == null) return false;
      final sName = s.reporterName.trim().toLowerCase();
      final sPhone = s.reporterContact.trim().replaceAll(RegExp(r'[^0-9]'), '');
      if (userName.isNotEmpty && (sName == userName || sName.contains(userName) || userName.contains(sName))) return true;
      if (userPhone.isNotEmpty && sPhone.isNotEmpty && (userPhone.endsWith(sPhone) || sPhone.endsWith(userPhone))) return true;
      return false;
    }).toList();

    return Scaffold(
      backgroundColor: kSurface,
      appBar: widget.showAppBar
          ? AppBar(
              backgroundColor: kNavBg,
              iconTheme: const IconThemeData(color: Colors.white),
              title: const Text('Disaster Damage Assessment',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              bottom: TabBar(
                controller: _tabController,
                indicatorColor: kAccent,
                labelColor: Colors.white,
                unselectedLabelColor: const Color(0xFF94A3B8),
                tabs: [
                  const Tab(icon: Icon(Icons.edit_note), text: 'Field Assessment'),
                  Tab(
                    icon: const Icon(Icons.flash_on),
                    text: 'Incidents Queue (${_approvedIncidents.length})',
                  ),
                  Tab(
                    icon: const Icon(Icons.receipt_long),
                    text: isOfficer
                        ? 'Submissions (${_submissions.length})'
                        : 'My Reports (${displayedSubmissions.length})',
                  ),
                ],
              ),
            )
          : null,
      body: TabBarView(
        controller: _tabController,
        children: [
          // ── TAB 1: FIELD DAMAGE ASSESSMENT FORM ──
          SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Section 0: Live Approved Incidents Queue Selector
                  _buildIncidentQueueSelector(),
                  // Section 1: Geographic Scope
                  _buildSectionCard(
                    title: 'Section 1: Incident & Geographic Location',
                    subtitle: 'Disaster origin, timing, and administrative divisions',
                    children: [
                      DropdownButtonFormField<String>(
                        initialValue: _disasterType,
                        decoration: const InputDecoration(labelText: 'Disaster Type *', border: OutlineInputBorder()),
                        items: _disasterTypes.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                        onChanged: (v) => setState(() => _disasterType = v!),
                      ),
                      if (_disasterType == 'Other') ...[
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _otherDisasterController,
                          decoration: const InputDecoration(labelText: 'Specify Disaster Type *', border: OutlineInputBorder()),
                          validator: (v) => v?.trim().isEmpty == true ? 'Please specify disaster type' : null,
                        ),
                      ],
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        initialValue: _district,
                        decoration: const InputDecoration(labelText: 'District *', border: OutlineInputBorder()),
                        items: _districts.map((d) => DropdownMenuItem(value: d, child: Text(d))).toList(),
                        onChanged: (v) => setState(() => _district = v!),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _dsDivisionController,
                              decoration: const InputDecoration(labelText: 'DS Division', border: OutlineInputBorder()),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextFormField(
                              controller: _gnDivisionController,
                              decoration: const InputDecoration(labelText: 'GN Division', border: OutlineInputBorder()),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _affectedVillageController,
                        decoration: const InputDecoration(labelText: 'Affected Village / Locality', border: OutlineInputBorder()),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Section 2: Human Impact & Vulnerabilities
                  _buildSectionCard(
                    title: 'Section 2: Human Impact & Vulnerabilities',
                    subtitle: 'Displaced families and priority vulnerable demographics',
                    children: [
                      TextFormField(
                        controller: _displacedFamiliesController,
                        decoration: const InputDecoration(
                          labelText: 'Displaced Families Count *',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.family_restroom, color: Color(0xFF2563EB)),
                        ),
                        keyboardType: TextInputType.number,
                        validator: (v) => (int.tryParse(v ?? '') ?? -1) < 0 ? 'Enter valid number' : null,
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _childrenController,
                              decoration: const InputDecoration(labelText: 'Children (<12)', border: OutlineInputBorder()),
                              keyboardType: TextInputType.number,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextFormField(
                              controller: _elderlyController,
                              decoration: const InputDecoration(labelText: 'Elderly (60+)', border: OutlineInputBorder()),
                              keyboardType: TextInputType.number,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _disabledController,
                              decoration: const InputDecoration(labelText: 'Disabled Persons', border: OutlineInputBorder()),
                              keyboardType: TextInputType.number,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextFormField(
                              controller: _pregnantController,
                              decoration: const InputDecoration(labelText: 'Pregnant Women', border: OutlineInputBorder()),
                              keyboardType: TextInputType.number,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Section 3: Housing Damage Severity Breakdown
                  _buildSectionCard(
                    title: 'Section 3: Housing Damage Breakdown',
                    subtitle: 'Categorized structural damage with automatic total calculation',
                    headerTrailing: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(color: const Color(0xFFEFF6FF), borderRadius: BorderRadius.circular(6), border: Border.all(color: const Color(0xFFBFDBFE))),
                      child: Text('Total Damaged: $_totalHousesDamaged', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF1E3A8A))),
                    ),
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _destroyedHousesController,
                              decoration: const InputDecoration(labelText: 'Destroyed (100%)', border: OutlineInputBorder(), hintText: '0'),
                              keyboardType: TextInputType.number,
                              onChanged: (_) => setState(() {}),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: TextFormField(
                              controller: _severeHousesController,
                              decoration: const InputDecoration(labelText: 'Severe Damage', border: OutlineInputBorder(), hintText: '0'),
                              keyboardType: TextInputType.number,
                              onChanged: (_) => setState(() {}),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: TextFormField(
                              controller: _partialHousesController,
                              decoration: const InputDecoration(labelText: 'Partial Damage', border: OutlineInputBorder(), hintText: '0'),
                              keyboardType: TextInputType.number,
                              onChanged: (_) => setState(() {}),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Section 4: Infrastructure Damage Builder
                  _buildSectionCard(
                    title: 'Section 4: Damaged Infrastructure Builder',
                    subtitle: 'Bridges, roads, schools, hospitals, water conduits',
                    children: [
                      if (_infraItems.isEmpty)
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(8), border: Border.all(color: kBorder)),
                          child: const Center(
                            child: Text('No damaged infrastructure assets added yet.', style: TextStyle(color: kTextSecondary, fontSize: 13)),
                          ),
                        )
                      else
                        ..._infraItems.asMap().entries.map((entry) {
                          final i = entry.key;
                          final item = entry.value;
                          return Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8), border: Border.all(color: kBorder)),
                            child: Row(
                              children: [
                                const Icon(Icons.business_outlined, color: Color(0xFF2563EB), size: 20),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(item.assetName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: kTextPrimary)),
                                      Text('${item.assetType} • ${item.damageLevel} • LKR ${item.estimatedCost.toStringAsFixed(0)}', style: const TextStyle(fontSize: 11, color: kTextSecondary)),
                                    ],
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline, color: kDanger, size: 20),
                                  onPressed: () => setState(() => _infraItems.removeAt(i)),
                                ),
                              ],
                            ),
                          );
                        }),
                      const SizedBox(height: 8),
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF2563EB),
                          side: const BorderSide(color: Color(0xFF93C5FD)),
                        ),
                        onPressed: _showAddInfraDialog,
                        icon: const Icon(Icons.add, size: 18),
                        label: const Text('Add Infrastructure Asset'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Section 5: Immediate Relief Needs
                  _buildSectionCard(
                    title: 'Section 5: Immediate Relief Needs',
                    subtitle: 'Select all essential provisions required by victims',
                    children: [
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: _immediateNeedsOptions.map((need) {
                          final isSelected = _selectedNeeds.contains(need);
                          return FilterChip(
                            label: Text(need, style: TextStyle(fontSize: 12, color: isSelected ? Colors.white : kTextPrimary)),
                            selected: isSelected,
                            selectedColor: const Color(0xFF2563EB),
                            backgroundColor: const Color(0xFFF1F5F9),
                            onSelected: (val) {
                              setState(() {
                                if (val) {
                                  _selectedNeeds.add(need);
                                } else {
                                  _selectedNeeds.remove(need);
                                }
                              });
                            },
                          );
                        }).toList(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Section 6: Safety & Utility Access
                  _buildSectionCard(
                    title: 'Section 6: Safety & Utility Access',
                    subtitle: 'Critical infrastructure status and hazards',
                    children: [
                      DropdownButtonFormField<String>(
                        initialValue: _safetyRisk,
                        decoration: const InputDecoration(labelText: 'Risk Level', border: OutlineInputBorder()),
                        items: ['No Immediate Risk', 'Potential Risk', 'High Risk', 'Life Threatening']
                            .map((r) => DropdownMenuItem(value: r, child: Text(r))).toList(),
                        onChanged: (v) => setState(() => _safetyRisk = v!),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              initialValue: _electricityAvailable,
                              decoration: const InputDecoration(labelText: 'Power', border: OutlineInputBorder()),
                              items: ['Yes', 'No', 'Partial'].map((x) => DropdownMenuItem(value: x, child: Text(x))).toList(),
                              onChanged: (v) => setState(() => _electricityAvailable = v!),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              initialValue: _waterAvailable,
                              decoration: const InputDecoration(labelText: 'Clean Water', border: OutlineInputBorder()),
                              items: ['Yes', 'No', 'Partial'].map((x) => DropdownMenuItem(value: x, child: Text(x))).toList(),
                              onChanged: (v) => setState(() => _waterAvailable = v!),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              initialValue: _roadAccessAvailable,
                              decoration: const InputDecoration(labelText: 'Road Access', border: OutlineInputBorder()),
                              items: ['Yes', 'No', 'Partial'].map((x) => DropdownMenuItem(value: x, child: Text(x))).toList(),
                              onChanged: (v) => setState(() => _roadAccessAvailable = v!),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Section 7: Field Observation Notes
                  _buildSectionCard(
                    title: 'Section 7: Field Observation Notes',
                    subtitle: 'Detailed narrative on ground conditions, stranded pockets',
                    children: [
                      TextFormField(
                        controller: _notesController,
                        maxLines: 4,
                        decoration: const InputDecoration(
                          hintText: 'Describe flood surge level, stranded communities, road blocks, vulnerable persons...',
                          border: OutlineInputBorder(),
                        ),
                        validator: (v) => (v?.trim().length ?? 0) < 5 ? 'Please provide detailed field notes (at least 5 characters)' : null,
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Section 8: Submitter Profile
                  _buildSectionCard(
                    title: 'Section 8: Reporter Verification',
                    subtitle: 'Accountability and emergency contact details',
                    children: [
                      TextFormField(
                        controller: _reportedByController,
                        decoration: const InputDecoration(labelText: 'Reporter Full Name *', border: OutlineInputBorder()),
                        validator: (v) => v?.trim().isEmpty == true ? 'Reporter name required' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _reporterContactController,
                        decoration: const InputDecoration(labelText: 'Contact Phone Number *', border: OutlineInputBorder()),
                        keyboardType: TextInputType.phone,
                        validator: (v) => (v?.trim().length ?? 0) < 9 ? 'Valid phone number required' : null,
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Submit Button
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      elevation: 2,
                    ),
                    onPressed: _isSubmitting ? null : _submit,
                    child: _isSubmitting
                        ? const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)),
                              SizedBox(width: 10),
                              Text('Submitting Assessment...', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                            ],
                          )
                        : const Text('Submit Disaster Assessment',
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                  ),
                  const SizedBox(height: 30),
                ],
              ),
            ),
          ),

          // ── TAB 2: APPROVED INCIDENTS QUEUE ──
          _buildApprovedIncidentsQueueTab(),

          // ── TAB 3: MY SUBMISSIONS / CITIZEN SUBMISSIONS ──
          RefreshIndicator(
            onRefresh: _loadSubmissions,
            child: _loadingSubmissions
                ? const Center(child: CircularProgressIndicator())
                : displayedSubmissions.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.inbox_outlined, size: 56, color: Colors.grey[400]),
                              const SizedBox(height: 12),
                              Text(
                                isOfficer ? 'No citizen damage reports found.' : 'You have not submitted any damage assessments yet.',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: kTextPrimary),
                              ),
                              const SizedBox(height: 6),
                              const Text('Submit your first assessment from the Field Assessment tab.', style: TextStyle(color: kTextSecondary, fontSize: 13)),
                            ],
                          ),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: displayedSubmissions.length,
                        itemBuilder: (ctx, i) {
                          final item = displayedSubmissions[i];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        '${item.district} — ${item.disasterType}',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: kTextPrimary),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: item.status == 'PlanGenerated'
                                              ? const Color(0xFFDCFCE7)
                                              : item.status == 'Submitted'
                                                  ? const Color(0xFFEFF6FF)
                                                  : const Color(0xFFFEF3C7),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          item.status,
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                            color: item.status == 'PlanGenerated'
                                                ? const Color(0xFF16A34A)
                                                : item.status == 'Submitted'
                                                    ? const Color(0xFF1D4ED8)
                                                    : const Color(0xFFB45309),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Text('Reported by: ${item.reporterName} • ${item.createdAt.length >= 10 ? item.createdAt.substring(0, 10) : item.createdAt}',
                                      style: const TextStyle(fontSize: 12, color: kTextSecondary)),
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      _buildStatChip(Icons.home, '${item.housesDamaged} Houses'),
                                      const SizedBox(width: 8),
                                      _buildStatChip(Icons.people, '${item.displacedFamilies} Families'),
                                      const SizedBox(width: 8),
                                      _buildStatChip(Icons.domain, '${item.infrastructureDamage.length} Lifelines'),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  // Action Controls
                                  if (item.status == 'PlanGenerated' && item.recoveryPlanId != null) ...[
                                    Wrap(
                                      spacing: 8,
                                      runSpacing: 8,
                                      children: [
                                        ElevatedButton.icon(
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: const Color(0xFF10B981),
                                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                          ),
                                          onPressed: () {
                                            Navigator.push(
                                              context,
                                              MaterialPageRoute(
                                                builder: (_) => RecoveryPlanStatusScreen(
                                                  initialPlanId: item.recoveryPlanId,
                                                ),
                                              ),
                                            );
                                          },
                                          icon: const Icon(Icons.visibility, size: 16, color: Colors.white),
                                          label: const Text('View AI Recovery Plan', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                                        ),
                                        if (isOfficer)
                                          OutlinedButton.icon(
                                            style: OutlinedButton.styleFrom(
                                              foregroundColor: const Color(0xFF2563EB),
                                              side: const BorderSide(color: Color(0xFFBFDBFE)),
                                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                            ),
                                            onPressed: _generatingPlanReportId == item.id
                                                ? null
                                                : () => _showRegenerateDialog(item),
                                            icon: _generatingPlanReportId == item.id
                                                ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                                                : const Icon(Icons.refresh, size: 16),
                                            label: const Text('Regenerate Plan', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                          ),
                                      ],
                                    ),
                                  ] else if (isOfficer) ...[
                                    ElevatedButton.icon(
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFF2563EB),
                                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                      ),
                                      onPressed: _generatingPlanReportId == item.id
                                          ? null
                                          : () => _generatePlanForReport(item),
                                      icon: _generatingPlanReportId == item.id
                                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                          : const Icon(Icons.bolt, size: 16, color: Colors.white),
                                      label: Text(
                                        _generatingPlanReportId == item.id ? 'Synthesizing 4-Agent Strategy...' : '⚡ Generate AI Recovery Plan',
                                        style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                  ] else ...[
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFF8FAFC),
                                        borderRadius: BorderRadius.circular(6),
                                        border: Border.all(color: const Color(0xFFE2E8F0)),
                                      ),
                                      child: const Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(Icons.hourglass_empty, size: 13, color: Color(0xFF64748B)),
                                          SizedBox(width: 6),
                                          Text(
                                            'Submitted • Awaiting Disaster Officer Review & AI Planning',
                                            style: TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildIncidentQueueSelector() {
    if (_selectedIncident != null) {
      final inc = _selectedIncident!;
      return Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFFEFF6FF), Color(0xFFDBEAFE)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFF3B82F6), width: 1.5),
          boxShadow: const [
            BoxShadow(
              color: Color(0x1F3B82F6),
              blurRadius: 8,
              offset: Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: const Color(0xFF2563EB),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.link, color: Colors.white, size: 18),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            'LINKED INCIDENT #${inc.id.length >= 8 ? inc.id.substring(0, 8).toUpperCase() : inc.id}',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                              color: Color(0xFF1E40AF),
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFF10B981),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              inc.status,
                              style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${inc.disasterType} • ${inc.nearestDistrict} (Severity: ${inc.severityReported})',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF1E3A8A)),
                      ),
                    ],
                  ),
                ),
                TextButton.icon(
                  style: TextButton.styleFrom(
                    foregroundColor: const Color(0xFFDC2626),
                    visualDensity: VisualDensity.compact,
                  ),
                  onPressed: _clearSelectedIncident,
                  icon: const Icon(Icons.close, size: 16),
                  label: const Text('Clear', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            if (inc.description.isNotEmpty) ...[
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xD9FFFFFF),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'Incident Description: ${inc.description}',
                  style: const TextStyle(fontSize: 11.5, color: Color(0xFF334155), fontStyle: FontStyle.italic),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ],
        ),
      );
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 1))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.flash_on, color: Color(0xFF2563EB), size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'Approved Incidents Queue (${_approvedIncidents.length})',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: kTextPrimary),
                  ),
                ],
              ),
              IconButton(
                icon: _loadingApprovedIncidents
                    ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.refresh, size: 18, color: Color(0xFF2563EB)),
                tooltip: 'Refresh queue',
                onPressed: _loadingApprovedIncidents ? null : _loadApprovedIncidents,
                visualDensity: VisualDensity.compact,
              ),
            ],
          ),
          const SizedBox(height: 4),
          const Text(
            'Select an approved incident from the incident module to auto-fill details:',
            style: TextStyle(fontSize: 11.5, color: kTextSecondary),
          ),
          const SizedBox(height: 10),
          if (_loadingApprovedIncidents && _approvedIncidents.isEmpty)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(12),
                child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
              ),
            )
          else if (_approvedIncidents.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline, size: 16, color: Color(0xFF64748B)),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'No pending approved incidents in queue. You can fill an independent field assessment below.',
                      style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                    ),
                  ),
                ],
              ),
            )
          else
            SizedBox(
              height: 105,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: _approvedIncidents.length,
                separatorBuilder: (_, __) => const SizedBox(width: 10),
                itemBuilder: (ctx, idx) {
                  final inc = _approvedIncidents[idx];
                  return InkWell(
                    onTap: () => _selectIncident(inc),
                    borderRadius: BorderRadius.circular(10),
                    child: Container(
                      width: 210,
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFCBD5E1)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  inc.disasterType,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF1E293B)),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                decoration: BoxDecoration(
                                  color: inc.severityReported.toLowerCase() == 'critical'
                                      ? const Color(0xFFFEE2E2)
                                      : const Color(0xFFFEF3C7),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  inc.severityReported,
                                  style: TextStyle(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.bold,
                                    color: inc.severityReported.toLowerCase() == 'critical'
                                        ? const Color(0xFFDC2626)
                                        : const Color(0xFFD97706),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          Row(
                            children: [
                              const Icon(Icons.location_on, size: 12, color: Color(0xFF2563EB)),
                              const SizedBox(width: 3),
                              Text(
                                inc.nearestDistrict,
                                style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
                              ),
                            ],
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                '#${inc.id.length >= 6 ? inc.id.substring(0, 6).toUpperCase() : inc.id}',
                                style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8), fontWeight: FontWeight.w500),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF2563EB),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Row(
                                  children: [
                                    Text('Select', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                                    SizedBox(width: 2),
                                    Icon(Icons.arrow_forward_ios, size: 8, color: Colors.white),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildApprovedIncidentsQueueTab() {
    if (_loadingApprovedIncidents && _approvedIncidents.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_approvedIncidents.isEmpty) {
      return RefreshIndicator(
        onRefresh: _loadApprovedIncidents,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const SizedBox(height: 60),
              Icon(Icons.check_circle_outline, size: 64, color: Colors.green[400]),
              const SizedBox(height: 16),
              const Text(
                'No Approved Incidents in Queue',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: kTextPrimary),
              ),
              const SizedBox(height: 8),
              const Text(
                'All approved disaster missions have been addressed or no new incidents have been filed. You can file a direct field damage assessment from the Field Assessment tab.',
                textAlign: TextAlign.center,
                style: TextStyle(color: kTextSecondary, fontSize: 13),
              ),
              const SizedBox(height: 20),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2563EB)),
                onPressed: _loadApprovedIncidents,
                icon: const Icon(Icons.refresh, color: Colors.white, size: 16),
                label: const Text('Refresh Queue', style: TextStyle(color: Colors.white)),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadApprovedIncidents,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _approvedIncidents.length,
        itemBuilder: (ctx, idx) {
          final inc = _approvedIncidents[idx];
          final isSelected = _selectedIncidentId == inc.id;

          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(
                color: isSelected ? const Color(0xFF2563EB) : const Color(0xFFE2E8F0),
                width: isSelected ? 2 : 1,
              ),
            ),
            elevation: isSelected ? 3 : 1,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEFF6FF),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Icon(Icons.warning_amber_rounded, color: Color(0xFF2563EB), size: 20),
                          ),
                          const SizedBox(width: 10),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${inc.disasterType} — ${inc.nearestDistrict}',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: kTextPrimary),
                              ),
                              Text(
                                'Incident #${inc.id.length >= 8 ? inc.id.substring(0, 8).toUpperCase() : inc.id}',
                                style: const TextStyle(fontSize: 11, color: kTextSecondary),
                              ),
                            ],
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFDCFCE7),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          inc.status,
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF16A34A)),
                        ),
                      ),
                    ],
                  ),
                  if (inc.description.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Text(
                      inc.description,
                      style: const TextStyle(fontSize: 13, color: Color(0xFF334155)),
                    ),
                  ],
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      _buildStatChip(Icons.speed, 'Severity: ${inc.severityReported}'),
                      if (inc.latitude != 0 || inc.longitude != 0) ...[
                        const SizedBox(width: 8),
                        _buildStatChip(Icons.pin_drop, '${inc.latitude.toStringAsFixed(3)}, ${inc.longitude.toStringAsFixed(3)}'),
                      ],
                    ],
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: isSelected ? const Color(0xFF10B981) : const Color(0xFF2563EB),
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          onPressed: () => _selectIncident(inc),
                          icon: Icon(isSelected ? Icons.check : Icons.edit_note, size: 18, color: Colors.white),
                          label: Text(
                            isSelected ? 'Selected (Go to Form)' : 'Select & Fill Assessment',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12.5),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildStatChip(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(6)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: kTextSecondary),
          const SizedBox(width: 4),
          Text(label, style: const TextStyle(fontSize: 11, color: kTextSecondary, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  Widget _buildSectionCard({
    required String title,
    required String subtitle,
    required List<Widget> children,
    Widget? headerTrailing,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: kBorder),
        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4, offset: Offset(0, 1))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: kTextPrimary)),
                    const SizedBox(height: 2),
                    Text(subtitle, style: const TextStyle(fontSize: 11, color: kTextSecondary)),
                  ],
                ),
              ),
              if (headerTrailing != null) headerTrailing,
            ],
          ),
          const Divider(height: 20, color: kBorder),
          ...children,
        ],
      ),
    );
  }
}
