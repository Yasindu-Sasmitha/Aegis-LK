using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace Aegis.Incident.Services;

public class PlausibilityRequestDto
{
    [JsonPropertyName("disaster_type")] public string DisasterType { get; set; } = string.Empty;
    [JsonPropertyName("description")] public string Description { get; set; } = string.Empty;
    [JsonPropertyName("latitude")] public double Latitude { get; set; }
    [JsonPropertyName("longitude")] public double Longitude { get; set; }
    [JsonPropertyName("photo_url")] public string? PhotoUrl { get; set; }
}

public class PlausibilityResponseDto
{
    [JsonPropertyName("plausibility_score")] public int PlausibilityScore { get; set; }
    [JsonPropertyName("plausibility_reasoning")] public string PlausibilityReasoning { get; set; } = string.Empty;
    [JsonPropertyName("district_checked")] public string DistrictChecked { get; set; } = string.Empty;
    [JsonPropertyName("overall_status")] public string OverallStatus { get; set; } = "Failed";
    [JsonPropertyName("error")] public string? Error { get; set; }
}

public class IncidentPlausibilityAgentClient
{
    private readonly HttpClient _http;

    public IncidentPlausibilityAgentClient(HttpClient http)
    {
        _http = http;
        _http.Timeout = TimeSpan.FromSeconds(60); // tool-calling loops can take longer than a single LLM call
    }

    public async Task<PlausibilityResponseDto?> CheckPlausibilityAsync(PlausibilityRequestDto request)
    {
        try
        {
            var response = await _http.PostAsJsonAsync("/plausibility", request);
            if (!response.IsSuccessStatusCode) return null;
            return await response.Content.ReadFromJsonAsync<PlausibilityResponseDto>();
        }
        catch
        {
            return null; // agent service down/unreachable — background task logs and moves on
        }
    }
}