using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace Aegis.Incident.Services;

public class DedupRequestDto
{
    [JsonPropertyName("incident_id")] public string IncidentId { get; set; } = string.Empty;
    [JsonPropertyName("disaster_type")] public string DisasterType { get; set; } = string.Empty;
    [JsonPropertyName("description")] public string Description { get; set; } = string.Empty;
    [JsonPropertyName("latitude")] public double Latitude { get; set; }
    [JsonPropertyName("longitude")] public double Longitude { get; set; }
}

public class DedupResponseDto
{
    [JsonPropertyName("is_duplicate")] public bool IsDuplicate { get; set; }
    [JsonPropertyName("matched_incident_id")] public string? MatchedIncidentId { get; set; }
    [JsonPropertyName("confidence")] public int Confidence { get; set; }
    [JsonPropertyName("reasoning")] public string Reasoning { get; set; } = string.Empty;
    [JsonPropertyName("overall_status")] public string OverallStatus { get; set; } = "Failed";
    [JsonPropertyName("error")] public string? Error { get; set; }
}

public class IncidentDedupAgentClient
{
    private readonly HttpClient _http;

    public IncidentDedupAgentClient(HttpClient http)
    {
        _http = http;
        _http.Timeout = TimeSpan.FromSeconds(60); // tool-calling loops with multiple LLM calls take real time
    }

    public async Task<DedupResponseDto?> CheckForDuplicateAsync(DedupRequestDto request)
    {
        try
        {
            var response = await _http.PostAsJsonAsync("/dedup", request);
            if (!response.IsSuccessStatusCode) return null;
            return await response.Content.ReadFromJsonAsync<DedupResponseDto>();
        }
        catch
        {
            return null;
        }
    }
}