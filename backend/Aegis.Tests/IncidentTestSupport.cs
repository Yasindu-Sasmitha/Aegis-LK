using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using Aegis.Incident.Data;
using Aegis.Incident.Models;
using Aegis.Shared.Auth.Data;
using Aegis.Shared.Auth.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace Aegis.Tests;

/// <summary>Shared helpers for the Incident module integration tests (in-memory DB, real JWT pipeline).</summary>
internal static class IncidentTestSupport
{
    public static WebApplicationFactory<Program> CreateFactory(WebApplicationFactory<Program> baseFactory)
    {
        var dbName = $"IncidentTestDb_{Guid.NewGuid():N}";
        var provider = new ServiceCollection().AddEntityFrameworkInMemoryDatabase().BuildServiceProvider();

        return baseFactory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureServices(services =>
            {
                var toRemove = services.Where(d =>
                    d.ServiceType == typeof(DbContextOptions<IncidentDbContext>) ||
                    d.ServiceType == typeof(IncidentDbContext) ||
                    d.ServiceType == typeof(DbContextOptions<AuthDbContext>) ||
                    d.ServiceType == typeof(AuthDbContext) ||
                    d.ServiceType.FullName?.Contains("IncidentDbContext") == true ||
                    d.ServiceType.FullName?.Contains("AuthDbContext") == true).ToList();
                foreach (var d in toRemove) services.Remove(d);

                services.AddDbContext<IncidentDbContext>(o =>
                {
                    o.UseInMemoryDatabase(dbName);
                    o.UseInternalServiceProvider(provider);
                });
                services.AddDbContext<AuthDbContext>(o =>
                {
                    o.UseInMemoryDatabase($"Auth_{dbName}");
                    o.UseInternalServiceProvider(provider);
                });
            });
        });
    }

    public static string Token(string role, Guid? userId = null)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(JwtTokenService.DefaultDevSigningKey));
        var id = (userId ?? Guid.NewGuid()).ToString();
        var claims = new List<Claim>
        {
            new(ClaimTypes.Role, role), new("role", role),
            new(ClaimTypes.NameIdentifier, id), new("sub", id),
        };
        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddHours(2),
            Issuer = "Aegis.Api",
            Audience = "Aegis.Client",
            SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256),
        };
        var handler = new JwtSecurityTokenHandler();
        return handler.WriteToken(handler.CreateToken(descriptor));
    }

    public static Task<HttpResponseMessage> SendAsync(
        HttpClient client, HttpMethod method, string url, string? token = null, object? body = null)
    {
        var req = new HttpRequestMessage(method, url);
        if (token is not null) req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        if (body is not null) req.Content = JsonContent.Create(body);
        return client.SendAsync(req);
    }

    public static async Task<Guid> SeedIncidentAsync(
        WebApplicationFactory<Program> factory,
        string status = "Reported",
        Guid? linkedTo = null,
        Guid? reportedBy = null,
        double lat = 6.5854, double lng = 79.9607)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IncidentDbContext>();
        var incident = new IncidentReport
        {
            DisasterType = "Flood",
            Description = "Water rising near the river",
            SeverityReported = "High",
            Latitude = lat,
            Longitude = lng,
            Status = status,
            LinkedIncidentId = linkedTo,
            DedupConfidence = linkedTo is null ? null : 90,
            DedupReasoning = linkedTo is null ? null : "same event",
            ReportedByUserId = reportedBy ?? Guid.NewGuid(),
        };
        db.Incidents.Add(incident);
        await db.SaveChangesAsync();
        return incident.Id;
    }

    public static async Task<IncidentReport> LoadAsync(WebApplicationFactory<Program> factory, Guid id)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IncidentDbContext>();
        return await db.Incidents.AsNoTracking().FirstAsync(i => i.Id == id);
    }

    public static async Task<List<MissionLog>> LogsAsync(WebApplicationFactory<Program> factory, Guid id)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IncidentDbContext>();
        return await db.MissionLogs.AsNoTracking().Where(l => l.IncidentId == id).ToListAsync();
    }
}