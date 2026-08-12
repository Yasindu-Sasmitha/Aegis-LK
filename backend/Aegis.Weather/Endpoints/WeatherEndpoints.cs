using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Aegis.Weather.Data;
using Aegis.Weather.Services;

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
    }
}