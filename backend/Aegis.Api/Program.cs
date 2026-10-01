using System.Text;
using System.Text.Json.Serialization;
using Aegis.Api.Health;
using Aegis.Incident;
using Aegis.Incident.Data;
using Aegis.Incident.Endpoints;
using Aegis.Incident.Services;
using Aegis.Recovery;
using Aegis.Recovery.Data;
using Aegis.Recovery.Endpoints;
using Aegis.Recovery.Services;
using Aegis.Resource.Data;
using Aegis.Resource.Endpoints;
using Aegis.Resource.Services;
using Aegis.Shared.Auth.Data;
using Aegis.Shared.Auth.Endpoints;
using Aegis.Shared.Auth.Entities;
using Aegis.Shared.Auth.Services;
using Aegis.Weather.Data;
using Aegis.Weather.Endpoints;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// ── Port binding ──────────────────────────────────────────────────────────────
// Render provides PORT env var (and Dockerfile sets ENV PORT=10000).
// In local development without PORT, respect launchSettings.json (http://localhost:5012)
// so the local React Vite proxy (port 5012) and Flutter dev environments work seamlessly.
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}
else if (!builder.Environment.IsDevelopment())
{
    builder.WebHost.UseUrls("http://0.0.0.0:10000");
}

builder.Services.AddOpenApi();

// ── Forwarded Headers (Render / reverse proxy support) ───────────────────────
// ASPNETCORE_FORWARDEDHEADERS_ENABLED=true is the standard way to enable this
// on Render. We also configure it explicitly so it works regardless of env var.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    // Trust all proxies (Render / load-balancer). In stricter environments
    // you would add specific known-proxy IPs instead.
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// ── Health Checks ─────────────────────────────────────────────────────────────
builder.Services.AddHealthChecks()
    .AddCheck<DatabaseHealthCheck>("database", tags: ["db", "postgresql"]);

// ── CORS ──────────────────────────────────────────────────────────────────────
// In production, CORS_ALLOWED_ORIGINS should be set to the deployed Vercel URL.
var corsAllowedOrigins = builder.Configuration["CorsAllowedOrigins"]
    ?? Environment.GetEnvironmentVariable("CORS_ALLOWED_ORIGINS")
    ?? "";

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowLocalDev", policy =>
    {
        // Always allow local development hosts
        policy
            .SetIsOriginAllowed(origin =>
            {
                var uri = new Uri(origin);
                if (uri.Host == "localhost" || uri.Host == "127.0.0.1")
                    return true;

                // Allow configured production origins (comma-separated)
                if (!string.IsNullOrWhiteSpace(corsAllowedOrigins))
                {
                    var allowed = corsAllowedOrigins
                        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                    foreach (var a in allowed)
                    {
                        if (string.Equals(a, origin, StringComparison.OrdinalIgnoreCase))
                            return true;
                    }
                }
                return false;
            })
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});

// ── Database Contexts ─────────────────────────────────────────────────────────
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

// ── Resource Module Services ──────────────────────────────────────────────────
builder.Services.AddScoped<IWarehouseService, WarehouseService>();
builder.Services.AddScoped<IInventoryService, InventoryService>();
builder.Services.AddScoped<IDispatchService, DispatchService>();

// ── Authentication & Authorization ────────────────────────────────────────────
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

// ── Agentic AI service URLs (configurable, localhost defaults for dev) ─────────
// Production: set via environment variables using __ as section separator:
//   AgenticAi__WeatherAgentUrl=https://weather-agent.render.com
//   AgenticAi__IncidentAgentUrl=https://incident-agent.render.com
//   AgenticAi__ResourceAgentUrl=https://resource-agent.render.com
//   AgenticAi__RecoveryAgentUrl=https://recovery-agent.render.com/api/recovery/agent/run
var weatherAgentUrl = builder.Configuration["AgenticAi:WeatherAgentUrl"] ?? "http://127.0.0.1:8001";
var incidentAgentUrl = builder.Configuration["AgenticAi:IncidentAgentUrl"] ?? "http://127.0.0.1:8002";
var resourceAgentUrl = builder.Configuration["AgenticAi:ResourceAgentUrl"] ?? "http://127.0.0.1:8003";
// RecoveryAgentUrl is resolved inside RecoveryAgentClientService (supports RECOVERY_AGENT_URL env var too)

// ── HTTP Clients & Agent Clients ──────────────────────────────────────────────
builder.Services.AddHttpClient<Aegis.Weather.Services.OpenMeteoService>();
builder.Services.AddHttpClient<IIncidentIntegrationService, IncidentIntegrationService>();
// Shared agent secret for service-to-service auth (Option B — shared header key)
// Production: set AEGIS_AGENT_KEY env var on Render. Never expose to React/Flutter.
var agentKey = builder.Configuration["AgenticAi:AgentKey"]
    ?? Environment.GetEnvironmentVariable("AEGIS_AGENT_KEY")
    ?? "";

