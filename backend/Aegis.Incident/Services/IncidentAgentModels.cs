using System.Text.Json.Serialization;

namespace Aegis.Incident.Services;

public class AssessRequestDto
{
    [JsonPropertyName("disaster_type")] public string DisasterType { get; set; } = string.Empty;
    [JsonPropertyName("severity_reported")] public string SeverityReported { get; set; } = string.Empty;
    [JsonPropertyName("description")] public string Description { get; set; } = string.Empty;
    [JsonPropertyName("latitude")] public double Latitude { get; set; }
    [JsonPropertyName("longitude")] public double Longitude { get; set; }
}

public class AssessResponseDto
{
    [JsonPropertyName("severity_assessed")] public string SeverityAssessed { get; set; } = string.Empty;
    [JsonPropertyName("teams_required")] public int TeamsRequired { get; set; }
    [JsonPropertyName("recommendation")] public string Recommendation { get; set; } = string.Empty;
    [JsonPropertyName("steps")] public List<Dictionary<string, object>> Steps { get; set; } = new();
    [JsonPropertyName("overall_status")] public string OverallStatus { get; set; } = "Failed";
    [JsonPropertyName("error")] public string? Error { get; set; }
}