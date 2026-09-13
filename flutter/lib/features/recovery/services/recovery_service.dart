import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/recovery_models.dart';

class RecoveryService {
  final String baseUrl;

  RecoveryService({this.baseUrl = 'http://localhost:5000/api/recovery'});

  Future<List<ShelterModel>> fetchShelters({String? district}) async {
    final uri = Uri.parse('$baseUrl/shelters${district != null ? '?district=$district' : ''}');
    final response = await http.get(uri);
    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      final List data = decoded is List ? decoded : (decoded['items'] ?? []);
      return data.map((e) => ShelterModel.fromJson(e)).toList();
    }
    throw Exception('Failed to load shelters');
  }

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
    if (response.statusCode == 201) {
      return AidRequestModel.fromJson(jsonDecode(response.body));
    }
    throw Exception(jsonDecode(response.body)['error'] ?? 'Failed to submit aid request');
  }

  Future<List<AidRequestModel>> fetchMyAidRequests() async {
    final response = await http.get(Uri.parse('$baseUrl/aid-requests'));
    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      final List data = decoded is List ? decoded : (decoded['items'] ?? []);
      return data.map((e) => AidRequestModel.fromJson(e)).toList();
    }
    throw Exception('Failed to load aid requests');
  }

  Future<bool> submitDonation({
    required String donorName,
    required String donorContact,
    required String donationType,
    required double amountOrQuantity,
    required String itemDescription,
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
      }),
    );
    return response.statusCode == 201;
  }

  Future<Map<String, dynamic>> submitDamageIntake(DamageIntakeModel intake) async {
    final response = await http.post(
      Uri.parse('$baseUrl/intake-damage'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(intake.toJson()),
    );
    if (response.statusCode == 200 || response.statusCode == 201) {
      return jsonDecode(response.body);
    }
    throw Exception(jsonDecode(response.body)['error'] ?? 'Failed to submit damage report');
  }
}
