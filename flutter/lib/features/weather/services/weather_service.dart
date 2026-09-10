import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/weather_models.dart';

class WeatherService {
  final String baseUrl;

  WeatherService({this.baseUrl = 'http://localhost:5000/api/weather'});

  /// Fetch all 25 Sri Lankan districts
  Future<List<District>> fetchDistricts() async {
    final uri = Uri.parse('$baseUrl/districts');
    final response = await http.get(uri);
    if (response.statusCode == 200) {
      final List decoded = jsonDecode(response.body);
      return decoded.map((e) => District.fromJson(e as Map<String, dynamic>)).toList();
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
    throw Exception('Failed to load forecast for district (status ${response.statusCode})');
  }

  /// Trigger autonomous AI multi-hazard prediction for a district
  Future<PredictResponse> runPrediction(String districtId) async {
    final uri = Uri.parse('$baseUrl/predict/$districtId');
    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
    );
    if (response.statusCode == 200) {
      return PredictResponse.fromJson(jsonDecode(response.body));
    }
    final errorBody = jsonDecode(response.body);
    throw Exception(errorBody['error'] ?? 'Prediction run failed (status ${response.statusCode})');
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
    if (districtId != null && districtId.isNotEmpty) queryParams['districtId'] = districtId;
    if (hazardType != null && hazardType.isNotEmpty) queryParams['hazardType'] = hazardType;

    final uri = Uri.parse('$baseUrl/alerts').replace(queryParameters: queryParams);
    final response = await http.get(uri);
    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      final List items = decoded['items'] ?? [];
      return items.map((e) => WeatherAlert.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw Exception('Failed to load weather alerts (status ${response.statusCode})');
  }

  /// Review an alert: Approve or Reject
  Future<bool> reviewAlert({
    required String alertId,
    required String decision,
    String? reviewNotes,
  }) async {
    final uri = Uri.parse('$baseUrl/alerts/$alertId/review');
    final response = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'decision': decision,
        'reviewNotes': reviewNotes ?? '',
      }),
    );
    return response.statusCode == 200;
  }
}
