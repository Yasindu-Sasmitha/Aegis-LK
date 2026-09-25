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
  String _overallSeverity = 'Moderate';
  String _safetyRisk = 'Potential Risk';
  String _electricityAvailable = 'Yes';
  String _waterAvailable = 'Yes';
  String _roadAccessAvailable = 'Yes';
  String _networkAvailable = 'Yes';
  String _medicalAccessAvailable = 'Yes';

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

  // Submissions list state
  List<DamageReportModel> _submissions = [];
  bool _loadingSubmissions = false;

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
    _tabController = TabController(length: 2, vsync: this);
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
                      value: type,
                      decoration: const InputDecoration(labelText: 'Asset Type', border: OutlineInputBorder(), isDense: true),
                      items: ['Bridge', 'Road', 'Water', 'Hospital', 'School', 'Power', 'Sanitation', 'Other']
                          .map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                      onChanged: (v) => setDialogState(() => type = v!),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      value: severity,
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

      await _service.submitCitizenDamageReport(
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
        _tabController.animateTo(1); // switch to submissions ledger tab
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
            content: const Text(
              'Your disaster damage & impact assessment has been logged into the Aegis-LK national registry. Disaster officers will review your submission and initiate the 4-agent recovery engine.',
              style: TextStyle(fontSize: 13, color: kTextSecondary),
            ),
            actions: [
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2563EB)),
                onPressed: () => Navigator.pop(ctx),
                child: const Text('View Submissions', style: TextStyle(color: Colors.white)),
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
                    icon: const Icon(Icons.receipt_long),
                    text: isOfficer
                        ? 'Citizen Submissions (${_submissions.length})'
                        : 'My Submissions (${displayedSubmissions.length})',
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
                  // Section 1: Geographic Scope
                  _buildSectionCard(
                    title: 'Section 1: Incident & Geographic Location',
                    subtitle: 'Disaster origin, timing, and administrative divisions',
                    children: [
                      DropdownButtonFormField<String>(
                        value: _disasterType,
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
                        value: _district,
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
                        value: _safetyRisk,
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
                              value: _electricityAvailable,
                              decoration: const InputDecoration(labelText: 'Power', border: OutlineInputBorder()),
                              items: ['Yes', 'No', 'Partial'].map((x) => DropdownMenuItem(value: x, child: Text(x))).toList(),
                              onChanged: (v) => setState(() => _electricityAvailable = v!),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              value: _waterAvailable,
                              decoration: const InputDecoration(labelText: 'Clean Water', border: OutlineInputBorder()),
                              items: ['Yes', 'No', 'Partial'].map((x) => DropdownMenuItem(value: x, child: Text(x))).toList(),
                              onChanged: (v) => setState(() => _waterAvailable = v!),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              value: _roadAccessAvailable,
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

          // ── TAB 2: MY SUBMISSIONS / CITIZEN SUBMISSIONS ──
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
                                  if (item.status == 'PlanGenerated' && item.recoveryPlanId != null) ...[
                                    const SizedBox(height: 10),
                                    ElevatedButton.icon(
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFF10B981),
                                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
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
                                      label: const Text('View AI Recovery Plan', style: TextStyle(color: Colors.white, fontSize: 12)),
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
