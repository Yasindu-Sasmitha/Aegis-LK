import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../models/incident_models.dart';

class IncidentService {
  final String baseUrl;

  IncidentService({this.baseUrl = 'http://localhost:5012/api/incidents'});

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
      headers: {'Content-Type': 'application/json'},
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
    throw Exception('Failed to submit report (${response.statusCode})');
  }

  /// POST /api/incidents/{id}/photo — multipart, field name must be "file".
  /// Photo upload requires the incident to already exist, so this is a
  /// separate call made after submitReport succeeds.
  Future<void> uploadPhoto(String incidentId, File file) async {
    final request = http.MultipartRequest('POST', Uri.parse('$baseUrl/$incidentId/photo'));
    request.files.add(await http.MultipartFile.fromPath('file', file.path));
    final streamed = await request.send();
    if (streamed.statusCode != 200) {
      throw Exception('Photo upload failed (${streamed.statusCode})');
    }
  }

  /// GET /api/incidents/my-reports — citizen's own reports with honest displayStatus.
  Future<List<MyIncidentReportModel>> fetchMyReports(String userId) async {
    final uri = Uri.parse('$baseUrl/my-reports?reportedByUserId=$userId');
    final response = await http.get(uri);
    if (response.statusCode == 200) {
      final List data = jsonDecode(response.body) as List;
      return data.map((e) => MyIncidentReportModel.fromJson(e as Map<String, dynamic>)).toList();
    }
    throw Exception('Failed to load reports (${response.statusCode})');
  }
}