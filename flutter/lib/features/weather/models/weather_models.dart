class District {
  final String id;
  final String name;
  final String province;
  final double latitude;
  final double longitude;
  final bool isLandslideProne;

  const District({
    required this.id,
    required this.name,
    required this.province,
    required this.latitude,
    required this.longitude,
    required this.isLandslideProne,
  });

  factory District.fromJson(Map<String, dynamic> json) => District(
        id: json['id'] as String,
        name: json['name'] as String,
        province: json['province'] as String,
        latitude: (json['latitude'] as num).toDouble(),
        longitude: (json['longitude'] as num).toDouble(),
        isLandslideProne: json['isLandslideProne'] as bool? ?? false,
      );
}

class ForecastResponse {
  final String name;
  final bool isLandslideProne;
  final List<double> rainfallMmNext3Days;
  final List<double> windSpeedKmhNext3Days;
  final String fetchedAt;
  final double? floodThresholdMm;
  final double? landslideThresholdMm;
  final double? highWindThresholdKmh;
  final double? historicalAvgRainfallMm;

  const ForecastResponse({
    required this.name,
    required this.isLandslideProne,
    required this.rainfallMmNext3Days,
    required this.windSpeedKmhNext3Days,
    required this.fetchedAt,
    this.floodThresholdMm,
    this.landslideThresholdMm,
    this.highWindThresholdKmh,
    this.historicalAvgRainfallMm,
  });

  factory ForecastResponse.fromJson(Map<String, dynamic> json) {
    List<double> toDoubleList(dynamic v) =>
        (v as List).map((e) => (e as num).toDouble()).toList();

    return ForecastResponse(
      name: json['name'] as String,
      isLandslideProne: json['isLandslideProne'] as bool? ?? false,
      rainfallMmNext3Days: toDoubleList(json['rainfallMmNext3Days']),
      windSpeedKmhNext3Days: toDoubleList(json['windSpeedKmhNext3Days']),
      fetchedAt: json['fetchedAt'] as String? ?? '',
      floodThresholdMm: (json['floodThresholdMm'] as num?)?.toDouble(),
      landslideThresholdMm: (json['landslideThresholdMm'] as num?)?.toDouble(),
      highWindThresholdKmh: (json['highWindThresholdKmh'] as num?)?.toDouble(),
      historicalAvgRainfallMm: (json['historicalAvgRainfallMm'] as num?)?.toDouble(),
    );
  }
}

class HazardResult {
  final String hazardType;
  final double riskProbabilityPct;
  final String alertStatus;

  const HazardResult({
    required this.hazardType,
    required this.riskProbabilityPct,
    required this.alertStatus,
  });

  factory HazardResult.fromJson(Map<String, dynamic> json) => HazardResult(
        hazardType: json['hazardType'] as String,
        riskProbabilityPct: (json['riskProbabilityPct'] as num).toDouble(),
        alertStatus: json['alertStatus'] as String,
      );
}

class PredictResponse {
  final String name;
  final String agentRunId;
  final List<HazardResult> results;

  const PredictResponse({
    required this.name,
    required this.agentRunId,
    required this.results,
  });