builder.Services.AddHttpClient<RecoveryAgentClientService>(client =>
{
    if (!string.IsNullOrWhiteSpace(agentKey))
        client.DefaultRequestHeaders.Add("X-Aegis-Agent-Key", agentKey);
});

builder.Services.AddHttpClient<Aegis.Weather.Services.WeatherAgentClient>(client =>
{
    client.BaseAddress = new Uri(weatherAgentUrl);
    if (!string.IsNullOrWhiteSpace(agentKey))
        client.DefaultRequestHeaders.Add("X-Aegis-Agent-Key", agentKey);
});

builder.Services.AddHttpClient<Aegis.Incident.Services.IncidentAgentClient>(client =>
{
    client.BaseAddress = new Uri(incidentAgentUrl);
    if (!string.IsNullOrWhiteSpace(agentKey))
        client.DefaultRequestHeaders.Add("X-Aegis-Agent-Key", agentKey);
});

builder.Services.AddHttpClient<Aegis.Incident.Services.IncidentPlausibilityAgentClient>(client =>
{
    client.BaseAddress = new Uri(incidentAgentUrl);
    if (!string.IsNullOrWhiteSpace(agentKey))
        client.DefaultRequestHeaders.Add("X-Aegis-Agent-Key", agentKey);
});

builder.Services.AddHttpClient<Aegis.Incident.Services.IncidentDedupAgentClient>(client =>
{
    client.BaseAddress = new Uri(incidentAgentUrl);
    if (!string.IsNullOrWhiteSpace(agentKey))
        client.DefaultRequestHeaders.Add("X-Aegis-Agent-Key", agentKey);
});

// Resource Agent Client — SINGLE registration
builder.Services.AddHttpClient<Aegis.Resource.Services.ResourceAgentClient>(client =>
{
    client.BaseAddress = new Uri(resourceAgentUrl);
    client.Timeout = TimeSpan.FromSeconds(45);
    if (!string.IsNullOrWhiteSpace(agentKey))
        client.DefaultRequestHeaders.Add("X-Aegis-Agent-Key", agentKey);
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
    options.SerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

var app = builder.Build();

// ── Forwarded Headers middleware (must be FIRST in pipeline) ──────────────────
app.UseForwardedHeaders();

// ── Production database initialization ───────────────────────────────────────
// Applies EF Core migrations for all DbContexts on startup (idempotent).
// Never destroys data. SEED_DEMO_DATA=true enables demo data seeders.
// Skipped in the Testing environment where tests use in-memory providers.
if (!app.Environment.IsEnvironment("Testing"))
{
    using var scope = app.Services.CreateScope();
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();

    async Task MigrateAsync<TContext>(string name) where TContext : DbContext
    {
        try
        {
            var db = services.GetRequiredService<TContext>();
            if (db.Database.IsRelational())
            {
                await db.Database.MigrateAsync();
                logger.LogInformation("Migrations applied for {Context}", name);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Migration failed for {Context} — check connection string", name);
            throw;
        }
    }

    await MigrateAsync<AuthDbContext>("AuthDbContext");
    await MigrateAsync<IncidentDbContext>("IncidentDbContext");
    await MigrateAsync<WeatherDbContext>("WeatherDbContext");
    await MigrateAsync<RecoveryDbContext>("RecoveryDbContext");
    await MigrateAsync<ResourceDbContext>("ResourceDbContext");

    var seedDemoData = string.Equals(
        Environment.GetEnvironmentVariable("SEED_DEMO_DATA")
        ?? builder.Configuration["SeedDemoData"]
        ?? "false",
        "true",
        StringComparison.OrdinalIgnoreCase);

    if (app.Environment.IsDevelopment() || seedDemoData)
    {
        var authDb = services.GetRequiredService<AuthDbContext>();
        await AuthDataSeeder.SeedAsync(authDb);

        var weatherDb = services.GetRequiredService<WeatherDbContext>();
        await WeatherDataSeeder.SeedAsync(weatherDb);

        var recoveryDb = services.GetRequiredService<RecoveryDbContext>();
        await RecoveryDataSeeder.SeedAsync(recoveryDb);

        var resourceDb = services.GetRequiredService<ResourceDbContext>();
        await ResourceDataSeeder.SeedAsync(resourceDb);

        logger.LogInformation("Demo data seeding complete (SEED_DEMO_DATA=true or Development)");
    }
}

// ── OpenAPI / Scalar — available in all environments (read-only) ──────────────
app.MapOpenApi();
app.MapScalarApiReference();

app.UseHttpsRedirection();
app.UseCors("AllowLocalDev");
app.UseAuthentication();
app.UseAuthorization();

app.MapAuthEndpoints();
app.MapWeatherEndpoints();
app.MapRecoveryEndpoints();
app.MapIncidentEndpoints();
app.MapResourceEndpoints();

app.MapHealthChecks("/health", new HealthCheckOptions
{
    AllowCachingResponses = false,
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        var payload = new
        {
            status = report.Status.ToString()
        };
        await context.Response.WriteAsJsonAsync(payload);
    }
}).AllowAnonymous();

app.Run();