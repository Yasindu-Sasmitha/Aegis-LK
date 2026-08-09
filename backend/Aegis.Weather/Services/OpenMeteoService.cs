using System.Text.Json;

namespace Aegis.Weather.Services;

public record ForecastResult(double[] RainfallMmNext3Days, DateTime FetchedAt);

public class OpenMeteoService
{
    private readonly HttpClient _http;

    public OpenMeteoService(HttpClient http)
    {
        _http = http;
        _http.Timeout = TimeSpan.FromSeconds(5);
    }

    public async Task<ForecastResult?> GetForecastAsync(double latitude, double longitude)
    {
        var url = $"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}&daily=precipitation_sum&timezone=auto&forecast_days=3";

        for (int attempt = 1; attempt <= 3; attempt++)
        {
            try
            {
                var response = await _http.GetAsync(url);
                response.EnsureSuccessStatusCode();
                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                var daily = doc.RootElement.GetProperty("daily").GetProperty("precipitation_sum");
                var rainfall = daily.EnumerateArray().Select(x => x.GetDouble()).ToArray();
                return new ForecastResult(rainfall, DateTime.UtcNow);
            }
            catch when (attempt < 3)
            {
                await Task.Delay(500 * attempt); // simple retry backoff
            }
            catch
            {
                return null; // graceful failure after 3 tries — caller handles the null
            }
        }
        return null;
    }
}