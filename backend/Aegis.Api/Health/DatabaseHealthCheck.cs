using Aegis.Shared.Auth.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Npgsql;

namespace Aegis.Api.Health;

/// <summary>
/// Verifies PostgreSQL database connectivity using the configured database connection.
/// Does not leak connection strings, credentials, or internal exception details.
/// </summary>
public class DatabaseHealthCheck : IHealthCheck
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IConfiguration _configuration;

    public DatabaseHealthCheck(IServiceProvider serviceProvider, IConfiguration configuration)
    {
        _serviceProvider = serviceProvider;
        _configuration = configuration;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // 1. First probe via AuthDbContext if registered in DI
            using (var scope = _serviceProvider.CreateScope())
            {
                var authDb = scope.ServiceProvider.GetService<AuthDbContext>();
                if (authDb != null)
                {
                    var canConnect = await authDb.Database.CanConnectAsync(cancellationToken);
                    return canConnect
                        ? HealthCheckResult.Healthy("Database connectivity probe succeeded.")
                        : HealthCheckResult.Unhealthy("Database connectivity probe failed.");
                }
            }

            // 2. Direct Npgsql probe fallback using configured DefaultConnection
            var connectionString = _configuration.GetConnectionString("DefaultConnection");
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                return HealthCheckResult.Unhealthy("Database connection string is not configured.");
            }

            await using var connection = new NpgsqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = connection.CreateCommand();
            command.CommandText = "SELECT 1;";
            await command.ExecuteScalarAsync(cancellationToken);

            return HealthCheckResult.Healthy("Database connectivity probe succeeded.");
        }
        catch (Exception)
        {
            // Never expose connection strings, credentials, or internal exception details
            return HealthCheckResult.Unhealthy("Database connectivity check failed.");
        }
    }
}
