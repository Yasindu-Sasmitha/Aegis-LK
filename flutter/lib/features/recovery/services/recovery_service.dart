import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/recovery_models.dart';

class RecoveryService {
  final String baseUrl;

  RecoveryService({this.baseUrl = 'http://localhost:5012/api/recovery'});

  // ── 1. Shelters ─────────────────────────────────────────────────────────────

  Future<List<ShelterModel>> fetchShelters({String? district}) async {
    final query = (district != null && district.isNotEmpty && district != 'All')
        ? '?district=$district'
        : '';
    final uri = Uri.parse('$baseUrl/shelters$query');
    final response = await http.get(uri);
    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      final List data = decoded is List ? decoded : (decoded['items'] ?? []);
      return data.map((e) => ShelterModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw Exception('Failed to load shelters');
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
    final response = await http.post(
      Uri.parse('$baseUrl/aid-requests'),
      headers: {'Content-Type': 'application/json'},
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
    final response = await http.get(Uri.parse('$baseUrl/aid-requests'));
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
    final response = await http.post(
      Uri.parse('$baseUrl/donations'),
      headers: {'Content-Type': 'application/json'},
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
    final response = await http.get(Uri.parse('$baseUrl/donations'));
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
    final response = await http.post(
      Uri.parse('$baseUrl/compensations'),
      headers: {'Content-Type': 'application/json'},
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
    final response = await http.get(Uri.parse('$baseUrl/compensations'));
    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      final List data = decoded is List ? decoded : (decoded['items'] ?? []);
      return data.map((e) => CompensationModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw Exception('Failed to load compensation records');
  }

  // ── 5. Autonomous Multi-Agent Workflows & Damage Intake ─────────────────────

  Future<RecoveryPlanModel> submitDamageIntake(DamageIntakeModel intake) async {
    final response = await http.post(
      Uri.parse('$baseUrl/workflows/start'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'directDamageIntake': intake.toJson(),
      }),
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
    final response = await http.get(Uri.parse('$baseUrl/workflows$query'));
    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      final List data = decoded is List ? decoded : (decoded['items'] ?? []);
      return data.map((e) => RecoveryPlanModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw Exception('Failed to load recovery workflows');
  }

  Future<RecoveryPlanModel> fetchRecoveryPlanDetail(String planId) async {
    final response = await http.get(Uri.parse('$baseUrl/workflows/$planId'));
    if (response.statusCode == 200) {
      return RecoveryPlanModel.fromJson(jsonDecode(response.body));
    }
    throw Exception('Failed to load recovery plan detail');
  }

  Future<WorkflowTraceModel> fetchWorkflowTrace(String planId) async {
    final response = await http.get(Uri.parse('$baseUrl/workflows/$planId/trace'));
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
    final response = await http.post(
      Uri.parse('$baseUrl/workflows/$planId/approve'),
      headers: {'Content-Type': 'application/json'},
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
    final response = await http.get(Uri.parse('$baseUrl/reports'));
    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      final List data = decoded is List ? decoded : (decoded['items'] ?? []);
      return data.map((e) => RecoveryReportModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw Exception('Failed to load recovery reports');
  }
}
