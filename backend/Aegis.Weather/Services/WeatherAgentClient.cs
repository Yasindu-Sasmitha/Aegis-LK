using System.Net.Http.Json;

namespace Aegis.Weather.Services;

public class WeatherAgentClient
{
    private readonly HttpClient _http;

    public WeatherAgentClient(HttpClient http)
    {
        _http = http;
        _http.Timeout = TimeSpan.FromSeconds(30); // LLM calls are slow — give it real room
    }

    public async Task<AssessResponseDto?> AssessAsync(AssessRequestDto request)
    {
        try
        {
            var response = await _http.PostAsJsonAsync("/assess", request);
            if (!response.IsSuccessStatusCode) return null;
            return await response.Content.ReadFromJsonAsync<AssessResponseDto>();
        }
        catch
        {
            return null; // agent service down/unreachable — caller handles null gracefully
        }
    }
}