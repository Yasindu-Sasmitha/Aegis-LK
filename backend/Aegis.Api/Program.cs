using System.Text;
using System.Text.Json.Serialization;
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
using Aegis.Resource.Data;
using Aegis.Resource.Endpoints;
using Aegis.Resource.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

// ── CORS ────────────────────────────────────────────────────────────────────
// Allow Flutter web (and React frontend) running on any localhost port during development
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowLocalDev", policy =>
    {
        policy
            .SetIsOriginAllowed(origin =>
            {
                var uri = new Uri(origin);
                return uri.Host == "localhost" || uri.Host == "127.0.0.1";
            })
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});

// ── Database Contexts ────────────────────────────────────────────────────────
builder.Services.AddDbContext<AuthDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddDbContext<IncidentDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddDbContext<WeatherDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddDbContext<RecoveryDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddDbContext<ResourceDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IWarehouseService, WarehouseService>();
builder.Services.AddScoped<IInventoryService, InventoryService>();

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

builder.Services.AddHttpClient<Aegis.Resource.Services.ResourceAgentClient>(client =>
{
    client.BaseAddress = new Uri("http://127.0.0.1:8003");
});

var cloudinarySettings = new Aegis.Incident.Services.CloudinarySettings
{
    CloudName = builder.Configuration["Cloudinary:CloudName"] ?? "",
    ApiKey = builder.Configuration["Cloudinary:ApiKey"] ?? "",
    ApiSecret = builder.Configuration["Cloudinary:ApiSecret"] ?? ""
};
builder.Services.AddSingleton(cloudinarySettings);
builder.Services.AddSingleton<Aegis.Incident.Services.CloudinaryService>();

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

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

    var resourceDb = scope.ServiceProvider.GetRequiredService<ResourceDbContext>();
    await ResourceDataSeeder.SeedAsync(resourceDb);
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseHttpsRedirection();

// ── CORS Middleware ─────────────────────────────────────────────────────────
app.UseCors("AllowLocalDev");

// ── Auth Pipeline ───────────────────────────────────────────────────────────
app.UseAuthentication();
app.UseAuthorization();

// ── Endpoint Modules ────────────────────────────────────────────────────────
app.MapAuthEndpoints();
app.MapWeatherEndpoints();
app.MapRecoveryEndpoints();
app.MapIncidentEndpoints();
app.MapResourceEndpoints();

app.Run();
