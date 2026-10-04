using System;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Aegis.Weather.Services;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Moq.Protected;
using Xunit;

namespace Aegis.Tests;

/// <summary>
/// Unit tests for <see cref="OpenMeteoService"/> covering:
/// — successful response parsing
/// — HTTP 429 does NOT retry
/// — transient failures retry up to 3 attempts
/// — successful result is cached
/// — cache hit does not make another HTTP call
/// </summary>
public class OpenMeteoServiceTests
{
    // ── Helpers ───────────────────────────────────────────────────────────────

    private const string ValidOpenMeteoJson = @"{
        ""daily"": {
            ""precipitation_sum"": [1.2, 0.5, 3.7],
            ""wind_speed_10m_max"": [25.0, 18.5, 32.1]
        }
    }";

    /// <summary>
    /// Creates a real IMemoryCache instance backed by a fresh options object.
    /// </summary>
    private static IMemoryCache CreateCache() =>
        new MemoryCache(new MemoryCacheOptions());

    /// <summary>
    /// Builds an HttpMessageHandler mock that returns the given sequence of responses.
    /// </summary>
    private static Mock<HttpMessageHandler> BuildHandlerMock(params HttpResponseMessage[] responses)
    {
        var mock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
        var setup = mock.Protected()
            .SetupSequence<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>());

        foreach (var resp in responses)
            setup = setup.ReturnsAsync(resp);

        return mock;
    }

    private static OpenMeteoService Build(HttpMessageHandler handler, IMemoryCache? cache = null)
    {
        var httpClient = new HttpClient(handler);
        return new OpenMeteoService(
            httpClient,
            NullLogger<OpenMeteoService>.Instance,
            cache ?? CreateCache());
    }

    // ── 1. Successful response parsing ────────────────────────────────────────

    [Fact]
    public async Task GetForecastAsync_ValidResponse_ParsesRainfallAndWind()
    {
        var handler = BuildHandlerMock(
            new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(ValidOpenMeteoJson, Encoding.UTF8, "application/json")
            });

        var svc = Build(handler.Object);
        var result = await svc.GetForecastAsync(6.9, 79.86);

        Assert.NotNull(result);
        Assert.Equal(3, result.RainfallMmNext3Days.Length);
        Assert.Equal(1.2, result.RainfallMmNext3Days[0]);
        Assert.Equal(0.5, result.RainfallMmNext3Days[1]);
        Assert.Equal(3.7, result.RainfallMmNext3Days[2]);
        Assert.Equal(3, result.WindSpeedKmhNext3Days.Length);
        Assert.Equal(25.0, result.WindSpeedKmhNext3Days[0]);
        Assert.Equal(18.5, result.WindSpeedKmhNext3Days[1]);
        Assert.Equal(32.1, result.WindSpeedKmhNext3Days[2]);
    }

    // ── 2. HTTP 429 does NOT perform multiple retries ─────────────────────────

    [Fact]
    public async Task GetForecastAsync_Http429_ReturnsNullWithoutRetrying()
    {
        // Only one response queued — if the service retried it would throw
        // because the mock has no second response.
        var handler = BuildHandlerMock(
            new HttpResponseMessage(HttpStatusCode.TooManyRequests));

        var svc = Build(handler.Object);
        var result = await svc.GetForecastAsync(6.9, 79.86);

        Assert.Null(result);

        // Verify exactly one HTTP call was made (no retry)
        handler.Protected().Verify(
            "SendAsync",
            Times.Once(),
            ItExpr.IsAny<HttpRequestMessage>(),
            ItExpr.IsAny<CancellationToken>());
    }

    [Fact]
    public async Task GetForecastAsync_Http429WithRetryAfterHeader_ReturnsNull()
    {
        var response = new HttpResponseMessage(HttpStatusCode.TooManyRequests);
        response.Headers.RetryAfter = new System.Net.Http.Headers.RetryConditionHeaderValue(
            TimeSpan.FromSeconds(60));

        var handler = BuildHandlerMock(response);
        var svc = Build(handler.Object);
        var result = await svc.GetForecastAsync(6.9, 79.86);

        Assert.Null(result);
        handler.Protected().Verify(
            "SendAsync",
            Times.Once(),
            ItExpr.IsAny<HttpRequestMessage>(),
            ItExpr.IsAny<CancellationToken>());
    }

    // ── 3. Transient failures retry up to 3 attempts ──────────────────────────

    [Fact]
    public async Task GetForecastAsync_TransientNetworkFailures_RetriesUpToMaxAttempts()
    {
        // All 3 attempts throw HttpRequestException — service returns null after 3
        var handler = new Mock<HttpMessageHandler>(MockBehavior.Strict);
        handler.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ThrowsAsync(new HttpRequestException("Connection refused"));

        // Use a minimal fake delay to avoid 1s + 2s = 3s wait in tests
        // The service itself calls Task.Delay; we just verify correct call count.
        var svc = Build(handler.Object);

        // Note: this will take ~3 s due to the real backoff. If that's undesirable in CI,
        // the service could accept an IClock abstraction, but the spec says not to add
        // new frameworks or abstractions.
        var result = await svc.GetForecastAsync(6.9, 79.86);

        Assert.Null(result);
        handler.Protected().Verify(
            "SendAsync",
            Times.Exactly(3),
            ItExpr.IsAny<HttpRequestMessage>(),
            ItExpr.IsAny<CancellationToken>());
    }

    [Fact]
    public async Task GetForecastAsync_TransientThenSuccess_ReturnsResultAfterRetry()
    {
        // First call throws, second succeeds
        var handler = new Mock<HttpMessageHandler>(MockBehavior.Strict);
        handler.Protected()
            .SetupSequence<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ThrowsAsync(new HttpRequestException("Transient"))
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(ValidOpenMeteoJson, Encoding.UTF8, "application/json")
            });

        var svc = Build(handler.Object);
        var result = await svc.GetForecastAsync(6.9, 79.86);

        Assert.NotNull(result);
        handler.Protected().Verify(
            "SendAsync",
            Times.Exactly(2),
            ItExpr.IsAny<HttpRequestMessage>(),
            ItExpr.IsAny<CancellationToken>());
    }

    // ── 4. Successful result is cached ────────────────────────────────────────

    [Fact]
    public async Task GetForecastAsync_SuccessfulResult_IsStoredInCache()
    {
        var cache = CreateCache();
        var handler = BuildHandlerMock(
            new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(ValidOpenMeteoJson, Encoding.UTF8, "application/json")
            });

        var svc = Build(handler.Object, cache);
        var result = await svc.GetForecastAsync(6.9, 79.86);

        Assert.NotNull(result);

        // Cache key format used inside the service
        var cacheKey = $"forecast:{6.9:F4}:{79.86:F4}";
        Assert.True(cache.TryGetValue(cacheKey, out ForecastResult? cached));
        Assert.NotNull(cached);
        Assert.Equal(result.FetchedAt, cached!.FetchedAt);
    }

    // ── 5. Cache hit prevents a second HTTP call ──────────────────────────────

    [Fact]
    public async Task GetForecastAsync_CachedResult_DoesNotMakeSecondHttpCall()
    {
        var cache = CreateCache();

        // Only one response in the mock — second call would throw if HTTP was attempted
        var handler = BuildHandlerMock(
            new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(ValidOpenMeteoJson, Encoding.UTF8, "application/json")
            });

        var svc = Build(handler.Object, cache);

        // First call populates cache
        var first = await svc.GetForecastAsync(6.9, 79.86);

        // Second call must come from cache (no additional HTTP)
        var second = await svc.GetForecastAsync(6.9, 79.86);

        Assert.NotNull(first);
        Assert.NotNull(second);
        Assert.Equal(first!.FetchedAt, second!.FetchedAt);

        // Exactly ONE HTTP request was made
        handler.Protected().Verify(
            "SendAsync",
            Times.Once(),
            ItExpr.IsAny<HttpRequestMessage>(),
            ItExpr.IsAny<CancellationToken>());
    }

    // ── 6. Failed / 429 responses are never cached ────────────────────────────

    [Fact]
    public async Task GetForecastAsync_Http429_IsNotCached()
    {
        var cache = CreateCache();
        var handler = BuildHandlerMock(
            new HttpResponseMessage(HttpStatusCode.TooManyRequests),
            // Second response available if the cache were incorrectly bypassed
            new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(ValidOpenMeteoJson, Encoding.UTF8, "application/json")
            });

        var svc = Build(handler.Object, cache);
        var first = await svc.GetForecastAsync(6.9, 79.86);

        // First call returns null (rate-limited)
        Assert.Null(first);

        // Second call should NOT find anything in cache
        var cacheKey = $"forecast:{6.9:F4}:{79.86:F4}";
        Assert.False(cache.TryGetValue(cacheKey, out _));
    }
}
