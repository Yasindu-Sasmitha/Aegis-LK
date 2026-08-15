using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Aegis.Weather.Data;
using Aegis.Weather.Services;
using Aegis.Weather.Models;

namespace Aegis.Weather.Endpoints;

public static class WeatherEndpoints
{
    public static void MapWeatherEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/weather").WithTags("Weather");

        group.MapGet("/districts", async (WeatherDbContext db) =>
            await db.Districts.OrderBy(d => d.Name).ToListAsync());

        group.MapGet("/districts/{districtId:guid}/historical", async (Guid districtId, WeatherDbContext db) =>
        {
            var data = await db.HistoricalWeather.Where(h => h.DistrictId == districtId).ToListAsync();
            return data.Count == 0 ? Results.NotFound() : Results.Ok(data);
        });
        group.MapGet("/forecast/{districtId:guid}", async (Guid districtId, WeatherDbContext db, OpenMeteoService openMeteo) =>
        {
            var district = await db.Districts.FindAsync(districtId);
            if (district is null) return Results.NotFound();

            var forecast = await openMeteo.GetForecastAsync(district.Latitude, district.Longitude);
            if (forecast is null) return Results.Problem("Weather service unavailable, try again shortly.", statusCode: 503);

            var baseline = await db.HistoricalWeather
                .Where(h => h.DistrictId == districtId && h.Month == DateTime.UtcNow.Month)
                .FirstOrDefaultAsync();

            return Results.Ok(new
            {
                district.Name,
                district.IsLandslideProne,
                forecast.RainfallMmNext3Days,
                forecast.WindSpeedKmhNext3Days,
                forecast.FetchedAt,
                FloodThresholdMm = baseline?.FloodThresholdMm,
                LandslideThresholdMm = baseline?.LandslideThresholdMm,
                HighWindThresholdKmh = baseline?.HighWindThresholdKmh,
                HistoricalAvgRainfallMm = baseline?.AvgRainfallMm
            });
        });

        group.MapPost("/predict/{districtId:guid}", async (Guid districtId, WeatherDbContext db, OpenMeteoService openMeteo, WeatherAgentClient agentClient) =>
        {
            var runStarted = DateTime.UtcNow;
            var district = await db.Districts.FindAsync(districtId);
            if (district is null) return Results.NotFound();

            var forecast = await openMeteo.GetForecastAsync(district.Latitude, district.Longitude);
            if (forecast is null)
                return Results.Problem("Weather service unavailable, try again shortly.", statusCode: 503);

            var baseline = await db.HistoricalWeather
                .Where(h => h.DistrictId == districtId && h.Month == DateTime.UtcNow.Month)
                .FirstOrDefaultAsync();
            if (baseline is null)
                return Results.Problem("No historical baseline seeded for this district/month.", statusCode: 500);

            var agentResult = await agentClient.AssessAsync(new AssessRequestDto
            {
                DistrictId = districtId.ToString(),
                DistrictName = district.Name,
                IsLandslideProne = district.IsLandslideProne,
                ForecastRainfallMm = forecast.RainfallMmNext3Days.ToList(),
                ForecastWindKmh = forecast.WindSpeedKmhNext3Days.ToList(),
                FloodThresholdMm = baseline.FloodThresholdMm,
                LandslideThresholdMm = baseline.LandslideThresholdMm,
                WindThresholdKmh = baseline.HighWindThresholdKmh
            });

            var agentRunId = Guid.NewGuid();
            var completedAt = DateTime.UtcNow;

            if (agentResult is null || agentResult.OverallStatus != "Success")
            {
                db.AgentExecutionLogs.Add(new AgentExecutionLog
                {
                    Id = agentRunId, DistrictId = districtId, TriggerType = "Manual",
                    OverallStatus = "Failed", ErrorMessage = agentResult?.Error ?? "Agent service unreachable",
                    StartedAt = runStarted, CompletedAt = completedAt, StepsJson = "[]"
                });
                await db.SaveChangesAsync();
                return Results.Problem("Agent assessment failed — logged for review.", statusCode: 502);
            }

            db.AgentExecutionLogs.Add(new AgentExecutionLog
            {
                Id = agentRunId, DistrictId = districtId, TriggerType = "Manual", OverallStatus = "Success",
                StartedAt = runStarted, CompletedAt = completedAt,
                StepsJson = System.Text.Json.JsonSerializer.Serialize(agentResult.Steps)
            });

            var results = new List<object>();

            foreach (var hazard in agentResult.Hazards)
            {
                var prediction = new Prediction
                {
                    DistrictId = districtId, AgentRunId = agentRunId, HazardType = hazard.HazardType,
                    RiskProbabilityPct = hazard.RiskProbabilityPct, ConfidencePct = hazard.ConfidencePct,
                    ForecastValue = hazard.HazardType == "StrongWind" ? forecast.WindSpeedKmhNext3Days.Max() : forecast.RainfallMmNext3Days.Sum(),
                    HistoricalThreshold = hazard.HazardType switch
                    {
                        "Flood" => baseline.FloodThresholdMm,
                        "Landslide" => baseline.LandslideThresholdMm ?? 0,
                        "StrongWind" => baseline.HighWindThresholdKmh,
                        _ => 0
                    },
                    Unit = hazard.HazardType == "StrongWind" ? "km/h" : "mm",
                    Status = "Completed"
                };
                db.Predictions.Add(prediction);

                if (hazard.RecommendedAction is "publish_alert" or "flag_for_review")
                {
                    var recentDuplicate = await db.WeatherAlerts.AnyAsync(a =>
                        a.DistrictId == districtId && a.HazardType == hazard.HazardType &&
                        a.Status == "Published" && a.PublishedAt > DateTime.UtcNow.AddHours(-24));

                    if (!recentDuplicate)
                    {
                        var alert = new WeatherAlert
                        {
                            DistrictId = districtId, PredictionId = prediction.Id, HazardType = hazard.HazardType,
                            Severity = hazard.RiskProbabilityPct >= 70 ? "High" : "Moderate",
                            Message = hazard.ReasoningSummary,
                            Status = hazard.RecommendedAction == "publish_alert" ? "Published" : "PendingReview",
                            PublishedAt = hazard.RecommendedAction == "publish_alert" ? DateTime.UtcNow : null
                        };
                        db.WeatherAlerts.Add(alert);
                        results.Add(new { prediction.HazardType, prediction.RiskProbabilityPct, AlertStatus = alert.Status });
                    }
                    else results.Add(new { prediction.HazardType, prediction.RiskProbabilityPct, AlertStatus = "SkippedDuplicate" });
                }
                else results.Add(new { prediction.HazardType, prediction.RiskProbabilityPct, AlertStatus = "NoAlertNeeded" });
            }

            await db.SaveChangesAsync();
            return Results.Ok(new { district.Name, AgentRunId = agentRunId, Results = results });
        });
    }
}