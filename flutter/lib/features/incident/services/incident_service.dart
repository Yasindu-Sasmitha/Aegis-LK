import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../../../shared/api/api_config.dart';
import '../../../shared/auth/auth_service.dart';
import '../models/incident_models.dart';

class IncidentService {
  final String baseUrl;
  final AuthService _authService;

  IncidentService({
    this.baseUrl = ApiConfig.incidentBase,
    AuthService? authService,
  }) : _authService = authService ?? AuthService();

  /// JSON headers + "Authorization: Bearer <token>" when logged in
  /// (token comes from secure storage via AuthService).
  Future<Map<String, String>> _getAuthHeaders() => _authService.getAuthHeaders();

  Exception _httpError(String action, int status) {
    if (status == 401) {
      return Exception('Please log in again to $action.');
    }
    if (status == 403) {
      return Exception('You do not have permission to $action.');
    }
    return Exception('Failed to $action ($status)');
  }

  /// POST /api/incidents — creates the report. Plausibility + Dedup agents run
  /// in the background; the citizen gets their response immediately.
  Future<CreatedIncidentModel> submitReport({
    required String disasterType,
    required String description,
    required String severityReported,
    required double latitude,
    required double longitude,
    required String reportedByUserId,
  }) async {
    final response = await http.post(
      Uri.parse(baseUrl),
      headers: await _getAuthHeaders(),
      body: jsonEncode({
        'disasterType': disasterType,
        'description': description,
        'severityReported': severityReported,
        'latitude': latitude,
        'longitude': longitude,
        'photoUrl': null,
        'reportedByUserId': reportedByUserId,
      }),
    );
    if (response.statusCode == 201 || response.statusCode == 200) {
      return CreatedIncidentModel.fromJson(jsonDecode(response.body));
    }
    throw _httpError('submit the report', response.statusCode);
  }

  /// POST /api/incidents/{id}/photo — multipart, field name must be "file".
  /// Photo upload requires the incident to already exist, so this is a
  /// separate call made after submitReport succeeds.
  Future<void> uploadPhoto(String incidentId, File file) async {
    final request =
        http.MultipartRequest('POST', Uri.parse('$baseUrl/$incidentId/photo'));
    // Only the Authorization header: multipart sets its own Content-Type,
    // so the JSON Content-Type from _getAuthHeaders() must NOT be copied.
    final headers = await _getAuthHeaders();
    final auth = headers['Authorization'];
    if (auth != null) request.headers['Authorization'] = auth;
    request.files.add(await http.MultipartFile.fromPath('file', file.path));
    final streamed = await request.send();
    if (streamed.statusCode != 200) {
      throw _httpError('upload the photo', streamed.statusCode);
    }
  }

  /// POST /api/incidents/{id}/close — the reporter closes their own incident
  /// once the approved rescue mission has concluded.
  Future<void> closeIncident(String incidentId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/$incidentId/close'),
      headers: await _getAuthHeaders(),
    );
    if (response.statusCode == 200) return;
    if (response.statusCode == 409) {
      throw Exception('This incident can no longer be closed.');
    }
    throw _httpError('close the incident', response.statusCode);
  }

  /// GET /api/incidents/my-reports — citizen's own reports with honest displayStatus.
  Future<List<MyIncidentReportModel>> fetchMyReports(String userId) async {
    final uri = Uri.parse('$baseUrl/my-reports?reportedByUserId=$userId');
    final response = await http.get(uri, headers: await _getAuthHeaders());
    if (response.statusCode == 200) {
      final List data = jsonDecode(response.body) as List;
      return data
          .map((e) => MyIncidentReportModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    throw _httpError('load your reports', response.statusCode);
  }
}