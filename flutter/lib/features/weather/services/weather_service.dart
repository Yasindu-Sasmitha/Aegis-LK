import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../../shared/auth/auth_service.dart';
import '../models/weather_models.dart';

class WeatherService {
  final String baseUrl;
  final AuthService _authService;

  WeatherService({
    this.baseUrl = 'http://localhost:5012/api/weather',
    AuthService? authService,
  }) : _authService = authService ?? AuthService();

  /// Headers that include the JWT Bearer token when the user is logged in.
  /// Uses the persistent secure storage mechanism from AuthService so auth
  /// survives app restarts.
  Future<Map<String, String>> _getAuthHeaders() async {
    return await _authService.getAuthHeaders();
  }

  /// Fetch all 25 Sri Lankan districts
  Future<List<District>> fetchDistricts() async {
    final uri = Uri.parse('$baseUrl/districts');
    final response = await http.get(uri);
    if (response.statusCode == 200) {
      final List decoded = jsonDecode(response.body);
      return decoded
          .map((e) => District.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    throw Exception('Failed to load districts (status ${response.statusCode})');
  }

  /// Fetch live 3-day forecast + historical baseline for a district
  Future<ForecastResponse> fetchForecast(String districtId) async {
    final uri = Uri.parse('$baseUrl/forecast/$districtId');
    final response = await http.get(uri);
    if (response.statusCode == 200) {
      return ForecastResponse.fromJson(jsonDecode(response.body));
    }
    throw Exception(
      'Failed to load forecast for district (status ${response.statusCode})',
    );
  }

  /// Trigger autonomous AI multi-hazard prediction for a district.
  /// Requires DisasterOfficer or Admin role — sends JWT via auth headers.
  Future<PredictResponse> runPrediction(String districtId) async {
    final uri = Uri.parse('$baseUrl/predict/$districtId');
    final headers = await _getAuthHeaders();
    final response = await http.post(
      uri,
      headers: headers,
    );
    if (response.statusCode == 200) {
      return PredictResponse.fromJson(jsonDecode(response.body));
    }
    final errorBody = jsonDecode(response.body);
    throw Exception(
      errorBody['error'] ??
          errorBody['title'] ??
          'Prediction run failed (status ${response.statusCode})',
    );
  }

  /// Fetch weather alerts with optional status, district, and hazardType filters
  Future<List<WeatherAlert>> fetchAlerts({
    String? status,
    String? districtId,
    String? hazardType,
    int page = 1,
    int pageSize = 20,
  }) async {
    final queryParams = <String, String>{
      'page': page.toString(),
      'pageSize': pageSize.toString(),
    };
    if (status != null && status.isNotEmpty) queryParams['status'] = status;
    if (districtId != null && districtId.isNotEmpty) {
      queryParams['districtId'] = districtId;
    }
    if (hazardType != null && hazardType.isNotEmpty) {
      queryParams['hazardType'] = hazardType;
    }

    final uri = Uri.parse('$baseUrl/alerts')
        .replace(queryParameters: queryParams);
    final response = await http.get(uri);
    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      final List items = decoded['items'] ?? [];
      return items
          .map((e) => WeatherAlert.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    throw Exception(
      'Failed to load weather alerts (status ${response.statusCode})',
    );
  }

  /// Review an alert: Approve or Reject.
  /// Requires DisasterOfficer or Admin role — sends JWT via auth headers.
  Future<bool> reviewAlert({
    required String alertId,
    required String decision,
    String? reviewNotes,
  }) async {
    final uri = Uri.parse('$baseUrl/alerts/$alertId/review');
    final headers = await _getAuthHeaders();
    final response = await http.post(
      uri,
      headers: headers,
      body: jsonEncode({
        'decision': decision,
        'reviewNotes': reviewNotes ?? '',
      }),
    );
    return response.statusCode == 200;
  }

  /// Fetch prediction audit trail with optional filtering and sorting
  Future<PredictionsResponse> fetchPredictions({
    String? districtId,
    String? hazardType,
    String? status,
    int page = 1,
    int pageSize = 20,
    String sortBy = 'createdAt',
    String sortOrder = 'desc',
  }) async {
    final queryParams = <String, String>{
      'page': page.toString(),
      'pageSize': pageSize.toString(),
      'sortBy': sortBy,
      'sortOrder': sortOrder,
    };
    if (districtId != null && districtId.isNotEmpty) {
      queryParams['districtId'] = districtId;
    }
    if (hazardType != null && hazardType.isNotEmpty) {
      queryParams['hazardType'] = hazardType;
    }
    if (status != null && status.isNotEmpty) {
      queryParams['status'] = status;
    }

    final uri = Uri.parse('$baseUrl/predictions')
        .replace(queryParameters: queryParams);
    final headers = await _getAuthHeaders();
    final response = await http.get(uri, headers: headers);

    if (response.statusCode == 200) {
      return PredictionsResponse.fromJson(jsonDecode(response.body));
    }
    if (response.statusCode == 401) {
      throw Exception('Authentication required to view predictions.');
    }
    if (response.statusCode == 403) {
      throw Exception('Insufficient permissions to view predictions.');
    }
    throw Exception('Failed to load predictions (status ${response.statusCode})');
  }

  /// Record post-event ground truth outcome for a prediction.
  /// Requires DisasterOfficer or Admin role.
  Future<PredictionOutcomeResponse> recordPredictionOutcome({
    required String predictionId,
    required bool actualDisasterOccurred,
    double? actualValue,
    String? notes,
  }) async {
    final uri = Uri.parse('$baseUrl/predictions/$predictionId/outcome');
    final headers = await _getAuthHeaders();
    final body = jsonEncode(PredictionOutcomeRequest(
      actualDisasterOccurred: actualDisasterOccurred,
      actualValue: actualValue,
      notes: notes,
    ).toJson());

    final response = await http.post(uri, headers: headers, body: body);

    if (response.statusCode == 200) {
      return PredictionOutcomeResponse.fromJson(jsonDecode(response.body));
    }
    if (response.statusCode == 401) {
      throw Exception('Authentication required. Please log in again.');
    }
    if (response.statusCode == 403) {
      throw Exception('Forbidden: Only Disaster Officers and Admins can record outcomes.');
    }
    if (response.statusCode == 404) {
      throw Exception('Prediction not found.');
    }
    if (response.statusCode == 409) {
      throw Exception('An outcome has already been recorded for this prediction.');
    }

    try {
      final decoded = jsonDecode(response.body);
      final errorMsg = decoded['error'] ?? decoded['title'] ?? 'Failed to record outcome.';
      throw Exception('$errorMsg (status ${response.statusCode})');
    } catch (e) {
      if (e is Exception && !e.toString().contains('FormatException')) rethrow;
      throw Exception('Failed to record outcome (status ${response.statusCode})');
    }
  }
}
