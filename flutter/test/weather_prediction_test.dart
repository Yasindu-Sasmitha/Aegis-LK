import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:aegis_lk/features/weather/models/weather_models.dart';
import 'package:aegis_lk/features/weather/screens/prediction_history_screen.dart';
import 'package:aegis_lk/features/weather/services/weather_service.dart';
import 'package:aegis_lk/shared/auth/auth_models.dart';
import 'package:aegis_lk/shared/auth/auth_service.dart';

class FakeWeatherService extends WeatherService {
  final List<PredictionItem> stubPredictions;
  final List<District> stubDistricts;

  FakeWeatherService({
    required this.stubPredictions,
    this.stubDistricts = const [],
  });

  @override
  Future<List<District>> fetchDistricts() async => stubDistricts;

  @override
  Future<PredictionsResponse> fetchPredictions({
    String? districtId,
    String? hazardType,
    String? status,
    int page = 1,
    int pageSize = 20,
    String sortBy = 'createdAt',
    String sortOrder = 'desc',
  }) async {
    return PredictionsResponse(
      total: stubPredictions.length,
      page: page,
      pageSize: pageSize,
      items: stubPredictions,
    );
  }

  @override
  Future<PredictionOutcomeResponse> recordPredictionOutcome({
    required String predictionId,
    required bool actualDisasterOccurred,
    double? actualValue,
    String? notes,
  }) async {
    return PredictionOutcomeResponse(
      id: 'outcome-123',
      predictionId: predictionId,
      actualDisasterOccurred: actualDisasterOccurred,
      actualValue: actualValue,
      confirmedByUserId: 'user-123',
      confirmedAt: '2026-09-26T20:00:00Z',
      notes: notes,
    );
  }
}

