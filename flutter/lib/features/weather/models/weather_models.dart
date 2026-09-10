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
