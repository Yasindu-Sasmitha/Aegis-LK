using Aegis.Weather.Models;
using Microsoft.EntityFrameworkCore;

namespace Aegis.Weather.Data;

public class WeatherDbContext : DbContext
{
    public WeatherDbContext(DbContextOptions<WeatherDbContext> options) : base(options) { }

    public DbSet<District> Districts => Set<District>();
    public DbSet<HistoricalWeather> HistoricalWeather => Set<HistoricalWeather>();
    public DbSet<WeatherStation> WeatherStations => Set<WeatherStation>();
    public DbSet<WeatherObservation> WeatherObservations => Set<WeatherObservation>();
    public DbSet<Prediction> Predictions => Set<Prediction>();
    public DbSet<WeatherAlert> WeatherAlerts => Set<WeatherAlert>();
    public DbSet<ForecastHistory> ForecastHistory => Set<ForecastHistory>();
    public DbSet<AgentExecutionLog> AgentExecutionLogs => Set<AgentExecutionLog>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.HasDefaultSchema("weather");

        builder.Entity<District>().HasIndex(d => d.Name).IsUnique();
        builder.Entity<HistoricalWeather>().HasIndex(h => new { h.DistrictId, h.Month }).IsUnique();
        builder.Entity<Prediction>().HasOne(p => p.Alert).WithOne(a => a.Prediction!)
            .HasForeignKey<WeatherAlert>(a => a.PredictionId);
        builder.Entity<Prediction>().HasIndex(p => new { p.DistrictId, p.CreatedAt });
        builder.Entity<WeatherAlert>().HasIndex(a => new { a.DistrictId, a.Status });
    }
}