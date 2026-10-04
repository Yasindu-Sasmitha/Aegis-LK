using System;
using System.Diagnostics;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace Aegis.Weather.Services;

public record ForecastResult(double[] RainfallMmNext3Days, double[] WindSpeedKmhNext3Days, DateTime FetchedAt);

public class OpenMeteoService
{
    private readonly HttpClient _http;
    private readonly ILogger<OpenMeteoService> _logger;

    // TASK 2: Inject the structured Microsoft.Extensions.Logging system
    public OpenMeteoService(HttpClient http, ILogger<OpenMeteoService> logger)
    {
        _http = http;
        _logger = logger;
        
        // TASK 1: Increase the Open-Meteo HttpClient timeout from 5 seconds to 15 seconds
        _http.Timeout = TimeSpan.FromSeconds(15);
    }

    public async Task<ForecastResult?> GetForecastAsync(double latitude, double longitude)
    {
        var url = $"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}" +
                   "&daily=precipitation_sum,wind_speed_10m_max&timezone=auto&forecast_days=3";

        int maxAttempts = 3;

        for (int attempt = 1; attempt <= maxAttempts; attempt++)
        {
            // Track elapsed request time in milliseconds
            var stopwatch = Stopwatch.StartNew();
            
            try
            {
                var response = await _http.GetAsync(url);
                response.EnsureSuccessStatusCode();
                
                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                
                // TASK 5: Keep response parsing exactly compatible with the existing JSON keys
                var daily = doc.RootElement.GetProperty("daily");
                var rainfall = daily.GetProperty("precipitation_sum").EnumerateArray().Select(x => x.GetDouble()).ToArray();
                var wind = daily.GetProperty("wind_speed_10m_max").EnumerateArray().Select(x => x.GetDouble()).ToArray();
                
                // TASK 6: Keep the existing ForecastResult record unchanged
                return new ForecastResult(rainfall, wind, DateTime.UtcNow);
            }
            // TASK 4: Handle HttpRequestException and TaskCanceledException explicitly where useful
            catch (Exception ex) when (ex is HttpRequestException || ex is TaskCanceledException || ex is TimeoutException)
            {
                stopwatch.Stop();
                
                // TASK 2: Structured logging capturing attempt, type, message, URL, and elapsed time
                _logger.LogWarning("Open-Meteo request failed on attempt {Attempt}/{MaxAttempts} after {ElapsedMs} ms: {ExceptionType} - {Message} (URL: {Url})",
                    attempt, maxAttempts, stopwatch.ElapsedMilliseconds, ex.GetType().Name, ex.Message, url);

                // TASK 3: Precise retry execution logic and backoff delay criteria
                if (attempt < maxAttempts)
                {
                    // attempt 1 failure -> wait 1 second (1000ms)
                    // attempt 2 failure -> wait 2 seconds (2000ms)
                    int backoffMs = attempt == 1 ? 1000 : 2000;
                    await Task.Delay(backoffMs);
                }
                else
                {
                    // TASK 3 & 7: Final attempt failed -> bubble up a safe failure state to return 503
                    return null;
                }
            }
            // Retain safe handling catch block for any unexpected baseline exceptions
            catch (Exception ex)
            {
                stopwatch.Stop();
                _logger.LogError(ex, "Unexpected structural anomaly occurred on attempt {Attempt} after {ElapsedMs} ms.", 
                    attempt, stopwatch.ElapsedMilliseconds);
                
                if (attempt == maxAttempts)
                {
                    return null;
                }
            }
        }
        return null;
    }
}
