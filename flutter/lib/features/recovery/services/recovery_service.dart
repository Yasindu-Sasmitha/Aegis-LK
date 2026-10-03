import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../shared/auth/auth_service.dart';
import '../../../shared/api/api_config.dart';
import '../models/recovery_models.dart';

class RecoveryService {
  final String baseUrl;
  final AuthService _authService;

  RecoveryService({
    this.baseUrl = ApiConfig.recoveryBase,
    AuthService? authService,
  }) : _authService = authService ?? AuthService();

  Future<Map<String, String>> _getAuthHeaders() async {
    return await _authService.getAuthHeaders();
  }

  // ── 1. Shelters ─────────────────────────────────────────────────────────────

  Future<List<ShelterModel>> fetchShelters({String? district}) async {
    final query = (district != null && district.isNotEmpty && district != 'All')
        ? '?district=$district'
        : '';
    final uri = Uri.parse('$baseUrl/shelters$query');
    final headers = await _getAuthHeaders();
    final response = await http.get(uri, headers: headers);
    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      final List data = decoded is List ? decoded : (decoded['items'] ?? []);
      return data.map((e) => ShelterModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw Exception('Failed to load shelters');
  }

  Future<ShelterModel> createShelter({
    required String name,
    required String district,
    required String location,
    required int capacity,
    required String contactPerson,
    required String contactPhone,
    required List<String> facilities,
    double? latitude,
    double? longitude,
  }) async {
    final headers = await _getAuthHeaders();
    final response = await http.post(
      Uri.parse('$baseUrl/shelters'),
      headers: headers,
      body: jsonEncode({
        'name': name,
        'district': district,
        'location': location,
        'capacity': capacity,
        'currentOccupancy': 0,
        'status': 'Open',
        'contactPerson': contactPerson,
        'contactPhone': contactPhone,
        'facilities': facilities,
        'latitude': latitude,
        'longitude': longitude,
      }),
    );
    if (response.statusCode == 201 || response.statusCode == 200) {
      return ShelterModel.fromJson(jsonDecode(response.body));
    }
    final err = jsonDecode(response.body);
    throw Exception(err['error'] ?? 'Failed to create shelter');
  }

  // ── 2. Aid Requests ─────────────────────────────────────────────────────────

  Future<AidRequestModel> submitAidRequest({
    required String victimName,
    required String contactPhone,
    required String district,
    required String aidType,
    required int familySize,
    required String urgency,
    String? shelterId,
    required String notes,
  }) async {
    final headers = await _getAuthHeaders();
    final response = await http.post(
      Uri.parse('$baseUrl/aid-requests'),
      headers: headers,
      body: jsonEncode({
        'victimName': victimName,
        'contactPhone': contactPhone,
        'district': district,
        'aidType': aidType,
        'familySize': familySize,
        'urgency': urgency,
        'shelterId': shelterId,
        'notes': notes,
      }),
    );
    if (response.statusCode == 201 || response.statusCode == 200) {
      return AidRequestModel.fromJson(jsonDecode(response.body));
    }
    final err = jsonDecode(response.body);
    throw Exception(err['error'] ?? 'Failed to submit aid request');
  }

  Future<List<AidRequestModel>> fetchMyAidRequests() async {
    final headers = await _getAuthHeaders();
    final response = await http.get(Uri.parse('$baseUrl/aid-requests'), headers: headers);
    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      final List data = decoded is List ? decoded : (decoded['items'] ?? []);
      return data.map((e) => AidRequestModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw Exception('Failed to load aid requests');
  }

  // ── 3. Donations ────────────────────────────────────────────────────────────

  Future<bool> submitDonation({
    required String donorName,
    required String donorContact,
    required String donationType,
    required double amountOrQuantity,
    required String itemDescription,
    String? targetShelterId,
  }) async {
    final headers = await _getAuthHeaders();
    final response = await http.post(
      Uri.parse('$baseUrl/donations'),
      headers: headers,
      body: jsonEncode({
        'donorName': donorName,
        'donorContact': donorContact,
        'donationType': donationType,
        'amountOrQuantity': amountOrQuantity,
        'itemDescription': itemDescription,
        'targetShelterId': targetShelterId,
      }),
    );
    return response.statusCode == 201 || response.statusCode == 200;
  }

  Future<List<DonationModel>> fetchDonations() async {
    final headers = await _getAuthHeaders();
    final response = await http.get(Uri.parse('$baseUrl/donations'), headers: headers);
    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      final List data = decoded is List ? decoded : (decoded['items'] ?? []);
      return data.map((e) => DonationModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw Exception('Failed to load donations');
  }

  // ── 4. Compensations ────────────────────────────────────────────────────────

  Future<CompensationModel> submitCompensationClaim({
    required String applicantName,
    required String applicantNIC,
    required String contactPhone,
    required String district,
    required String damageCategory,
    required double claimAmount,
    required String bankDetails,
    String? description,
  }) async {
    final headers = await _getAuthHeaders();
    final response = await http.post(
      Uri.parse('$baseUrl/compensations'),
      headers: headers,
      body: jsonEncode({
        'applicantName': applicantName,
        'applicantNIC': applicantNIC,
        'contactPhone': contactPhone,
        'district': district,
        'damageCategory': damageCategory,
        'claimAmount': claimAmount,
        'bankDetails': bankDetails,
        'description': description ?? '',
      }),
    );
    if (response.statusCode == 201 || response.statusCode == 200) {
      return CompensationModel.fromJson(jsonDecode(response.body));
    }
    final err = jsonDecode(response.body);
    throw Exception(err['error'] ?? 'Failed to submit compensation claim');
  }

  Future<List<CompensationModel>> fetchCompensations() async {
    final headers = await _getAuthHeaders();
    final response = await http.get(Uri.parse('$baseUrl/compensations'), headers: headers);
    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      final List data = decoded is List ? decoded : (decoded['items'] ?? []);
      return data.map((e) => CompensationModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw Exception('Failed to load compensation records');
  }

  // ── 5. Autonomous Multi-Agent Workflows & Damage Intake ─────────────────────

  Future<RecoveryPlanModel> submitDamageIntake(
    DamageIntakeModel intake, {
    String? incidentId,
    String? damageReportId,
    String? revisionGuidance,
  }) async {
    final headers = await _getAuthHeaders();
    final Map<String, dynamic> payload = {
      'directDamageIntake': intake.toJson(),
    };
    if (incidentId != null && incidentId.isNotEmpty) {
      payload['incidentId'] = incidentId;
    }
    if (damageReportId != null && damageReportId.isNotEmpty) {
      payload['damageReportId'] = damageReportId;
    }
    if (revisionGuidance != null && revisionGuidance.isNotEmpty) {
      payload['revisionGuidance'] = revisionGuidance;
    }
    final response = await http.post(
      Uri.parse('$baseUrl/workflows/start'),
      headers: headers,
      body: jsonEncode(payload),
    );
    if (response.statusCode == 200 || response.statusCode == 201) {
      return RecoveryPlanModel.fromJson(jsonDecode(response.body));
    }
    final err = jsonDecode(response.body);
    throw Exception(err['error'] ?? err['detail'] ?? 'Failed to submit damage report');
  }

  Future<List<RecoveryPlanModel>> fetchRecoveryPlans({String? status}) async {
    final query = (status != null && status.isNotEmpty && status != 'all')
        ? '?status=$status'
        : '';
    final headers = await _getAuthHeaders();
    final response = await http.get(Uri.parse('$baseUrl/workflows$query'), headers: headers);
    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      final List data = decoded is List ? decoded : (decoded['items'] ?? []);
      return data.map((e) => RecoveryPlanModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw Exception('Failed to load recovery workflows');
  }

  Future<RecoveryPlanModel> fetchRecoveryPlanDetail(String planId) async {
    final headers = await _getAuthHeaders();
    final response = await http.get(Uri.parse('$baseUrl/workflows/$planId'), headers: headers);
    if (response.statusCode == 200) {
      return RecoveryPlanModel.fromJson(jsonDecode(response.body));
    }
    throw Exception('Failed to load recovery plan detail');
  }

  Future<WorkflowTraceModel> fetchWorkflowTrace(String planId) async {
    final headers = await _getAuthHeaders();
    final response = await http.get(Uri.parse('$baseUrl/workflows/$planId/trace'), headers: headers);
    if (response.statusCode == 200) {
      return WorkflowTraceModel.fromJson(jsonDecode(response.body));
    }
    throw Exception('Failed to load workflow reasoning trace');
  }

  Future<RecoveryPlanModel> submitWorkflowDecision(
    String planId,
    String action, {
    String? reviewerNotes,
    String? reviewedBy,
  }) async {
    final headers = await _getAuthHeaders();
    final response = await http.post(
      Uri.parse('$baseUrl/workflows/$planId/approve'),
      headers: headers,
      body: jsonEncode({
        'action': action,
        'reviewerNotes': reviewerNotes,
        'reviewedBy': reviewedBy ?? 'DMC Officer',
      }),
    );
    if (response.statusCode == 200) {
      return RecoveryPlanModel.fromJson(jsonDecode(response.body));
    }
    final err = jsonDecode(response.body);
    throw Exception(err['error'] ?? 'Failed to submit officer decision');
  }

  // ── 6. Reports ──────────────────────────────────────────────────────────────

  Future<List<RecoveryReportModel>> fetchReports() async {
    final headers = await _getAuthHeaders();
    final response = await http.get(Uri.parse('$baseUrl/reports'), headers: headers);
    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      final List data = decoded is List ? decoded : (decoded['items'] ?? []);
      return data.map((e) => RecoveryReportModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw Exception('Failed to load recovery reports');
  }

  // ── 7. Citizen Disaster Damage Intake ───────────────────────────────────────

  Future<List<DamageReportModel>> fetchDamageReports({String? status, String? district}) async {
    final params = <String>[];
    if (status != null && status.isNotEmpty && status != 'all') params.add('status=$status');
    if (district != null && district.isNotEmpty && district != 'all') params.add('district=$district');
    final query = params.isNotEmpty ? '?${params.join('&')}' : '';
    final headers = await _getAuthHeaders();
    final response = await http.get(Uri.parse('$baseUrl/damage-reports$query'), headers: headers);
    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      final List data = decoded is List ? decoded : (decoded['items'] ?? []);
      return data.map((e) => DamageReportModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw Exception('Failed to load citizen damage reports');
  }

  Future<DamageReportModel> submitCitizenDamageReport({
    String? incidentId,
    required String district,
    required String location,
    required String disasterType,
    required int housesDamaged,
    required int displacedFamilies,
    required String reporterName,
    required String reporterContact,
    required String additionalNotes,
    List<DamageIntakeInfrastructureItemModel>? infrastructureDamage,
  }) async {
    final headers = await _getAuthHeaders();
    final Map<String, dynamic> payload = {
      'district': district,
      'location': location,
      'disasterType': disasterType,
      'housesDamaged': housesDamaged,
      'displacedFamilies': displacedFamilies,
      'reporterName': reporterName,
      'reporterContact': reporterContact,
      'additionalNotes': additionalNotes,
      'infrastructureDamage': infrastructureDamage?.map((e) => e.toJson()).toList() ?? [],
    };
    if (incidentId != null && incidentId.isNotEmpty) {
      payload['incidentId'] = incidentId;
    }

    final response = await http.post(
      Uri.parse('$baseUrl/damage-reports'),
      headers: headers,
      body: jsonEncode(payload),
    );
    if (response.statusCode == 200 || response.statusCode == 201) {
      return DamageReportModel.fromJson(jsonDecode(response.body));
    }
    final err = jsonDecode(response.body);
    throw Exception(err['error'] ?? 'Failed to submit citizen damage report');
  }

  // ── 8. Incident Module Integration Queue ────────────────────────────────────

  Future<List<ApprovedIncidentModel>> fetchApprovedIncidents() async {
    try {
      final uri = Uri.parse('${ApiConfig.incidentBase}?pageSize=50');
      final headers = await _getAuthHeaders();
      final response = await http.get(uri, headers: headers);
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        final List data = decoded is List ? decoded : (decoded['items'] ?? []);
        final list = data.map((e) => ApprovedIncidentModel.fromJson(e as Map<String, dynamic>)).toList();
        return list.where((i) {
          final s = i.status.toLowerCase();
          return s == 'missionapproved' || s == 'closed' || s == 'assessed' || s == 'approved' || s == 'reported';
        }).toList();
      }
    } catch (_) {}
    return [];
  }
}


