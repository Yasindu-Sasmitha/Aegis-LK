using Aegis.Incident.Data;
using Aegis.Recovery.Data;
using Aegis.Recovery.Endpoints;
using Aegis.Recovery.Services;
using Aegis.Weather.Data;
using Aegis.Weather.Endpoints;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

builder.Services.AddDbContext<IncidentDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddDbContext<WeatherDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddDbContext<RecoveryDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddHttpClient<Aegis.Weather.Services.OpenMeteoService>();
builder.Services.AddHttpClient<IIncidentIntegrationService, IncidentIntegrationService>();
builder.Services.AddSingleton<RecoveryAgentClientService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var weatherDb = scope.ServiceProvider.GetRequiredService<WeatherDbContext>();
    await WeatherDataSeeder.SeedAsync(weatherDb);

    var recoveryDb = scope.ServiceProvider.GetRequiredService<RecoveryDbContext>();
    await RecoveryDataSeeder.SeedAsync(recoveryDb);
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseHttpsRedirection();

app.MapWeatherEndpoints();
app.MapRecoveryEndpoints();

var summaries = new[]
{
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
};

app.MapGet("/weatherforecast", () =>
{
    var forecast = Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast(DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55), summaries[Random.Shared.Next(summaries.Length)]))
        .ToArray();
    return forecast;
})
.WithName("GetWeatherForecast");

app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}