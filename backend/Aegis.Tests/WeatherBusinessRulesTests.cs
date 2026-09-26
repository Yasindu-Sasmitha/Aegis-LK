using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Aegis.Shared.Auth.Services;
using Aegis.Weather.Data;
using Aegis.Weather.Endpoints;
using Aegis.Weather.Models;
using Aegis.Weather.Services;
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

    // ── Predict: Responder & Officer role coverage ─────────────────────────────

    [Fact]
    public async Task PostPredict_WithResponderRole_ReturnsForbidden()
    {
        var token = GenerateTestToken("Responder", Guid.NewGuid().ToString());
        var request = CreateAuthenticatedRequest(HttpMethod.Post, $"/api/weather/predict/{Guid.NewGuid()}", token);
        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PostPredict_WithDisasterOfficer_UnknownDistrict_ReturnsNotFound()
    {
        var token = GenerateTestToken("DisasterOfficer", Guid.NewGuid().ToString());
        // Unknown district ID — real endpoint returns 404 before touching agent
        var request = CreateAuthenticatedRequest(HttpMethod.Post, $"/api/weather/predict/{Guid.NewGuid()}", token);
        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task PostPredict_WithAdminRole_UnknownDistrict_ReturnsNotFound()
    {
        var token = GenerateTestToken("Admin", Guid.NewGuid().ToString());
        var request = CreateAuthenticatedRequest(HttpMethod.Post, $"/api/weather/predict/{Guid.NewGuid()}", token);
        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── Alert Review: workflow edge cases on real endpoint ────────────────────

    [Fact]
    public async Task PostReviewAlert_InvalidDecision_ReturnsBadRequest()
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
                HazardType = "Flood",
                Severity = "High",
                Message = "Test alert",
                Status = "PendingReview",
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        var token = GenerateTestToken("DisasterOfficer", Guid.NewGuid().ToString());
        var content = new StringContent(
            JsonSerializer.Serialize(new { decision = "InvalidDecision" }),
            Encoding.UTF8, "application/json");
        var request = CreateAuthenticatedRequest(HttpMethod.Post, $"/api/weather/alerts/{alertId}/review", token, content);
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task PostReviewAlert_UnknownAlert_ReturnsNotFound()
    {
        var token = GenerateTestToken("DisasterOfficer", Guid.NewGuid().ToString());
        var content = new StringContent(
            JsonSerializer.Serialize(new { decision = "Approved" }),
            Encoding.UTF8, "application/json");
        var request = CreateAuthenticatedRequest(HttpMethod.Post, $"/api/weather/alerts/{Guid.NewGuid()}/review", token, content);
        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task PostReviewAlert_AlreadyPublished_ReturnsBadRequest()
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
                HazardType = "Flood",
                Severity = "High",
                Message = "Already published",
                Status = "Published",
                PublishedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        var token = GenerateTestToken("DisasterOfficer", Guid.NewGuid().ToString());
        var content = new StringContent(
            JsonSerializer.Serialize(new { decision = "Approved" }),
            Encoding.UTF8, "application/json");
        var request = CreateAuthenticatedRequest(HttpMethod.Post, $"/api/weather/alerts/{alertId}/review", token, content);
        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task PostReviewAlert_Rejected_PublishedAtRemainsNull()
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
                Severity = "Moderate",
                Message = "Slope instability",
                Status = "PendingReview",
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        var officerId = Guid.NewGuid();
        var token = GenerateTestToken("DisasterOfficer", officerId.ToString());
        var content = new StringContent(
            JsonSerializer.Serialize(new { decision = "Rejected", reviewNotes = "Sensor reading error" }),
            Encoding.UTF8, "application/json");
        var request = CreateAuthenticatedRequest(HttpMethod.Post, $"/api/weather/alerts/{alertId}/review", token, content);
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<WeatherDbContext>();
            var saved = await db.WeatherAlerts.FindAsync(alertId);
            Assert.NotNull(saved);
            Assert.Equal("Rejected", saved.Status);
            Assert.Equal(officerId, saved.ReviewedByUserId);
            Assert.NotNull(saved.ReviewedAt);
            Assert.Null(saved.PublishedAt);                         // PublishedAt must remain null for rejections
        }
    }

    [Fact]
    public async Task PostReviewAlert_Approved_PopulatesAllAuditFields()
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
                Severity = "High",
                Message = "Gale-force winds forecast",
                Status = "PendingReview",
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        var officerId = Guid.NewGuid();
        var token = GenerateTestToken("DisasterOfficer", officerId.ToString());
        var content = new StringContent(
            JsonSerializer.Serialize(new { decision = "Approved", reviewNotes = "Confirmed by Met Office" }),
            Encoding.UTF8, "application/json");
        var request = CreateAuthenticatedRequest(HttpMethod.Post, $"/api/weather/alerts/{alertId}/review", token, content);
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // Verify response body
        var body = await response.Content.ReadAsStringAsync();
        using var jsonDoc = JsonDocument.Parse(body);
        var root = jsonDoc.RootElement;
        Assert.Equal("Published", root.GetProperty("status").GetString());
        Assert.NotNull(root.GetProperty("reviewedAt").GetString());
        Assert.NotNull(root.GetProperty("publishedAt").GetString());
        Assert.Equal(officerId.ToString(), root.GetProperty("reviewedByUserId").GetString());

        // Verify in database
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<WeatherDbContext>();
            var saved = await db.WeatherAlerts.FindAsync(alertId);
            Assert.NotNull(saved);
            Assert.Equal("Published", saved.Status);
            Assert.Equal(officerId, saved.ReviewedByUserId);
            Assert.NotNull(saved.ReviewedAt);
            Assert.NotNull(saved.PublishedAt);
            Assert.Contains("Confirmed by Met Office", saved.Message);
        }
    }

    // ── Outcome Recording Workflow: auth matrix ────────────────────────────────

    [Fact]
    public async Task PostOutcome_WithoutToken_ReturnsUnauthorized()
    {
        var content = new StringContent(
            JsonSerializer.Serialize(new { actualDisasterOccurred = true }),
            Encoding.UTF8, "application/json");
        var response = await _client.PostAsync($"/api/weather/predictions/{Guid.NewGuid()}/outcome", content);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task PostOutcome_WithCitizenRole_ReturnsForbidden()
    {
        var token = GenerateTestToken("Citizen", Guid.NewGuid().ToString());
        var content = new StringContent(
            JsonSerializer.Serialize(new { actualDisasterOccurred = true }),
            Encoding.UTF8, "application/json");
        var request = CreateAuthenticatedRequest(HttpMethod.Post, $"/api/weather/predictions/{Guid.NewGuid()}/outcome", token, content);
        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PostOutcome_WithResponderRole_ReturnsForbidden()
    {
        var token = GenerateTestToken("Responder", Guid.NewGuid().ToString());
        var content = new StringContent(
            JsonSerializer.Serialize(new { actualDisasterOccurred = false }),
            Encoding.UTF8, "application/json");
        var request = CreateAuthenticatedRequest(HttpMethod.Post, $"/api/weather/predictions/{Guid.NewGuid()}/outcome", token, content);
        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PostOutcome_UnknownPrediction_ReturnsNotFound()
    {
        var token = GenerateTestToken("DisasterOfficer", Guid.NewGuid().ToString());
        var content = new StringContent(
            JsonSerializer.Serialize(new { actualDisasterOccurred = true }),
            Encoding.UTF8, "application/json");
        var request = CreateAuthenticatedRequest(HttpMethod.Post, $"/api/weather/predictions/{Guid.NewGuid()}/outcome", token, content);
        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task PostOutcome_ValidDisasterOfficer_CreatesOutcomeWithRealConfirmerGuid()
    {
        // Seed a prediction
        var predictionId = Guid.NewGuid();
        var districtId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<WeatherDbContext>();
            db.Predictions.Add(new Prediction
            {
                Id = predictionId,
                DistrictId = districtId,
                AgentRunId = Guid.NewGuid(),
                HazardType = "Flood",
                RiskProbabilityPct = 82.0,
                ConfidencePct = 75.0,
                ForecastValue = 145.0,
                HistoricalThreshold = 100.0,
                Unit = "mm",
                Status = "Completed",
                CreatedAt = DateTime.UtcNow.AddHours(-2)
            });
            await db.SaveChangesAsync();
        }

        var officerId = Guid.NewGuid();
        var token = GenerateTestToken("DisasterOfficer", officerId.ToString());
        var content = new StringContent(
            JsonSerializer.Serialize(new
            {
                actualDisasterOccurred = true,
                actualValue = 138.5,
                notes = "Confirmed by DDMCU report"
            }),
            Encoding.UTF8, "application/json");
        var request = CreateAuthenticatedRequest(HttpMethod.Post, $"/api/weather/predictions/{predictionId}/outcome", token, content);
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // Verify response body fields
        var body = await response.Content.ReadAsStringAsync();
        using var jsonDoc = JsonDocument.Parse(body);
        var root = jsonDoc.RootElement;
        Assert.Equal(predictionId.ToString(), root.GetProperty("predictionId").GetString());
        Assert.True(root.GetProperty("actualDisasterOccurred").GetBoolean());
        Assert.Equal(138.5, root.GetProperty("actualValue").GetDouble());
        Assert.Equal(officerId.ToString(), root.GetProperty("confirmedByUserId").GetString());
        Assert.NotNull(root.GetProperty("confirmedAt").GetString());
        Assert.Equal("Confirmed by DDMCU report", root.GetProperty("notes").GetString());

        // Verify database persistence
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<WeatherDbContext>();
            var outcome = await db.ForecastHistory.FirstOrDefaultAsync(f => f.PredictionId == predictionId);
            Assert.NotNull(outcome);
            Assert.Equal(officerId, outcome.ConfirmedByUserId);
            Assert.NotEqual(Guid.Empty, outcome.ConfirmedByUserId!.Value);    // No fake/zero GUID
            Assert.True(outcome.ActualDisasterOccurred);
            Assert.Equal(138.5, outcome.ActualValue);
            Assert.NotNull(outcome.ConfirmedAt);
            Assert.Equal("Confirmed by DDMCU report", outcome.Notes);
        }
    }

    [Fact]
    public async Task PostOutcome_ValidAdminRole_PersistsOutcomeCorrectly()
    {
        var predictionId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<WeatherDbContext>();
            db.Predictions.Add(new Prediction
            {
                Id = predictionId,
                DistrictId = Guid.NewGuid(),
                AgentRunId = Guid.NewGuid(),
                HazardType = "Landslide",
                RiskProbabilityPct = 45.0,
                ConfidencePct = 68.0,
                ForecastValue = 80.0,
                HistoricalThreshold = 120.0,
                Unit = "mm",
                Status = "Completed",
                CreatedAt = DateTime.UtcNow.AddHours(-1)
            });
            await db.SaveChangesAsync();
        }

        var adminId = Guid.NewGuid();
        var token = GenerateTestToken("Admin", adminId.ToString());
        var content = new StringContent(
            JsonSerializer.Serialize(new { actualDisasterOccurred = false, actualValue = 72.3 }),
            Encoding.UTF8, "application/json");
        var request = CreateAuthenticatedRequest(HttpMethod.Post, $"/api/weather/predictions/{predictionId}/outcome", token, content);
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<WeatherDbContext>();
            var outcome = await db.ForecastHistory.FirstOrDefaultAsync(f => f.PredictionId == predictionId);
            Assert.NotNull(outcome);
            Assert.Equal(adminId, outcome.ConfirmedByUserId);
            Assert.False(outcome.ActualDisasterOccurred);
        }
    }

    [Fact]
    public async Task PostOutcome_DuplicateOutcome_ReturnsConflict()
    {
        var predictionId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<WeatherDbContext>();
            db.Predictions.Add(new Prediction
            {
                Id = predictionId,
                DistrictId = Guid.NewGuid(),
                AgentRunId = Guid.NewGuid(),
                HazardType = "StrongWind",
                RiskProbabilityPct = 65.0,
                ConfidencePct = 70.0,
                ForecastValue = 90.0,
                HistoricalThreshold = 80.0,
                Unit = "km/h",
                Status = "Completed",
                CreatedAt = DateTime.UtcNow.AddHours(-3)
            });
            // Seed the existing outcome — simulates duplicate
            db.ForecastHistory.Add(new ForecastHistory
            {
                PredictionId = predictionId,
                ActualDisasterOccurred = true,
                ConfirmedByUserId = Guid.NewGuid(),
                ConfirmedAt = DateTime.UtcNow.AddMinutes(-30)
            });
            await db.SaveChangesAsync();
        }

        var token = GenerateTestToken("DisasterOfficer", Guid.NewGuid().ToString());
        var content = new StringContent(
            JsonSerializer.Serialize(new { actualDisasterOccurred = false }),
            Encoding.UTF8, "application/json");
        var request = CreateAuthenticatedRequest(HttpMethod.Post, $"/api/weather/predictions/{predictionId}/outcome", token, content);
        var response = await _client.SendAsync(request);

        // Must return 409 Conflict — no silent overwrite
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("already been recorded", body);
    }

    [Fact]
    public async Task PostOutcome_MissingConfirmerClaim_ReturnsUnauthorized()
    {
        var predictionId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<WeatherDbContext>();
            db.Predictions.Add(new Prediction
            {
                Id = predictionId,
                DistrictId = Guid.NewGuid(),
                AgentRunId = Guid.NewGuid(),
                HazardType = "Flood",
                RiskProbabilityPct = 55.0,
                ConfidencePct = 72.0,
                ForecastValue = 110.0,
                HistoricalThreshold = 100.0,
                Unit = "mm",
                Status = "Completed",
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        // Token with DisasterOfficer role but NO NameIdentifier (sub) claim
        var token = GenerateTestToken("DisasterOfficer", userId: null);
        var content = new StringContent(
            JsonSerializer.Serialize(new { actualDisasterOccurred = true }),
            Encoding.UTF8, "application/json");
        var request = CreateAuthenticatedRequest(HttpMethod.Post, $"/api/weather/predictions/{predictionId}/outcome", token, content);
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}

// ──────────────────────────────────────────────────────────────────────────
// 5. /predict Pipeline Error-Path & Workflow Integration Tests
//    Uses custom WebApplicationFactory per test so each test controls what
//    OpenMeteoService and WeatherAgentClient return via fake HTTP handlers.
// ──────────────────────────────────────────────────────────────────────────

/// <summary>
/// A deterministic HttpMessageHandler that always returns a pre-built response.
/// Used to inject controlled responses into typed HttpClient services during tests.
/// </summary>
internal sealed class StaticHandler : HttpMessageHandler
{
    private readonly HttpResponseMessage _response;
    public StaticHandler(HttpResponseMessage response) => _response = response;
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        => Task.FromResult(_response);
}

public class WeatherPredictPipelineIntegrationTests
{
    // ── Helper: build a factory with controlled open-meteo + agent responses ──

    private static WebApplicationFactory<Program> BuildFactory(
        HttpResponseMessage? openMeteoResponse,
        HttpResponseMessage? agentResponse)
    {
        var databaseName = $"WeatherPredictPipelineTests-{Guid.NewGuid():N}";
        return new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureServices(services =>
            {
                // ── Replace WeatherDbContext with InMemory ──────────────────
                var toRemove = services.Where(d =>
                    d.ServiceType == typeof(DbContextOptions<WeatherDbContext>) ||
                    d.ServiceType == typeof(WeatherDbContext) ||
                    d.ServiceType.FullName?.Contains("WeatherDbContext") == true).ToList();
                foreach (var d in toRemove) services.Remove(d);

                var inMemoryProvider = new ServiceCollection()
                    .AddEntityFrameworkInMemoryDatabase()
                    .BuildServiceProvider();
                services.AddDbContext<WeatherDbContext>(options =>
                {
                    options.UseInMemoryDatabase(databaseName);
                    options.UseInternalServiceProvider(inMemoryProvider);
                });

                // ── Replace OpenMeteoService HttpClient ────────────────────
                if (openMeteoResponse != null)
                {
                    var toRemoveOpenMeteo = services
                        .Where(d => d.ServiceType == typeof(HttpMessageHandler) ||
                                    (d.ImplementationInstance is HttpMessageHandler) ||
                                    (d.ServiceType.Name.Contains("ITypedHttpClientFactory") &&
                                     d.ServiceType.GenericTypeArguments.Any(t => t == typeof(OpenMeteoService))))
                        .ToList();

                    // Remove existing typed client registrations for OpenMeteoService and WeatherAgentClient
                    var openMeteoDescriptors = services
                        .Where(d => d.ServiceType == typeof(OpenMeteoService))
                        .ToList();
                    foreach (var d in openMeteoDescriptors) services.Remove(d);

                    services.AddHttpClient<OpenMeteoService>()
                        .ConfigurePrimaryHttpMessageHandler(() => new StaticHandler(openMeteoResponse));
                }

                // ── Replace WeatherAgentClient HttpClient ──────────────────
                if (agentResponse != null)
                {
                    var agentDescriptors = services
                        .Where(d => d.ServiceType == typeof(WeatherAgentClient))
                        .ToList();
                    foreach (var d in agentDescriptors) services.Remove(d);

                    services.AddHttpClient<WeatherAgentClient>(client =>
                        client.BaseAddress = new Uri("http://127.0.0.1:8001"))
                        .ConfigurePrimaryHttpMessageHandler(() => new StaticHandler(agentResponse));
                }
            });
        });
    }

    private static string MakeOpenMeteoJson() =>
        """
        {
          "daily": {
            "precipitation_sum": [25.0, 30.0, 20.0],
            "wind_speed_10m_max":  [45.0, 50.0, 40.0]
          }
        }
        """;

    private static string MakeAgentSuccessJson(string action = "publish_alert") =>
        JsonSerializer.Serialize(new
        {
            overall_status = "Success",
            hazards = new[]
            {
                new {
                    hazard_type = "Flood",
                    risk_probability_pct = 85.0,
                    confidence_pct = 80.0,
                    reasoning_summary = "Heavy rainfall exceeds flood threshold.",
                    recommended_action = action
                }
            },
            steps = new object[] { },
            error = (string?)null
        });

    private static string MakeAgentFailedJson() =>
        JsonSerializer.Serialize(new
        {
            overall_status = "Failed",
            hazards = new object[] { },
            steps = new object[] { },
            error = "LLM timeout"
        });

    private static async Task<Guid> SeedDistrictWithBaselineAsync(
        WebApplicationFactory<Program> factory)
    {
        var districtId = Guid.NewGuid();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<WeatherDbContext>();
        db.Districts.Add(new District
        {
            Id = districtId, Name = "TestDistrict",
            Province = "Western", Latitude = 6.9, Longitude = 79.8,
            IsLandslideProne = false
        });
        db.HistoricalWeather.Add(new HistoricalWeather
        {
            DistrictId = districtId, Month = DateTime.UtcNow.Month,
            AvgRainfallMm = 80, FloodThresholdMm = 60,
            HighWindThresholdKmh = 80
        });
        await db.SaveChangesAsync();
        return districtId;
    }

    private static string MakeToken(string role = "DisasterOfficer", string? userId = null, bool includeNameIdentifier = true)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(JwtTokenService.DefaultDevSigningKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claimsList = new List<Claim>
        {
            new Claim(ClaimTypes.Role, role),
            new Claim("role", role)
        };
        if (includeNameIdentifier)
        {
            var id = userId ?? Guid.NewGuid().ToString();
            claimsList.Add(new Claim(ClaimTypes.NameIdentifier, id));
            claimsList.Add(new Claim("sub", id));
        }
        var token = new JwtSecurityTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claimsList),
            Expires = DateTime.UtcNow.AddHours(2),
            Issuer = "Aegis.Api", Audience = "Aegis.Client",
            SigningCredentials = creds
        });
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    // ── Test: OpenMeteo returns error → 503 Service Unavailable ──────────────

    [Fact]
    public async Task PostPredict_WhenOpenMeteoFails_Returns503()
    {
        var factory = BuildFactory(
            openMeteoResponse: new HttpResponseMessage(HttpStatusCode.ServiceUnavailable),
            agentResponse: null);

        var districtId = await SeedDistrictWithBaselineAsync(factory);
        using var client = factory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Post, $"/api/weather/predict/{districtId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", MakeToken());
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }

    // ── Test: District exists but no historical baseline → 500 ────────────────

    [Fact]
    public async Task PostPredict_WhenNoHistoricalBaseline_Returns500()
    {
        // Build factory with a working open-meteo mock but no baseline seeded
        var factory = BuildFactory(
            openMeteoResponse: new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(MakeOpenMeteoJson(), Encoding.UTF8, "application/json")
            },
            agentResponse: null);

        // Seed district only — deliberately no HistoricalWeather row
        var districtId = Guid.NewGuid();
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<WeatherDbContext>();
            db.Districts.Add(new District
            {
                Id = districtId, Name = "NoBaselineDistrict",
                Province = "Northern", Latitude = 9.6, Longitude = 80.0,
                IsLandslideProne = false
            });
            await db.SaveChangesAsync();
        }

        using var client = factory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Post, $"/api/weather/predict/{districtId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", MakeToken());
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
    }

    // ── Test: Agent returns failure → 502 and AgentExecutionLog saved as Failed

    [Fact]
    public async Task PostPredict_WhenAgentFails_Returns502AndLogsFailure()
    {
        var factory = BuildFactory(
            openMeteoResponse: new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(MakeOpenMeteoJson(), Encoding.UTF8, "application/json")
            },
            agentResponse: new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(MakeAgentFailedJson(), Encoding.UTF8, "application/json")
            });

        var districtId = await SeedDistrictWithBaselineAsync(factory);
        using var client = factory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Post, $"/api/weather/predict/{districtId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", MakeToken());
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);

        // Verify AgentExecutionLog is persisted with OverallStatus = "Failed"
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<WeatherDbContext>();
        var log = await db.AgentExecutionLogs
            .Where(l => l.DistrictId == districtId)
            .FirstOrDefaultAsync();
        Assert.NotNull(log);
        Assert.Equal("Failed", log.OverallStatus);
        Assert.NotNull(log.ErrorMessage);
        Assert.NotEmpty(log.ErrorMessage);
    }

    // ── Test: Agent returns null (unreachable) → 502 and AgentExecutionLog saved

    [Fact]
    public async Task PostPredict_WhenAgentUnreachable_Returns502AndLogsFailure()
    {
        var factory = BuildFactory(
            openMeteoResponse: new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(MakeOpenMeteoJson(), Encoding.UTF8, "application/json")
            },
            // Agent returns 503 → WeatherAgentClient.AssessAsync returns null
            agentResponse: new HttpResponseMessage(HttpStatusCode.ServiceUnavailable));

        var districtId = await SeedDistrictWithBaselineAsync(factory);
        using var client = factory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Post, $"/api/weather/predict/{districtId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", MakeToken());
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);

        // Verify AgentExecutionLog is saved with failure info
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<WeatherDbContext>();
        var log = await db.AgentExecutionLogs
            .Where(l => l.DistrictId == districtId)
            .FirstOrDefaultAsync();
        Assert.NotNull(log);
        Assert.Equal("Failed", log.OverallStatus);
        Assert.Contains("unreachable", log.ErrorMessage, StringComparison.OrdinalIgnoreCase);
    }

    // ── Test: Successful prediction run creates Prediction + AgentExecutionLog ─

    [Fact]
    public async Task PostPredict_WhenAgentSucceeds_CreatesPredictionAndAgentLog()
    {
        var factory = BuildFactory(
            openMeteoResponse: new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(MakeOpenMeteoJson(), Encoding.UTF8, "application/json")
            },
            agentResponse: new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(MakeAgentSuccessJson("no_action"), Encoding.UTF8, "application/json")
            });

        var districtId = await SeedDistrictWithBaselineAsync(factory);
        using var client = factory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Post, $"/api/weather/predict/{districtId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", MakeToken());
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // Response body must include AgentRunId
        var body = await response.Content.ReadAsStringAsync();
        using var jsonDoc = JsonDocument.Parse(body);
        Assert.True(jsonDoc.RootElement.TryGetProperty("agentRunId", out var runIdEl));
        var agentRunId = Guid.Parse(runIdEl.GetString()!);

        // Verify database state
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<WeatherDbContext>();

        var prediction = await db.Predictions
            .Where(p => p.DistrictId == districtId && p.AgentRunId == agentRunId)
            .FirstOrDefaultAsync();
        Assert.NotNull(prediction);
        Assert.Equal("Flood", prediction.HazardType);
        Assert.Equal(85.0, prediction.RiskProbabilityPct);
        Assert.Equal("Completed", prediction.Status);

        var log = await db.AgentExecutionLogs.FindAsync(agentRunId);
        Assert.NotNull(log);
        Assert.Equal("Success", log.OverallStatus);
        Assert.Equal(districtId, log.DistrictId);
        Assert.NotNull(log.CompletedAt);
    }

    // ── Test: publish_alert action creates a Published WeatherAlert ───────────

    [Fact]
    public async Task PostPredict_WhenPublishAlert_CreatesPublishedAlert()
    {
        var factory = BuildFactory(
            openMeteoResponse: new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(MakeOpenMeteoJson(), Encoding.UTF8, "application/json")
            },
            agentResponse: new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(MakeAgentSuccessJson("publish_alert"), Encoding.UTF8, "application/json")
            });

        var districtId = await SeedDistrictWithBaselineAsync(factory);
        using var client = factory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Post, $"/api/weather/predict/{districtId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", MakeToken());
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<WeatherDbContext>();
        var alert = await db.WeatherAlerts
            .Where(a => a.DistrictId == districtId && a.HazardType == "Flood")
            .FirstOrDefaultAsync();

        Assert.NotNull(alert);
        Assert.Equal("Published", alert.Status);
        Assert.NotNull(alert.PublishedAt);
        Assert.Equal("High", alert.Severity); // 85% risk → High
    }

    // ── Test: flag_for_review action creates a PendingReview alert ────────────

    [Fact]
    public async Task PostPredict_WhenFlagForReview_CreatesPendingReviewAlert()
    {
        var factory = BuildFactory(
            openMeteoResponse: new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(MakeOpenMeteoJson(), Encoding.UTF8, "application/json")
            },
            agentResponse: new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(MakeAgentSuccessJson("flag_for_review"), Encoding.UTF8, "application/json")
            });

        var districtId = await SeedDistrictWithBaselineAsync(factory);
        using var client = factory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Post, $"/api/weather/predict/{districtId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", MakeToken());
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<WeatherDbContext>();
        var alert = await db.WeatherAlerts
            .Where(a => a.DistrictId == districtId && a.HazardType == "Flood")
            .FirstOrDefaultAsync();

        Assert.NotNull(alert);
        Assert.Equal("PendingReview", alert.Status);
        Assert.Null(alert.PublishedAt);      // Not published until an officer reviews it
    }

    // ── Test: 24-hour duplicate alert deduplication rule ──────────────────────

    [Fact]
    public async Task PostPredict_SecondRunWithin24h_SkipsDuplicateAlert()
    {
        var factory = BuildFactory(
            openMeteoResponse: new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(MakeOpenMeteoJson(), Encoding.UTF8, "application/json")
            },
            agentResponse: new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(MakeAgentSuccessJson("publish_alert"), Encoding.UTF8, "application/json")
            });

        var districtId = await SeedDistrictWithBaselineAsync(factory);

        // Pre-seed a Published Flood alert created 1 hour ago — within the 24h window
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<WeatherDbContext>();
            db.WeatherAlerts.Add(new WeatherAlert
            {
                DistrictId = districtId,
                PredictionId = Guid.NewGuid(),
                HazardType = "Flood",
                Severity = "High",
                Message = "Existing flood alert within 24h window",
                Status = "Published",
                PublishedAt = DateTime.UtcNow.AddHours(-1),   // 1 hour ago — within 24h
                CreatedAt = DateTime.UtcNow.AddHours(-1)
            });
            await db.SaveChangesAsync();
        }

        using var client = factory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Post, $"/api/weather/predict/{districtId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", MakeToken());
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // Verify the response body reports SkippedDuplicate
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("SkippedDuplicate", body, StringComparison.OrdinalIgnoreCase);

        // Verify that the DB still has exactly one Flood alert for this district
        using var scope2 = factory.Services.CreateScope();
        var db2 = scope2.ServiceProvider.GetRequiredService<WeatherDbContext>();
        var alertCount = await db2.WeatherAlerts
            .Where(a => a.DistrictId == districtId && a.HazardType == "Flood")
            .CountAsync();
        Assert.Equal(1, alertCount); // The existing one — no duplicate was created
    }

    // ── Test: Second run AFTER 24h window DOES create a new alert ─────────────

    [Fact]
    public async Task PostPredict_SecondRunAfter24h_CreatesNewAlert()
    {
        var factory = BuildFactory(
            openMeteoResponse: new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(MakeOpenMeteoJson(), Encoding.UTF8, "application/json")
            },
            agentResponse: new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(MakeAgentSuccessJson("publish_alert"), Encoding.UTF8, "application/json")
            });

        var districtId = await SeedDistrictWithBaselineAsync(factory);

        // Pre-seed a Published Flood alert created 25 hours ago — outside the 24h window
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<WeatherDbContext>();
            db.WeatherAlerts.Add(new WeatherAlert
            {
                DistrictId = districtId,
                PredictionId = Guid.NewGuid(),
                HazardType = "Flood",
                Severity = "High",
                Message = "Old flood alert outside 24h window",
                Status = "Published",
                PublishedAt = DateTime.UtcNow.AddHours(-25),   // 25 hours ago — outside window
                CreatedAt = DateTime.UtcNow.AddHours(-25)
            });
            await db.SaveChangesAsync();
        }

        using var client = factory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Post, $"/api/weather/predict/{districtId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", MakeToken());
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // A new Flood alert should have been created (total = 2)
        using var scope2 = factory.Services.CreateScope();
        var db2 = scope2.ServiceProvider.GetRequiredService<WeatherDbContext>();
        var alertCount = await db2.WeatherAlerts
            .Where(a => a.DistrictId == districtId && a.HazardType == "Flood")
            .CountAsync();
        Assert.Equal(2, alertCount); // Old one + the new one
    }

    // ── Test: Missing NameIdentifier claim → 401 Unauthorized ─────────────────

    [Fact]
    public async Task PostPredict_MissingNameIdentifier_Returns401()
    {
        var factory = BuildFactory(
            openMeteoResponse: new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(MakeOpenMeteoJson(), Encoding.UTF8, "application/json")
            },
            agentResponse: null);

        var districtId = await SeedDistrictWithBaselineAsync(factory);
        using var client = factory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Post, $"/api/weather/predict/{districtId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", MakeToken(includeNameIdentifier: false));
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── Test: Non-GUID NameIdentifier claim → 401 Unauthorized ────────────────

    [Fact]
    public async Task PostPredict_NonGuidNameIdentifier_Returns401()
    {
        var factory = BuildFactory(
            openMeteoResponse: new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(MakeOpenMeteoJson(), Encoding.UTF8, "application/json")
            },
            agentResponse: null);

        var districtId = await SeedDistrictWithBaselineAsync(factory);
        using var client = factory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Post, $"/api/weather/predict/{districtId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", MakeToken(userId: "not-a-valid-guid"));
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── Test: Valid NameIdentifier persists TriggeredByUserId in AgentLog ─────

    [Fact]
    public async Task PostPredict_ValidNameIdentifier_PersistsTriggeredByUserIdInAgentLog()
    {
        var expectedUserId = Guid.NewGuid();
        var factory = BuildFactory(
            openMeteoResponse: new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(MakeOpenMeteoJson(), Encoding.UTF8, "application/json")
            },
            agentResponse: new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(MakeAgentSuccessJson("no_action"), Encoding.UTF8, "application/json")
            });

        var districtId = await SeedDistrictWithBaselineAsync(factory);
        using var client = factory.CreateClient();
        var request = new HttpRequestMessage(HttpMethod.Post, $"/api/weather/predict/{districtId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", MakeToken(userId: expectedUserId.ToString()));
        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        using var jsonDoc = JsonDocument.Parse(body);
        var agentRunId = Guid.Parse(jsonDoc.RootElement.GetProperty("agentRunId").GetString()!);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<WeatherDbContext>();
        var log = await db.AgentExecutionLogs.FindAsync(agentRunId);
        Assert.NotNull(log);
        Assert.Equal(expectedUserId, log.TriggeredByUserId);
    }
}