void main() {
  setUp(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
      const MethodChannel('plugins.it_nomads.com/flutter_secure_storage'),
      (MethodCall call) async => null,
    );
  });

  tearDown(() {
    AuthService.currentUser = null;
    AuthService.currentToken = null;
  });

  group('Weather Prediction Models', () {
    test('PredictionItem parses correctly with pending outcome', () {
      final json = {
        'id': 'pred-001',
        'districtId': 'dist-001',
        'districtName': 'Ratnapura',
        'agentRunId': 'run-001',
        'hazardType': 'Flood',
        'riskProbabilityPct': 85.0,
        'confidencePct': 90.0,
        'forecastValue': 142.5,
        'historicalThreshold': 100.0,
        'unit': 'mm',
        'status': 'Completed',
        'createdAt': '2026-09-26T12:00:00Z',
        'hasOutcome': false,
        'actualDisasterOccurred': null,
        'actualValue': null,
        'confirmedByUserId': null,
        'outcomeConfirmedAt': null,
        'outcomeNotes': null,
      };

      final item = PredictionItem.fromJson(json);

      expect(item.id, 'pred-001');
      expect(item.districtName, 'Ratnapura');
      expect(item.hazardType, 'Flood');
      expect(item.riskProbabilityPct, 85.0);
      expect(item.confidencePct, 90.0);
      expect(item.forecastValue, 142.5);
      expect(item.historicalThreshold, 100.0);
      expect(item.unit, 'mm');
      expect(item.status, 'Completed');
      expect(item.hasOutcome, false);
      expect(item.actualDisasterOccurred, isNull);
      expect(item.actualValue, isNull);
      expect(item.confirmedByUserId, isNull);
      expect(item.outcomeNotes, isNull);
    });

    test('PredictionItem parses correctly with recorded outcome', () {
      final json = {
        'id': 'pred-002',
        'districtId': 'dist-002',
        'districtName': 'Kalutara',
        'agentRunId': 'run-002',
        'hazardType': 'Landslide',
        'riskProbabilityPct': 75.0,
        'confidencePct': 82.0,
        'forecastValue': 110.0,
        'historicalThreshold': 95.0,
        'unit': 'mm',
        'status': 'Completed',
        'createdAt': '2026-09-26T10:00:00Z',
        'hasOutcome': true,
        'actualDisasterOccurred': true,
        'actualValue': 125.0,
        'confirmedByUserId': 'user-officer-1',
        'outcomeConfirmedAt': '2026-09-26T18:00:00Z',
        'outcomeNotes': 'Confirmed by NBRO landslide unit',
      };

      final item = PredictionItem.fromJson(json);

      expect(item.id, 'pred-002');
      expect(item.hasOutcome, true);
      expect(item.actualDisasterOccurred, true);
      expect(item.actualValue, 125.0);
      expect(item.confirmedByUserId, 'user-officer-1');
      expect(item.outcomeNotes, 'Confirmed by NBRO landslide unit');
    });

    test('PredictionsResponse parses list and pagination', () {
      final json = {
        'total': 1,
        'page': 1,
        'pageSize': 20,
        'items': [
          {
            'id': 'pred-001',
            'districtId': 'dist-001',
            'agentRunId': 'run-001',
            'hazardType': 'Flood',
            'riskProbabilityPct': 80.0,
            'confidencePct': 85.0,
            'forecastValue': 120.0,
            'historicalThreshold': 100.0,
            'createdAt': '2026-09-26T12:00:00Z',
            'hasOutcome': false,
          }
        ]
      };

      final res = PredictionsResponse.fromJson(json);

      expect(res.total, 1);
      expect(res.page, 1);
      expect(res.pageSize, 20);
      expect(res.items.length, 1);
      expect(res.items.first.id, 'pred-001');
    });

    test('PredictionOutcomeRequest serializes to expected JSON', () {
      const req = PredictionOutcomeRequest(
        actualDisasterOccurred: true,
        actualValue: 138.5,
        notes: 'Confirmed by DDMCU report',
      );

      final json = req.toJson();

      expect(json['actualDisasterOccurred'], true);
      expect(json['actualValue'], 138.5);
      expect(json['notes'], 'Confirmed by DDMCU report');
    });

    test('PredictionOutcomeResponse parses outcome from backend JSON', () {
      final json = {
        'id': 'outcome-99',
        'predictionId': 'pred-99',
        'actualDisasterOccurred': false,
        'actualValue': 45.0,
        'confirmedByUserId': 'user-100',
        'confirmedAt': '2026-09-26T19:00:00Z',
        'notes': 'No flooding observed',
      };

      final res = PredictionOutcomeResponse.fromJson(json);

      expect(res.id, 'outcome-99');
      expect(res.predictionId, 'pred-99');
      expect(res.actualDisasterOccurred, false);
      expect(res.actualValue, 45.0);
      expect(res.confirmedByUserId, 'user-100');
      expect(res.notes, 'No flooding observed');
    });
  });

  group('PredictionHistoryScreen Widget Tests', () {
    const pendingPrediction = PredictionItem(
      id: 'p-pending',
      districtId: 'd-1',
      districtName: 'Galle',
      agentRunId: 'run-1',
      hazardType: 'Flood',
      riskProbabilityPct: 80.0,
      confidencePct: 85.0,
      forecastValue: 120.0,
      historicalThreshold: 90.0,
      unit: 'mm',
      status: 'Completed',
      createdAt: '2026-09-26T14:30:00Z',
      hasOutcome: false,
    );

    const confirmedPrediction = PredictionItem(
      id: 'p-confirmed',
      districtId: 'd-2',
      districtName: 'Matara',
      agentRunId: 'run-2',
      hazardType: 'Landslide',
      riskProbabilityPct: 65.0,
      confidencePct: 78.0,
      forecastValue: 95.0,
      historicalThreshold: 85.0,
      unit: 'mm',
      status: 'Completed',
      createdAt: '2026-09-26T11:00:00Z',
      hasOutcome: true,
      actualDisasterOccurred: true,
      actualValue: 102.4,
      outcomeNotes: 'Minor slope failure reported',
    );

    testWidgets('Renders pending ground truth badge when outcome is false',
        (tester) async {
      final service = FakeWeatherService(stubPredictions: [pendingPrediction]);

      await tester.pumpWidget(
        MaterialApp(
          home: PredictionHistoryScreen(weatherService: service),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Galle'), findsOneWidget);
      expect(find.text('Pending Ground Truth'), findsWidgets);
    });

    testWidgets('Renders recorded outcome badge and actual value when outcome exists',
        (tester) async {
      final service = FakeWeatherService(stubPredictions: [confirmedPrediction]);

      await tester.pumpWidget(
        MaterialApp(
          home: PredictionHistoryScreen(weatherService: service),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Matara'), findsOneWidget);
      expect(find.text('Disaster Occurred'), findsOneWidget);
      expect(find.textContaining('102.4 mm'), findsOneWidget);
      expect(find.textContaining('Minor slope failure reported'), findsOneWidget);
    });

    testWidgets('Officer sees Confirm Outcome button for pending predictions',
        (tester) async {
      AuthService.currentUser = const AuthUser(
        id: 'officer-id',
        email: 'officer@aegis.lk',
        fullName: 'Disaster Officer',
        role: 'DisasterOfficer',
      );

      final service = FakeWeatherService(stubPredictions: [pendingPrediction]);

      await tester.pumpWidget(
        MaterialApp(
          home: PredictionHistoryScreen(weatherService: service),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Confirm Outcome'), findsOneWidget);
    });

    testWidgets('Citizen does NOT see Confirm Outcome button for pending predictions',
        (tester) async {
      AuthService.currentUser = const AuthUser(
        id: 'citizen-id',
        email: 'citizen@aegis.lk',
        fullName: 'Citizen Jane',
        role: 'Citizen',
      );

      final service = FakeWeatherService(stubPredictions: [pendingPrediction]);

      await tester.pumpWidget(
        MaterialApp(
          home: PredictionHistoryScreen(weatherService: service),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Confirm Outcome'), findsNothing);
    });

    testWidgets('Officer does NOT see Confirm Outcome button for already-confirmed predictions',
        (tester) async {
      AuthService.currentUser = const AuthUser(
        id: 'officer-id',
        email: 'officer@aegis.lk',
        fullName: 'Disaster Officer',
        role: 'DisasterOfficer',
      );

      final service = FakeWeatherService(stubPredictions: [confirmedPrediction]);

      await tester.pumpWidget(
        MaterialApp(
          home: PredictionHistoryScreen(weatherService: service),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Confirm Outcome'), findsNothing);
    });

    testWidgets('Tapping Confirm Outcome opens the outcome confirmation dialog',
        (tester) async {
      AuthService.currentUser = const AuthUser(
        id: 'officer-id',
        email: 'officer@aegis.lk',
        fullName: 'Disaster Officer',
        role: 'DisasterOfficer',
      );

      final service = FakeWeatherService(stubPredictions: [pendingPrediction]);

      await tester.pumpWidget(
        MaterialApp(
          home: PredictionHistoryScreen(weatherService: service),
        ),
      );
      await tester.pumpAndSettle();

      // Tap Confirm Outcome
      await tester.tap(find.text('Confirm Outcome'));
      await tester.pumpAndSettle();

      // Verify dialog is presented
      expect(find.text('Confirm Ground Truth'), findsOneWidget);
      expect(find.text('Did a disaster occur?'), findsOneWidget);
      expect(find.text('Yes — Occurred'), findsOneWidget);
      expect(find.text('No Disaster'), findsOneWidget);
      expect(find.text('Save Outcome'), findsOneWidget);
      expect(find.text('Cancel'), findsOneWidget);

      // Tap Cancel to dismiss
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();

      expect(find.text('Confirm Ground Truth'), findsNothing);
    });
  });
}
