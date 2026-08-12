using Microsoft.EntityFrameworkCore;
using Aegis.Weather.Models;

namespace Aegis.Weather.Data;

public static class WeatherDataSeeder
{
    public static async Task SeedAsync(WeatherDbContext context)
    {
        if (await context.Districts.AnyAsync()) return;

        var landslideProne = new HashSet<string> { "Kandy", "Matale", "Nuwara Eliya", "Badulla", "Kegalle", "Ratnapura" };

        var districts = new (string Name, string Province, double Lat, double Lon, double AvgRainfall, double FloodThreshold)[]
        {
            ("Colombo", "Western", 6.9271, 79.8612, 55, 90),
            ("Gampaha", "Western", 7.0873, 80.0144, 50, 85),
            ("Kalutara", "Western", 6.5854, 79.9607, 60, 95),
            ("Kandy", "Central", 7.2906, 80.6337, 45, 80),
            ("Matale", "Central", 7.4675, 80.6234, 40, 75),
            ("Nuwara Eliya", "Central", 6.9497, 80.7891, 65, 100),
            ("Galle", "Southern", 6.0535, 80.2210, 55, 90),
            ("Matara", "Southern", 5.9549, 80.5550, 50, 88),
            ("Hambantota", "Southern", 6.1241, 81.1185, 30, 65),
            ("Jaffna", "Northern", 9.6615, 80.0255, 25, 60),
            ("Kilinochchi", "Northern", 9.3803, 80.3770, 28, 62),
            ("Mannar", "Northern", 8.9810, 79.9044, 25, 58),
            ("Vavuniya", "Northern", 8.7514, 80.4971, 30, 65),
            ("Mullaitivu", "Northern", 9.2670, 80.8142, 28, 62),
            ("Batticaloa", "Eastern", 7.7170, 81.7000, 45, 80),
            ("Ampara", "Eastern", 7.2975, 81.6747, 40, 75),
            ("Trincomalee", "Eastern", 8.5874, 81.2152, 38, 72),
            ("Kurunegala", "North Western", 7.4863, 80.3647, 42, 78),
            ("Puttalam", "North Western", 8.0362, 79.8283, 32, 68),
            ("Anuradhapura", "North Central", 8.3114, 80.4037, 30, 65),
            ("Polonnaruwa", "North Central", 7.9403, 81.0188, 32, 68),
            ("Badulla", "Uva", 6.9934, 81.0550, 48, 82),
            ("Monaragala", "Uva", 6.8714, 81.3507, 35, 70),
            ("Ratnapura", "Sabaragamuwa", 6.6828, 80.4014, 70, 110),
            ("Kegalle", "Sabaragamuwa", 7.2513, 80.3464, 58, 92),
        };

        var currentMonth = DateTime.UtcNow.Month;

        foreach (var d in districts)
        {
            var isProne = landslideProne.Contains(d.Name);
            var district = new District
            {
                Name = d.Name, Province = d.Province, Latitude = d.Lat, Longitude = d.Lon,
                IsLandslideProne = isProne
            };
            context.Districts.Add(district);

            context.HistoricalWeather.Add(new HistoricalWeather
            {
                DistrictId = district.Id,
                Month = currentMonth,
                AvgRainfallMm = d.AvgRainfall,
                FloodThresholdMm = d.FloodThreshold,
                LandslideThresholdMm = isProne ? 100 : null,  // NBRO-style cumulative rainfall alert level
                HighWindThresholdKmh = 60,
                Source = "Dept. of Meteorology / NBRO (approximate seed baseline)"
            });
        }

        await context.SaveChangesAsync();
    }
}