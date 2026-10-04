using System;
using System.Diagnostics;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace Aegis.Weather.Services;

public record ForecastResult(double[] RainfallMmNext3Days, double[] WindSpeedKmhNext3Days, DateTime FetchedAt);

public class OpenMeteoService
{
    private readonly HttpClient _http;
    private readonly ILogger<OpenMeteoService> _logger;
    private readonly IMemoryCache _cache;

    // Cache duration — 10 minutes prevents repeated calls from burst dashboard usage
    // while keeping forecast data reasonably fresh.
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(10);

    public OpenMeteoService(HttpClient http, ILogger<OpenMeteoService> logger, IMemoryCache cache)
    {
        _http   = http;
        _logger = logger;
        _cache  = cache;

        _http.Timeout = TimeSpan.FromSeconds(15);
    }

    public async Task<ForecastResult?> GetForecastAsync(double latitude, double longitude)
    {
        var url = $"https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}" +
                   "&daily=precipitation_sum,wind_speed_10m_max&timezone=auto&forecast_days=3";

        // ── Cache check ───────────────────────────────────────────────────────
        var cacheKey = $"forecast:{latitude:F4}:{longitude:F4}";
        if (_cache.TryGetValue(cacheKey, out ForecastResult? cached) && cached is not null)
        {
            _logger.LogInformation(
                "Open-Meteo forecast cache hit for ({Lat},{Lon}). Returning cached result (fetched at {FetchedAt:u}).",
                latitude, longitude, cached.FetchedAt);
            return cached;
        }

        // ── HTTP request with retry for genuine transient failures ────────────
        int maxAttempts = 3;

        for (int attempt = 1; attempt <= maxAttempts; attempt++)
        {
            var stopwatch = Stopwatch.StartNew();

            try
            {
                var response = await _http.GetAsync(url);
                stopwatch.Stop();

                // ── 429 Rate-Limited: bail out immediately, do NOT retry ───────
                if (response.StatusCode == HttpStatusCode.TooManyRequests)
                {
                    var retryAfter = response.Headers.RetryAfter?.Delta?.TotalSeconds
                                  ?? response.Headers.RetryAfter?.Date?.Subtract(DateTimeOffset.UtcNow).TotalSeconds;

                    _logger.LogWarning(
                        "Open-Meteo returned HTTP 429 (Too Many Requests) on attempt {Attempt}/{MaxAttempts} " +
                        "after {ElapsedMs} ms. Retry-After: {RetryAfterSeconds}s. URL: {Url}. Returning null — caller will 503.",
                        attempt, maxAttempts, stopwatch.ElapsedMilliseconds,
                        retryAfter.HasValue ? $"{retryAfter.Value:F0}" : "not set",
                        url);

                    // Return immediately — do not burn remaining retry budget against a rate-limit.
                    return null;
                }

                response.EnsureSuccessStatusCode();

                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);

                var daily    = doc.RootElement.GetProperty("daily");
                var rainfall = daily.GetProperty("precipitation_sum")
                                    .EnumerateArray().Select(x => x.GetDouble()).ToArray();
                var wind     = daily.GetProperty("wind_speed_10m_max")
                                    .EnumerateArray().Select(x => x.GetDouble()).ToArray();

                var result = new ForecastResult(rainfall, wind, DateTime.UtcNow);

                // ── Cache the successful result ───────────────────────────────
                _cache.Set(cacheKey, result, CacheDuration);

                _logger.LogInformation(
                    "Open-Meteo forecast fetched successfully for ({Lat},{Lon}) in {ElapsedMs} ms (attempt {Attempt}/{MaxAttempts}). Cached for {CacheMinutes} min.",
                    latitude, longitude, stopwatch.ElapsedMilliseconds, attempt, maxAttempts,
                    (int)CacheDuration.TotalMinutes);

                return result;
            }
            // ── Transient failures: retry with exponential-ish backoff ─────────
            catch (Exception ex) when (ex is HttpRequestException || ex is TaskCanceledException || ex is TimeoutException)
            {
                stopwatch.Stop();

                _logger.LogWarning(
                    "Open-Meteo request failed on attempt {Attempt}/{MaxAttempts} after {ElapsedMs} ms: {ExceptionType} - {Message} (URL: {Url})",
                    attempt, maxAttempts, stopwatch.ElapsedMilliseconds,
                    ex.GetType().Name, ex.Message, url);

                if (attempt < maxAttempts)
                {
                    // attempt 1 failure → wait 1 s; attempt 2 failure → wait 2 s
                    int backoffMs = attempt == 1 ? 1_000 : 2_000;
                    await Task.Delay(backoffMs);
                }
                else
                {
                    return null;
                }
            }
            // ── Unexpected structural errors: log + return null ───────────────
            catch (Exception ex)
            {
                stopwatch.Stop();
                _logger.LogError(ex,
                    "Unexpected error in Open-Meteo service on attempt {Attempt}/{MaxAttempts} after {ElapsedMs} ms.",
                    attempt, maxAttempts, stopwatch.ElapsedMilliseconds);

                if (attempt == maxAttempts)
                    return null;
            }
        }

        return null;
    }
}
