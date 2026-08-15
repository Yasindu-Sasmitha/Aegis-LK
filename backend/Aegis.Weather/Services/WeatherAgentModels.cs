using System.Text.Json.Serialization;

namespace Aegis.Weather.Services;

public class AssessRequestDto
{
    [JsonPropertyName("district_id")] public string DistrictId { get; set; } = string.Empty;
    [JsonPropertyName("district_name")] public string DistrictName { get; set; } = string.Empty;
    [JsonPropertyName("is_landslide_prone")] public bool IsLandslideProne { get; set; }
    [JsonPropertyName("forecast_rainfall_mm")] public List<double> ForecastRainfallMm { get; set; } = new();
    [JsonPropertyName("forecast_wind_kmh")] public List<double> ForecastWindKmh { get; set; } = new();
    [JsonPropertyName("flood_threshold_mm")] public double FloodThresholdMm { get; set; }
    [JsonPropertyName("landslide_threshold_mm")] public double? LandslideThresholdMm { get; set; }
    [JsonPropertyName("wind_threshold_kmh")] public double WindThresholdKmh { get; set; }
}

public class HazardAssessment
{
    [JsonPropertyName("hazard_type")] public string HazardType { get; set; } = string.Empty;
    [JsonPropertyName("risk_probability_pct")] public double RiskProbabilityPct { get; set; }
    [JsonPropertyName("confidence_pct")] public double ConfidencePct { get; set; }
    [JsonPropertyName("reasoning_summary")] public string ReasoningSummary { get; set; } = string.Empty;
    [JsonPropertyName("recommended_action")] public string RecommendedAction { get; set; } = string.Empty;
}

public class AssessResponseDto
{
    [JsonPropertyName("hazards")] public List<HazardAssessment> Hazards { get; set; } = new();
    [JsonPropertyName("steps")] public List<Dictionary<string, object>> Steps { get; set; } = new();
    [JsonPropertyName("overall_status")] public string OverallStatus { get; set; } = "Failed";
    [JsonPropertyName("error")] public string? Error { get; set; }
}