using Aegis.Resource.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace Aegis.Resource;

public class DesignTimeResourceDbContextFactory : IDesignTimeDbContextFactory<ResourceDbContext>
{
    public ResourceDbContext CreateDbContext(string[] args)
    {
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' was not found. Add it to appsettings.json or appsettings.Development.json.");

        var optionsBuilder = new DbContextOptionsBuilder<ResourceDbContext>();
        optionsBuilder.UseNpgsql(connectionString);

        return new ResourceDbContext(optionsBuilder.Options);
    }
}
