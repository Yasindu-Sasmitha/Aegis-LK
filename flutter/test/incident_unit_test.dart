import 'package:flutter_test/flutter_test.dart';
import 'package:aegis_lk/features/incident/models/incident_models.dart';

void main() {
  group('Incident Models Unit Tests', () {
    test('MyIncidentReportModel.fromJson parses complete valid JSON payload', () {
      final json = {
        'id': 'inc-001-uuid',
        'disasterType': 'Flood',
        'description': 'Severe flooding along Kelani River bank',
        'severityReported': 'High',
        'photoUrl': 'https://storage.aegis.lk/photos/flood1.jpg',
        'displayStatus': 'Reported',
        'createdAt': '2026-10-08T10:30:00.000Z',
      };

      final report = MyIncidentReportModel.fromJson(json);

      expect(report.id, 'inc-001-uuid');
      expect(report.disasterType, 'Flood');
      expect(report.description, 'Severe flooding along Kelani River bank');
      expect(report.severityReported, 'High');
      expect(report.photoUrl, 'https://storage.aegis.lk/photos/flood1.jpg');
      expect(report.displayStatus, 'Reported');
      expect(report.isMerged, false);
      expect(report.createdAt.year, 2026);
    });

    test('MyIncidentReportModel.isMerged returns true when status starts with Confirmed', () {
      final json = {
        'id': 'inc-002-uuid',
        'disasterType': 'Landslide',
        'description': 'Minor earth slip near Kandy road',
        'severityReported': 'Medium',
        'photoUrl': null,
        'displayStatus': 'Confirmed (Merged with INC-1024)',
        'createdAt': '2026-10-08T11:00:00.000Z',
      };

      final report = MyIncidentReportModel.fromJson(json);

      expect(report.isMerged, true);
      expect(report.photoUrl, isNull);
    });

    test('MyIncidentReportModel handles missing optional fields gracefully', () {
      final json = {
        'id': 'inc-003-uuid',
        'createdAt': '2026-10-08T12:00:00.000Z',
      };

      final report = MyIncidentReportModel.fromJson(json);

      expect(report.id, 'inc-003-uuid');
      expect(report.disasterType, '');
      expect(report.description, '');
      expect(report.severityReported, '');
      expect(report.displayStatus, 'Reported');
      expect(report.photoUrl, isNull);
      expect(report.isMerged, false);
    });

    test('CreatedIncidentModel.fromJson parses newly generated incident ID', () {
      final json = {'id': 'inc-new-created-999'};
      final created = CreatedIncidentModel.fromJson(json);

      expect(created.id, 'inc-new-created-999');
    });
  });
}
