using System.Text;
using Aegis.Incident.Data;
using Aegis.Incident.Endpoints;
using Aegis.Recovery.Data;
using Aegis.Recovery.Endpoints;
using Aegis.Recovery.Services;
using Aegis.Shared.Auth.Data;
using Aegis.Shared.Auth.Endpoints;
using Aegis.Shared.Auth.Entities;
using Aegis.Shared.Auth.Services;
using Aegis.Weather.Data;
using Aegis.Weather.Endpoints;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

// ── Database Contexts ────────────────────────────────────────────────────────
builder.Services.AddDbContext<AuthDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddDbContext<IncidentDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddDbContext<WeatherDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddDbContext<RecoveryDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// ── Authentication & Authorization ──────────────────────────────────────────
builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddSingleton<IJwtTokenService, JwtTokenService>();

var signingKey = builder.Configuration["Jwt:SigningKey"]
    ?? builder.Configuration["Jwt:SecretKey"]
    ?? JwtTokenService.DefaultDevSigningKey;
var issuer = builder.Configuration["Jwt:Issuer"] ?? "Aegis.Api";
var audience = builder.Configuration["Jwt:Audience"] ?? "Aegis.Client";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey)),
            ValidateIssuer = true,
            ValidIssuer = issuer,
            ValidateAudience = true,
            ValidAudience = audience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(5)
        };
    });

builder.Services.AddAuthorization();

// ── HTTP Clients & Agent Clients ────────────────────────────────────────────
builder.Services.AddHttpClient<Aegis.Weather.Services.OpenMeteoService>();
builder.Services.AddHttpClient<IIncidentIntegrationService, IncidentIntegrationService>();
builder.Services.AddSingleton<RecoveryAgentClientService>();

builder.Services.AddHttpClient<Aegis.Weather.Services.WeatherAgentClient>(client =>
{
    client.BaseAddress = new Uri("http://127.0.0.1:8001");
});

builder.Services.AddHttpClient<Aegis.Incident.Services.IncidentAgentClient>(client =>
{
    client.BaseAddress = new Uri("http://127.0.0.1:8002");
});

builder.Services.AddHttpClient<Aegis.Incident.Services.IncidentPlausibilityAgentClient>(client =>
{
    client.BaseAddress = new Uri("http://127.0.0.1:8002");
});

builder.Services.AddHttpClient<Aegis.Incident.Services.IncidentDedupAgentClient>(client =>
{
    client.BaseAddress = new Uri("http://127.0.0.1:8002");
});

var cloudinarySettings = new Aegis.Incident.Services.CloudinarySettings
{
    CloudName = builder.Configuration["Cloudinary:CloudName"] ?? "",
    ApiKey = builder.Configuration["Cloudinary:ApiKey"] ?? "",
    ApiSecret = builder.Configuration["Cloudinary:ApiSecret"] ?? ""
};
builder.Services.AddSingleton(cloudinarySettings);
builder.Services.AddSingleton<Aegis.Incident.Services.CloudinaryService>();

var app = builder.Build();

// ── Database Seeding ────────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();

    var authDb = scope.ServiceProvider.GetRequiredService<AuthDbContext>();
    await AuthDataSeeder.SeedAsync(authDb);

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

// ── Auth Pipeline ───────────────────────────────────────────────────────────
app.UseAuthentication();
app.UseAuthorization();

// ── Endpoint Modules ────────────────────────────────────────────────────────
app.MapAuthEndpoints();
app.MapWeatherEndpoints();
app.MapRecoveryEndpoints();
app.MapIncidentEndpoints();

app.Run();