using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Aegis.Shared.Auth.Services;
using Aegis.Weather.Data;
using Aegis.Weather.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace Aegis.Tests;

public class WeatherBusinessRulesTests
{
    private WeatherDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<WeatherDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new WeatherDbContext(options);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. WeatherAlert & Prediction Creation Tests (Entity & State Management)
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateWeatherAlert_DefaultStatus_IsPendingReview()
    {
        using var db = GetInMemoryDbContext();
        var alert = new WeatherAlert
        {
            DistrictId = Guid.NewGuid(),
            PredictionId = Guid.NewGuid(),
            HazardType = "Flood",
            Severity = "Moderate",
            Message = "Potential river swelling anticipated in lower catchment.",
        };

        db.WeatherAlerts.Add(alert);
        await db.SaveChangesAsync();

        var saved = await db.WeatherAlerts.FirstOrDefaultAsync(a => a.Id == alert.Id);
        Assert.NotNull(saved);
        Assert.Equal("PendingReview", saved.Status);
        Assert.Null(saved.PublishedAt);
        Assert.Null(saved.ReviewedByUserId);
    }

    [Fact]
    public async Task CreateWeatherAlert_WhenAutoPublished_HasPublishedStatusAndTimestamp()
    {
        using var db = GetInMemoryDbContext();
        var publishedTime = DateTime.UtcNow;
        var alert = new WeatherAlert
        {
            DistrictId = Guid.NewGuid(),
            PredictionId = Guid.NewGuid(),
            HazardType = "Landslide",
            Severity = "High",
            Message = "Critical soil saturation threshold exceeded.",
            Status = "Published",
            PublishedAt = publishedTime
        };

        db.WeatherAlerts.Add(alert);
        await db.SaveChangesAsync();

        var saved = await db.WeatherAlerts.FirstOrDefaultAsync(a => a.Id == alert.Id);
        Assert.NotNull(saved);
        Assert.Equal("Published", saved.Status);
        Assert.NotNull(saved.PublishedAt);
    }

    [Fact]
    public async Task DuplicateAlertCheck_IdentifiesRecentPublishedAlert()
    {
        using var db = GetInMemoryDbContext();
        var districtId = Guid.NewGuid();

        var existingAlert = new WeatherAlert
        {
            DistrictId = districtId,
            PredictionId = Guid.NewGuid(),
            HazardType = "Flood",
            Severity = "High",
            Message = "Existing alert within 24h",
            Status = "Published",
            PublishedAt = DateTime.UtcNow.AddHours(-2)
        };
        db.WeatherAlerts.Add(existingAlert);
        await db.SaveChangesAsync();

        // Check the duplicate gate condition from WeatherEndpoints.cs
        var isDuplicate = await db.WeatherAlerts.AnyAsync(a =>
            a.DistrictId == districtId &&
            a.HazardType == "Flood" &&
            a.Status == "Published" &&
            a.PublishedAt > DateTime.UtcNow.AddHours(-24));

        Assert.True(isDuplicate);
    }

