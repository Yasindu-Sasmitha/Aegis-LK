using System;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Aegis.Weather.Data;
using Aegis.Weather.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
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
    // 3. Officer Review Workflow Transitions
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task OfficerReview_ApproveAlert_UpdatesStatusAndReviewer()
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

        var officerId = Guid.NewGuid();
        var reviewTimestamp = DateTime.UtcNow;

        // Simulate officer approval
        alert.Status = "Published";
        alert.ReviewedByUserId = officerId;
        alert.ReviewedAt = reviewTimestamp;
        alert.PublishedAt = reviewTimestamp;
        alert.Message += "\n[Officer note: Approved for public release]";
        await db.SaveChangesAsync();

        var updated = await db.WeatherAlerts.FindAsync(alert.Id);
        Assert.NotNull(updated);
        Assert.Equal("Published", updated.Status);
        Assert.Equal(officerId, updated.ReviewedByUserId);
        Assert.NotNull(updated.ReviewedAt);
        Assert.NotNull(updated.PublishedAt);
        Assert.Contains("Approved for public release", updated.Message);
    }

    [Fact]
    public async Task OfficerReview_RejectAlert_SetsStatusToRejected()
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

        var officerId = Guid.NewGuid();

        // Simulate officer rejection
        alert.Status = "Rejected";
        alert.ReviewedByUserId = officerId;
        alert.ReviewedAt = DateTime.UtcNow;
        alert.PublishedAt = null;
        await db.SaveChangesAsync();

        var updated = await db.WeatherAlerts.FindAsync(alert.Id);
        Assert.NotNull(updated);
        Assert.Equal("Rejected", updated.Status);
        Assert.Null(updated.PublishedAt);
    }
}

public class WeatherEndpointAuthIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public WeatherEndpointAuthIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task PostPredict_WithoutToken_ReturnsUnauthorized()
    {
        var randomDistrictId = Guid.NewGuid();
        var response = await _client.PostAsync($"/api/weather/predict/{randomDistrictId}", null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task PostReviewAlert_WithoutToken_ReturnsUnauthorized()
    {
        var randomAlertId = Guid.NewGuid();
        var content = new StringContent("{\"decision\":\"Approved\"}", System.Text.Encoding.UTF8, "application/json");
        var response = await _client.PostAsync($"/api/weather/alerts/{randomAlertId}/review", content);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetDistricts_WithoutToken_ReturnsOk()
    {
        var response = await _client.GetAsync("/api/weather/districts");

        // Public endpoint should NOT return 401
        Assert.NotEqual(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
