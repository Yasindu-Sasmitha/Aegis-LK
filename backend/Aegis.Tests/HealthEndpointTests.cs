using System.Net;
using System.Text.Json;
using Aegis.Shared.Auth.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Aegis.Tests;

public class HealthEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public HealthEndpointTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    private HttpClient CreateHealthyClient()
    {
        var databaseName = $"HealthTestDb-{Guid.NewGuid():N}";
        var inMemoryProvider = new ServiceCollection()
            .AddEntityFrameworkInMemoryDatabase()
            .BuildServiceProvider();

        return _factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureServices(services =>
            {
                // Isolate AuthDbContext to in-memory for testing
                var toRemove = services.Where(d =>
                    d.ServiceType == typeof(DbContextOptions<AuthDbContext>) ||
                    d.ServiceType == typeof(AuthDbContext) ||
                    d.ServiceType.FullName?.Contains("AuthDbContext") == true).ToList();

                foreach (var descriptor in toRemove)
                {
                    services.Remove(descriptor);
                }

                services.AddDbContext<AuthDbContext>(options =>
                {
                    options.UseInMemoryDatabase(databaseName);
                    options.UseInternalServiceProvider(inMemoryProvider);
                });
            });
        }).CreateClient();
    }

    [Fact]
    public async Task GetHealth_WithoutAuth_ReturnsOk_WithHealthyStatus()
    {
        // Arrange
        using var client = CreateHealthyClient();

        // Act - request /health without any Authorization header
        var response = await client.GetAsync("/health");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(response.Content.Headers.ContentType);
        Assert.Equal("application/json", response.Content.Headers.ContentType.MediaType);

        var content = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(content);
        var root = doc.RootElement;

        Assert.True(root.TryGetProperty("status", out var statusProp));
        Assert.Equal("Healthy", statusProp.GetString());
    }

    [Fact]
    public async Task GetHealth_WhenDatabaseFails_ReturnsNon200_WithUnhealthyStatus()
    {
        // Arrange - configure AuthDbContext with unreachable connection
        var client = _factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureServices(services =>
            {
                var toRemove = services.Where(d =>
                    d.ServiceType == typeof(DbContextOptions<AuthDbContext>) ||
                    d.ServiceType == typeof(AuthDbContext) ||
                    d.ServiceType.FullName?.Contains("AuthDbContext") == true).ToList();

                foreach (var descriptor in toRemove)
                {
                    services.Remove(descriptor);
                }

                // Register with invalid port and short timeout to trigger failure
                services.AddDbContext<AuthDbContext>(options =>
                {
                    options.UseNpgsql("Host=127.0.0.1;Port=1;Database=none;Timeout=1;Command Timeout=1");
                });
            });
        }).CreateClient();

        // Act
        var response = await client.GetAsync("/health");

        // Assert: must return non-200 (ASP.NET Core health checks returns 503 ServiceUnavailable for Unhealthy)
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);

        var content = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(content);
        var root = doc.RootElement;

        Assert.True(root.TryGetProperty("status", out var statusProp));
        Assert.Equal("Unhealthy", statusProp.GetString());
    }
}
