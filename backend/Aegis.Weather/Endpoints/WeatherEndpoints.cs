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

        group.MapPost("/alerts/{id:guid}/review", async (Guid id, AlertReviewRequest body, WeatherDbContext db) =>
        {
            if (body.Decision is not ("Approved" or "Rejected"))
                return Results.BadRequest(new { error = "Decision must be 'Approved' or 'Rejected'." });

            var alert = await db.WeatherAlerts.FindAsync(id);
            if (alert is null) return Results.NotFound();
            if (alert.Status != "PendingReview")
                return Results.BadRequest(new { error = $"Alert is not PendingReview — current status: {alert.Status}" });

            // Stub reviewer GUID — replace with real JWT claim once Aegis.Shared wires up auth
            alert.ReviewedByUserId = Guid.Parse("00000000-0000-0000-0000-000000000001");
            alert.ReviewedAt = DateTime.UtcNow;

            if (body.Decision == "Approved")
            {
                alert.Status = "Published";
                alert.PublishedAt = DateTime.UtcNow;
            }
            else
            {
                alert.Status = "Rejected";
            }

            if (!string.IsNullOrWhiteSpace(body.ReviewNotes))
                alert.Message += $"\n[Officer note: {body.ReviewNotes}]";

            await db.SaveChangesAsync();
            return Results.Ok(new
            {
                alert.Id, alert.HazardType, alert.Status,
                alert.ReviewedAt, alert.PublishedAt, alert.ReviewedByUserId
            });
        });

        group.MapGet("/alerts", async (
            WeatherDbContext db,
            string? status,
            Guid? districtId,
            string? hazardType,
            int page = 1,
            int pageSize = 20) =>
        {
            var query = db.WeatherAlerts
                .Include(a => a.District)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(a => a.Status == status);
            if (districtId.HasValue)
                query = query.Where(a => a.DistrictId == districtId.Value);
            if (!string.IsNullOrWhiteSpace(hazardType))
                query = query.Where(a => a.HazardType == hazardType);

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(a => a.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new
                {
                    a.Id, a.DistrictId,
                    DistrictName = a.District != null ? a.District.Name : null,
                    a.HazardType, a.Severity, a.Message, a.Status,
                    a.ReviewedByUserId, a.ReviewedAt, a.PublishedAt, a.CreatedAt
                })
                .ToListAsync();

            return Results.Ok(new { total, page, pageSize, items });
        });

        group.MapGet("/analytics/accuracy", async (WeatherDbContext db) =>
        {
            var predictions = await db.Predictions.ToListAsync();
            var outcomes = await db.ForecastHistory.ToListAsync();
            var outcomeMap = outcomes.ToDictionary(o => o.PredictionId);

            int totalPredictions = predictions.Count;
            int withOutcome = 0, correct = 0;
            var byHazard = new Dictionary<string, (int total, int withOutcome, int correct)>();

            foreach (var p in predictions)
            {
                if (!byHazard.ContainsKey(p.HazardType)) byHazard[p.HazardType] = (0, 0, 0);
                var (ht, hwO, hc) = byHazard[p.HazardType];
                ht++;

                if (outcomeMap.TryGetValue(p.Id, out var outcome) && outcome.ActualDisasterOccurred.HasValue)
                {
                    withOutcome++; hwO++;
                    bool predictedRisk = p.RiskProbabilityPct >= 50;
                    bool actualRisk = outcome.ActualDisasterOccurred.Value;
                    if (predictedRisk == actualRisk) { correct++; hc++; }
                }
                byHazard[p.HazardType] = (ht, hwO, hc);
            }

            double overallAccuracy = withOutcome == 0 ? 0 : Math.Round((double)correct / withOutcome * 100, 1);
            var byHazardResult = byHazard.Select(kvp => new
            {
                hazardType = kvp.Key,
                total = kvp.Value.total,
                withOutcomeRecorded = kvp.Value.withOutcome,
                correct = kvp.Value.correct,
                accuracyPct = kvp.Value.withOutcome == 0
                    ? 0 : Math.Round((double)kvp.Value.correct / kvp.Value.withOutcome * 100, 1)
            }).ToList();

            return Results.Ok(new
            {
                totalPredictions,
                withOutcomeRecorded = withOutcome,
                correctPredictions = correct,
                accuracyPct = overallAccuracy,
                byHazardType = byHazardResult
            });
        });
    }
}

public record AlertReviewRequest(string Decision, string? ReviewNotes);