    [Fact]
    public async Task DuplicateAlertCheck_AllowsNewAlertIfExpiredPast24Hours()
    {
        using var db = GetInMemoryDbContext();
        var districtId = Guid.NewGuid();

        var oldAlert = new WeatherAlert
        {
            DistrictId = districtId,
            PredictionId = Guid.NewGuid(),
            HazardType = "Flood",
            Severity = "High",
            Message = "Old alert from 2 days ago",
            Status = "Published",
            PublishedAt = DateTime.UtcNow.AddHours(-48)
        };
        db.WeatherAlerts.Add(oldAlert);
        await db.SaveChangesAsync();

        var isDuplicate = await db.WeatherAlerts.AnyAsync(a =>
            a.DistrictId == districtId &&
            a.HazardType == "Flood" &&
            a.Status == "Published" &&
            a.PublishedAt > DateTime.UtcNow.AddHours(-24));

        Assert.False(isDuplicate);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. Weather Prediction & AI Confidence Gate Business Rules
    // ──────────────────────────────────────────────────────────────────────────

    [Theory]
    [InlineData(69.9, "flag_for_review")]
    [InlineData(50.0, "flag_for_review")]
    [InlineData(70.0, "publish_alert")]
    [InlineData(95.5, "publish_alert")]
    public void ConfidenceGate_EnforcesHumanReviewBelowSeventyPercent(double confidencePct, string expectedAction)
    {
        // Business Rule (SE3090):
        // If AI confidence < 70%, the alert cannot be auto-published and must be flagged for Disaster Officer review.
        string DetermineAction(double confidence, double riskProbability)
        {
            if (riskProbability < 40) return "no_action";
            return confidence < 70 ? "flag_for_review" : "publish_alert";
        }

        var action = DetermineAction(confidencePct, 80.0);
        Assert.Equal(expectedAction, action);
    }

    [Theory]
    [InlineData(120.0, 100.0, true)]
    [InlineData(90.0, 100.0, false)]
    public void FloodThreshold_ExceededEvaluation(double rainfallMm, double thresholdMm, bool expectedExceeded)
    {
        bool isExceeded = rainfallMm > thresholdMm;
        Assert.Equal(expectedExceeded, isExceeded);
    }

    [Fact]
    public void Prediction_RiskProbability_MustBeWithinPercentageBounds()
    {
        var pred = new Prediction
        {
            HazardType = "StrongWind",
            RiskProbabilityPct = 85.5,
            ConfidencePct = 78.0,
            ForecastValue = 75.0,
            HistoricalThreshold = 60.0
        };

        Assert.InRange(pred.RiskProbabilityPct, 0.0, 100.0);
        Assert.InRange(pred.ConfidencePct, 0.0, 100.0);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. Officer Review Workflow Transitions & Audit Identity Integrity
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task OfficerReview_ApproveAlert_UpdatesStatusAndPersistsRealOfficerId()
    {
        using var db = GetInMemoryDbContext();
        var alert = new WeatherAlert
        {
            DistrictId = Guid.NewGuid(),
            PredictionId = Guid.NewGuid(),
            HazardType = "Flood",
            Severity = "Moderate",
            Message = "Initial warning",
            Status = "PendingReview"
        };
        db.WeatherAlerts.Add(alert);
        await db.SaveChangesAsync();

        var realOfficerId = Guid.NewGuid();
        var reviewTimestamp = DateTime.UtcNow;

        // Verify valid officer GUID is persisted and NEVER fallback default GUID
        alert.Status = "Published";
        alert.ReviewedByUserId = realOfficerId;
        alert.ReviewedAt = reviewTimestamp;
        alert.PublishedAt = reviewTimestamp;
        alert.Message += "\n[Officer note: Approved for public release]";
        await db.SaveChangesAsync();

        var updated = await db.WeatherAlerts.FindAsync(alert.Id);
        Assert.NotNull(updated);
        Assert.Equal("Published", updated.Status);
        Assert.Equal(realOfficerId, updated.ReviewedByUserId);
        Assert.NotEqual(Guid.Parse("00000000-0000-0000-0000-000000000001"), updated.ReviewedByUserId);
        Assert.NotNull(updated.ReviewedAt);
        Assert.NotNull(updated.PublishedAt);
        Assert.Contains("Approved for public release", updated.Message);
    }

    [Fact]
    public async Task OfficerReview_RejectAlert_SetsStatusToRejectedAndPersistsReviewerId()
    {
        using var db = GetInMemoryDbContext();
        var alert = new WeatherAlert
        {
            DistrictId = Guid.NewGuid(),
            PredictionId = Guid.NewGuid(),
            HazardType = "Flood",
            Severity = "Moderate",
            Message = "Initial warning",
            Status = "PendingReview"
        };
        db.WeatherAlerts.Add(alert);
        await db.SaveChangesAsync();

        var realOfficerId = Guid.NewGuid();

        // Simulate officer rejection
        alert.Status = "Rejected";
        alert.ReviewedByUserId = realOfficerId;
        alert.ReviewedAt = DateTime.UtcNow;
        alert.PublishedAt = null;
        await db.SaveChangesAsync();

        var updated = await db.WeatherAlerts.FindAsync(alert.Id);
        Assert.NotNull(updated);
        Assert.Equal("Rejected", updated.Status);
        Assert.Equal(realOfficerId, updated.ReviewedByUserId);
        Assert.NotEqual(Guid.Parse("00000000-0000-0000-0000-000000000001"), updated.ReviewedByUserId);
        Assert.Null(updated.PublishedAt);
    }
}

// ──────────────────────────────────────────────────────────────────────────
// 4. Weather Endpoint Security & Integration Tests (WebApplicationFactory)
// ──────────────────────────────────────────────────────────────────────────

public class WeatherEndpointAuthIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    public WeatherEndpointAuthIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureServices(services =>
            {
                // Remove all existing WeatherDbContext registrations
                var toRemove = services.Where(d =>
                    d.ServiceType == typeof(DbContextOptions<WeatherDbContext>) ||
                    d.ServiceType == typeof(WeatherDbContext) ||
                    d.ServiceType.FullName?.Contains("WeatherDbContext") == true).ToList();

                foreach (var descriptor in toRemove)
                {
                    services.Remove(descriptor);
                }

                // Dedicated internal service provider for InMemory database prevents provider collision with Npgsql
                var inMemoryProvider = new ServiceCollection()
                    .AddEntityFrameworkInMemoryDatabase()
                    .BuildServiceProvider();

                services.AddDbContext<WeatherDbContext>(options =>
                {
                    options.UseInMemoryDatabase("WeatherIntegrationTestsDb");
                    options.UseInternalServiceProvider(inMemoryProvider);
                });
            });
        });
        _client = _factory.CreateClient();
    }

    private static string GenerateTestToken(string role, string? userId = null)
    {
        var signingKey = JwtTokenService.DefaultDevSigningKey;
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.Role, role),
            new("role", role),
        };

        if (userId != null)
        {
            claims.Add(new(ClaimTypes.NameIdentifier, userId));
            claims.Add(new("sub", userId));
        }

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddHours(2),
            Issuer = "Aegis.Api",
            Audience = "Aegis.Client",
            SigningCredentials = credentials
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    private HttpRequestMessage CreateAuthenticatedRequest(HttpMethod method, string url, string token, HttpContent? content = null)
    {
        var request = new HttpRequestMessage(method, url) { Content = content };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return request;
    }

    // ── Public Endpoint Tests ─────────────────────────────────────────────────

    [Fact]
    public async Task GetDistricts_WithoutToken_ReturnsOk()
    {
        var response = await _client.GetAsync("/api/weather/districts");
        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── Predict Endpoint Auth Tests ───────────────────────────────────────────

    [Fact]
    public async Task PostPredict_WithoutToken_ReturnsUnauthorized()
    {
        var randomDistrictId = Guid.NewGuid();
        var response = await _client.PostAsync($"/api/weather/predict/{randomDistrictId}", null);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task PostPredict_WithCitizenRole_ReturnsForbidden()
    {
        var token = GenerateTestToken("Citizen", Guid.NewGuid().ToString());
        var request = CreateAuthenticatedRequest(HttpMethod.Post, $"/api/weather/predict/{Guid.NewGuid()}", token);
        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ── Alert Review Identity & Auth Tests ────────────────────────────────────

    [Fact]
    public async Task PostReviewAlert_WithoutToken_ReturnsUnauthorized()
    {
        var randomAlertId = Guid.NewGuid();
        var content = new StringContent("{\"decision\":\"Approved\"}", Encoding.UTF8, "application/json");
        var response = await _client.PostAsync($"/api/weather/alerts/{randomAlertId}/review", content);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task PostReviewAlert_WithCitizenRole_ReturnsForbidden()
    {
        var token = GenerateTestToken("Citizen", Guid.NewGuid().ToString());
        var content = new StringContent("{\"decision\":\"Approved\"}", Encoding.UTF8, "application/json");
        var request = CreateAuthenticatedRequest(HttpMethod.Post, $"/api/weather/alerts/{Guid.NewGuid()}/review", token, content);
        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PostReviewAlert_WithResponderRole_ReturnsForbidden()
    {
        var token = GenerateTestToken("Responder", Guid.NewGuid().ToString());
        var content = new StringContent("{\"decision\":\"Approved\"}", Encoding.UTF8, "application/json");
        var request = CreateAuthenticatedRequest(HttpMethod.Post, $"/api/weather/alerts/{Guid.NewGuid()}/review", token, content);
        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PostReviewAlert_WithDisasterOfficer_ValidGuid_SucceedsAndPersistsRealReviewerGuid()
    {
        // 1. Seed a PendingReview alert
        var alertId = Guid.NewGuid();
        var districtId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<WeatherDbContext>();
            db.WeatherAlerts.Add(new WeatherAlert
            {
                Id = alertId,
                DistrictId = districtId,
                PredictionId = Guid.NewGuid(),
                HazardType = "Flood",
                Severity = "High",
                Message = "Potential flash flood warning",
                Status = "PendingReview",
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        // 2. Review with a real officer GUID in JWT
        var realOfficerId = Guid.NewGuid();
        var token = GenerateTestToken("DisasterOfficer", realOfficerId.ToString());
        var content = new StringContent(
            JsonSerializer.Serialize(new { decision = "Approved", reviewNotes = "Verified with radar observations" }),
            Encoding.UTF8, "application/json");

        var request = CreateAuthenticatedRequest(HttpMethod.Post, $"/api/weather/alerts/{alertId}/review", token, content);
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // 3. Verify in database: real officer GUID was saved and NO fake default GUID
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<WeatherDbContext>();
            var savedAlert = await db.WeatherAlerts.FindAsync(alertId);
            Assert.NotNull(savedAlert);
            Assert.Equal("Published", savedAlert.Status);
            Assert.Equal(realOfficerId, savedAlert.ReviewedByUserId);
            Assert.NotEqual(Guid.Parse("00000000-0000-0000-0000-000000000001"), savedAlert.ReviewedByUserId);
            Assert.NotNull(savedAlert.ReviewedAt);
            Assert.NotNull(savedAlert.PublishedAt);
        }
    }

    [Fact]
    public async Task PostReviewAlert_WithAdminRole_ValidGuid_SucceedsAndPersistsAdminGuid()
    {
        var alertId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<WeatherDbContext>();
            db.WeatherAlerts.Add(new WeatherAlert
            {
                Id = alertId,
                DistrictId = Guid.NewGuid(),
                PredictionId = Guid.NewGuid(),
                HazardType = "Landslide",
                Severity = "High",
                Message = "Slope instability detected",
                Status = "PendingReview",
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        var adminId = Guid.NewGuid();
        var token = GenerateTestToken("Admin", adminId.ToString());
        var content = new StringContent(
            JsonSerializer.Serialize(new { decision = "Rejected", reviewNotes = "False alarm on sensor" }),
            Encoding.UTF8, "application/json");

        var request = CreateAuthenticatedRequest(HttpMethod.Post, $"/api/weather/alerts/{alertId}/review", token, content);
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<WeatherDbContext>();
            var savedAlert = await db.WeatherAlerts.FindAsync(alertId);
            Assert.NotNull(savedAlert);
            Assert.Equal("Rejected", savedAlert.Status);
            Assert.Equal(adminId, savedAlert.ReviewedByUserId);
            Assert.NotEqual(Guid.Parse("00000000-0000-0000-0000-000000000001"), savedAlert.ReviewedByUserId);
            Assert.Null(savedAlert.PublishedAt);
        }
    }

    [Fact]
    public async Task PostReviewAlert_WithMissingNameIdentifierClaim_ReturnsUnauthorized()
    {
        var alertId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<WeatherDbContext>();
            db.WeatherAlerts.Add(new WeatherAlert
            {
                Id = alertId,
                DistrictId = Guid.NewGuid(),
                PredictionId = Guid.NewGuid(),
                HazardType = "StrongWind",
                Severity = "Moderate",
                Message = "Wind advisory",
                Status = "PendingReview",
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        // Token with DisasterOfficer role but NO NameIdentifier claim
        var token = GenerateTestToken("DisasterOfficer", userId: null);
        var content = new StringContent(
            JsonSerializer.Serialize(new { decision = "Approved" }),
            Encoding.UTF8, "application/json");

        var request = CreateAuthenticatedRequest(HttpMethod.Post, $"/api/weather/alerts/{alertId}/review", token, content);
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task PostReviewAlert_WithNonGuidNameIdentifier_ReturnsUnauthorized()
    {
        var alertId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<WeatherDbContext>();
            db.WeatherAlerts.Add(new WeatherAlert
            {
                Id = alertId,
                DistrictId = Guid.NewGuid(),
                PredictionId = Guid.NewGuid(),
                HazardType = "StrongWind",
                Severity = "Moderate",
                Message = "Wind advisory",
                Status = "PendingReview",
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        // Token with invalid non-GUID NameIdentifier
        var token = GenerateTestToken("DisasterOfficer", userId: "not-a-valid-guid");
        var content = new StringContent(
            JsonSerializer.Serialize(new { decision = "Approved" }),
            Encoding.UTF8, "application/json");

        var request = CreateAuthenticatedRequest(HttpMethod.Post, $"/api/weather/alerts/{alertId}/review", token, content);
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── Agent Trace Endpoint Protection Tests ─────────────────────────────────

    [Fact]
    public async Task GetAgentRun_WithoutToken_ReturnsUnauthorized()
    {
        var runId = Guid.NewGuid();
        var response = await _client.GetAsync($"/api/weather/agent-runs/{runId}");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetAgentRun_WithCitizenRole_ReturnsForbidden()
    {
        var token = GenerateTestToken("Citizen", Guid.NewGuid().ToString());
        var request = CreateAuthenticatedRequest(HttpMethod.Get, $"/api/weather/agent-runs/{Guid.NewGuid()}", token);
        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetAgentRun_WithResponderRole_ReturnsForbidden()
    {
        var token = GenerateTestToken("Responder", Guid.NewGuid().ToString());
        var request = CreateAuthenticatedRequest(HttpMethod.Get, $"/api/weather/agent-runs/{Guid.NewGuid()}", token);
        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetAgentRun_WithDisasterOfficer_ExistingRun_ReturnsOkWithTrace()
    {
        var runId = Guid.NewGuid();
        var districtId = Guid.NewGuid();
        var stepsJson = "[{\"step\":\"assess_hazards\",\"status\":\"success\"},{\"step\":\"validate_and_decide\",\"status\":\"success\"}]";

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<WeatherDbContext>();
            db.AgentExecutionLogs.Add(new AgentExecutionLog
            {
                Id = runId,
                DistrictId = districtId,
                TriggerType = "Manual",
                OverallStatus = "Success",
                StepsJson = stepsJson,
                StartedAt = DateTime.UtcNow.AddSeconds(-5),
                CompletedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        var token = GenerateTestToken("DisasterOfficer", Guid.NewGuid().ToString());
        var request = CreateAuthenticatedRequest(HttpMethod.Get, $"/api/weather/agent-runs/{runId}", token);
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        using var jsonDoc = JsonDocument.Parse(body);
        var root = jsonDoc.RootElement;
        Assert.Equal(runId.ToString(), root.GetProperty("id").GetString());
        Assert.Equal("Success", root.GetProperty("overallStatus").GetString());
        Assert.True(root.TryGetProperty("steps", out var stepsProp));
        Assert.Equal(JsonValueKind.Array, stepsProp.ValueKind);
    }

    [Fact]
    public async Task GetAgentRun_WithAdminRole_ExistingRun_ReturnsOkWithTrace()
    {
        var runId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<WeatherDbContext>();
            db.AgentExecutionLogs.Add(new AgentExecutionLog
            {
                Id = runId,
                DistrictId = Guid.NewGuid(),
                TriggerType = "Manual",
                OverallStatus = "Success",
                StepsJson = "[]",
                StartedAt = DateTime.UtcNow.AddSeconds(-2),
                CompletedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        var token = GenerateTestToken("Admin", Guid.NewGuid().ToString());
        var request = CreateAuthenticatedRequest(HttpMethod.Get, $"/api/weather/agent-runs/{runId}", token);
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetAgentRun_WithDisasterOfficer_UnknownRun_ReturnsNotFound()
    {
        var unknownRunId = Guid.NewGuid();
        var token = GenerateTestToken("DisasterOfficer", Guid.NewGuid().ToString());
        var request = CreateAuthenticatedRequest(HttpMethod.Get, $"/api/weather/agent-runs/{unknownRunId}", token);
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
