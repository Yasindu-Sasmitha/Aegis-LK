using System;
using System.Linq;
using System.Threading.Tasks;
using Aegis.Incident.Data;
using Aegis.Incident.Models;
using Aegis.Recovery.Data;
using Aegis.Recovery.Models;
using Aegis.Resource.Data;
using Aegis.Resource.Entities;
using Aegis.Shared.Auth.Data;
using Aegis.Shared.Auth.Entities;
using Aegis.Weather.Data;
using Aegis.Weather.Models;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Aegis.Tests;

public class DatabaseSchemaIntegrationTests
{
    [Fact]
    public async Task RecoveryDatabase_CascadeDelete_PlanDeletesDependentWorkflowLog()
    {
        var options = new DbContextOptionsBuilder<RecoveryDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        using var db = new RecoveryDbContext(options);
        var plan = new RecoveryPlan
        {
            Id = Guid.NewGuid(),
            PlanName = "Gampaha Flood Rehabilitation Plan",
            EstimatedTotalBudget = 450000m,
            Status = "Draft",
            CreatedAt = DateTime.UtcNow
        };
        db.RecoveryPlans.Add(plan);

        var log = new RecoveryWorkflowLog
        {
            Id = Guid.NewGuid(),
            RecoveryPlanId = plan.Id,
            AgentStepsJson = "[]",
            ToolCallsJson = "[]",
            ExecutionStatus = "PendingApproval",
            CreatedAt = DateTime.UtcNow
        };
        db.RecoveryWorkflowLogs.Add(log);
        await db.SaveChangesAsync();

        // Delete parent plan
        db.RecoveryPlans.Remove(plan);
        await db.SaveChangesAsync();

        var remainingLogs = await db.RecoveryWorkflowLogs.Where(w => w.RecoveryPlanId == plan.Id).ToListAsync();
        Assert.Empty(remainingLogs);
    }

    [Fact]
    public async Task ResourceDatabase_WarehouseAndInventory_CascadeIntegrity()
    {
        var options = new DbContextOptionsBuilder<ResourceDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        using var db = new ResourceDbContext(options);
        var warehouse = new Warehouse
        {
            Id = Guid.NewGuid(),
            Name = "Ratnapura Regional Depot",
            District = "Ratnapura",
            Latitude = 6.6828m,
            Longitude = 80.3992m
        };
        db.Warehouses.Add(warehouse);

        var item = new Inventory
        {
            Id = Guid.NewGuid(),
            WarehouseId = warehouse.Id,
            ItemName = "Water Purification Tablets",
            ItemType = ItemType.Medical,
            QuantityAvailable = 1000,
            Unit = "Packs",
            ReorderThreshold = 200
        };
        db.Inventory.Add(item);
        await db.SaveChangesAsync();

        var savedWarehouse = await db.Warehouses.Include(w => w.InventoryItems).FirstOrDefaultAsync(w => w.Id == warehouse.Id);
        Assert.NotNull(savedWarehouse);
        Assert.Single(savedWarehouse.InventoryItems);
        Assert.Equal("Water Purification Tablets", savedWarehouse.InventoryItems.First().ItemName);
    }

    [Fact]
    public async Task IncidentDatabase_IncidentEntity_PersistsAndLoadsCorrectly()
    {
        var options = new DbContextOptionsBuilder<IncidentDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        using var db = new IncidentDbContext(options);
        var incident = new IncidentReport
        {
            Id = Guid.NewGuid(),
            DisasterType = "Landslide",
            Description = "Road blockage near Passara",
            SeverityReported = "High",
            SeverityAssessed = "High",
            Status = "Verified",
            Latitude = 6.9382,
            Longitude = 81.1528,
            CreatedAt = DateTime.UtcNow
        };
        db.Incidents.Add(incident);
        await db.SaveChangesAsync();

        var saved = await db.Incidents.FirstOrDefaultAsync(i => i.Id == incident.Id);
        Assert.NotNull(saved);
        Assert.Equal("Landslide", saved.DisasterType);
        Assert.Equal("Verified", saved.Status);
    }

    [Fact]
    public async Task WeatherDatabase_AlertEntity_DefaultsAndBoundsEnforced()
    {
        var options = new DbContextOptionsBuilder<WeatherDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        using var db = new WeatherDbContext(options);
        var alert = new WeatherAlert
        {
            Id = Guid.NewGuid(),
            DistrictId = Guid.NewGuid(),
            HazardType = "FlashFlood",
            Severity = "Severe",
            Status = "PendingReview",
            CreatedAt = DateTime.UtcNow
        };
        db.WeatherAlerts.Add(alert);
        await db.SaveChangesAsync();

        var persisted = await db.WeatherAlerts.FirstOrDefaultAsync(a => a.Id == alert.Id);
        Assert.NotNull(persisted);
        Assert.Equal("Severe", persisted.Severity);
        Assert.Null(persisted.PublishedAt);
    }

    [Fact]
    public async Task AuthDatabase_UserEntity_UniqueConstraintsAndRoleScoping()
    {
        var options = new DbContextOptionsBuilder<AuthDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        using var db = new AuthDbContext(options);
        var user = new User
        {
            Id = Guid.NewGuid(),
            FullName = "Disaster Officer Perera",
            Email = "officer.perera@aegis.lk",
            PasswordHash = "AQAAAAEAACcQAAAAEHashedPasswordToken123",
            Role = "DisasterOfficer",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var retrieved = await db.Users.FirstOrDefaultAsync(u => u.Email == "officer.perera@aegis.lk");
        Assert.NotNull(retrieved);
        Assert.Equal("DisasterOfficer", retrieved.Role);
        Assert.True(retrieved.IsActive);
    }
}