  factory PredictResponse.fromJson(Map<String, dynamic> json) => PredictResponse(
        name: json['name'] as String,
        agentRunId: json['agentRunId'] as String,
        results: (json['results'] as List)
            .map((e) => HazardResult.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class WeatherAlert {
  final String id;
  final String districtId;
  final String? districtName;
  final String hazardType;
  final String severity;
  final String message;
  final String status;
  final String? publishedAt;
  final String createdAt;

  const WeatherAlert({
    required this.id,
    required this.districtId,
    this.districtName,
    required this.hazardType,
    required this.severity,
    required this.message,
    required this.status,
    this.publishedAt,
    required this.createdAt,
  });

  factory WeatherAlert.fromJson(Map<String, dynamic> json) => WeatherAlert(
        id: json['id'] as String,
        districtId: json['districtId'] as String,
        districtName: json['districtName'] as String?,
        hazardType: json['hazardType'] as String,
        severity: json['severity'] as String,
        message: json['message'] as String,
        status: json['status'] as String,
        publishedAt: json['publishedAt'] as String?,
        createdAt: json['createdAt'] as String,
      );
}

class PredictionItem {
  final String id;
  final String districtId;
  final String? districtName;
  final String agentRunId;
  final String hazardType;
  final double riskProbabilityPct;
  final double confidencePct;
  final double forecastValue;
  final double historicalThreshold;
  final String unit;
  final String status;
  final String createdAt;
  final bool hasOutcome;
  final bool? actualDisasterOccurred;
  final double? actualValue;
  final String? confirmedByUserId;
  final String? outcomeConfirmedAt;
  final String? outcomeNotes;

  const PredictionItem({
    required this.id,
    required this.districtId,
    this.districtName,
    required this.agentRunId,
    required this.hazardType,
    required this.riskProbabilityPct,
    required this.confidencePct,
    required this.forecastValue,
    required this.historicalThreshold,
    required this.unit,
    required this.status,
    required this.createdAt,
    this.hasOutcome = false,
    this.actualDisasterOccurred,
    this.actualValue,
    this.confirmedByUserId,
    this.outcomeConfirmedAt,
    this.outcomeNotes,
  });

  factory PredictionItem.fromJson(Map<String, dynamic> json) => PredictionItem(
        id: json['id'] as String,
        districtId: json['districtId'] as String,
        districtName: json['districtName'] as String?,
        agentRunId: json['agentRunId'] as String,
        hazardType: json['hazardType'] as String,
        riskProbabilityPct: (json['riskProbabilityPct'] as num).toDouble(),
        confidencePct: (json['confidencePct'] as num).toDouble(),
        forecastValue: (json['forecastValue'] as num).toDouble(),
        historicalThreshold: (json['historicalThreshold'] as num).toDouble(),
        unit: json['unit'] as String? ?? 'mm',
        status: json['status'] as String? ?? 'Completed',
        createdAt: json['createdAt'] as String,
        hasOutcome: json['hasOutcome'] as bool? ?? false,
        actualDisasterOccurred: json['actualDisasterOccurred'] as bool?,
        actualValue: (json['actualValue'] as num?)?.toDouble(),
        confirmedByUserId: json['confirmedByUserId'] as String?,
        outcomeConfirmedAt: json['outcomeConfirmedAt'] as String?,
        outcomeNotes: json['outcomeNotes'] as String?,
      );
}

class PredictionsResponse {
  final int total;
  final int page;
  final int pageSize;
  final List<PredictionItem> items;

  const PredictionsResponse({
    required this.total,
    required this.page,
    required this.pageSize,
    required this.items,
  });

  factory PredictionsResponse.fromJson(Map<String, dynamic> json) =>
      PredictionsResponse(
        total: json['total'] as int? ?? 0,
        page: json['page'] as int? ?? 1,
        pageSize: json['pageSize'] as int? ?? 20,
        items: (json['items'] as List?)
                ?.map((e) => PredictionItem.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
      );
}

class PredictionOutcomeRequest {
  final bool actualDisasterOccurred;
  final double? actualValue;
  final String? notes;

  const PredictionOutcomeRequest({
    required this.actualDisasterOccurred,
    this.actualValue,
    this.notes,
  });

  Map<String, dynamic> toJson() => {
        'actualDisasterOccurred': actualDisasterOccurred,
        if (actualValue != null) 'actualValue': actualValue,
        if (notes != null) 'notes': notes,
      };
}

class PredictionOutcomeResponse {
  final String id;
  final String predictionId;
  final bool? actualDisasterOccurred;
  final double? actualValue;
  final String? confirmedByUserId;
  final String? confirmedAt;
  final String? notes;

  const PredictionOutcomeResponse({
    required this.id,
    required this.predictionId,
    this.actualDisasterOccurred,
    this.actualValue,
    this.confirmedByUserId,
    this.confirmedAt,
    this.notes,
  });

  factory PredictionOutcomeResponse.fromJson(Map<String, dynamic> json) =>
      PredictionOutcomeResponse(
        id: json['id'] as String,
        predictionId: json['predictionId'] as String,
        actualDisasterOccurred: json['actualDisasterOccurred'] as bool?,
        actualValue: (json['actualValue'] as num?)?.toDouble(),
        confirmedByUserId: json['confirmedByUserId'] as String?,
        confirmedAt: json['confirmedAt'] as String?,
        notes: json['notes'] as String?,
      );
}

