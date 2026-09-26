using System;
using System.Threading.Tasks;
using Aegis.Incident.Data;
using Aegis.Incident.Models;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Aegis.Tests;

public class IncidentBusinessRulesTests
{
    private IncidentDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<IncidentDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new IncidentDbContext(options);
    }

    // ──────────────────────────────────────────────
    // 1. IncidentReport creation & default state
    // ──────────────────────────────────────────────

    [Fact]
    public async Task CreateIncidentReport_DefaultStatus_IsReported()
    {
        using var db = GetInMemoryDbContext();
        var incident = new IncidentReport
        {
            DisasterType = "Flood",
            Description = "Road submerged near river bank.",
            SeverityReported = "High",
            Latitude = 6.9271,
            Longitude = 79.8612,
            ReportedByUserId = Guid.NewGuid(),
        };

        db.Incidents.Add(incident);
        await db.SaveChangesAsync();

        var saved = await db.Incidents.FindAsync(incident.Id);
        Assert.NotNull(saved);
        Assert.Equal("Reported", saved!.Status);
    }

    // ──────────────────────────────────────────────
    // 2. Victim linkage
    // ──────────────────────────────────────────────

    [Fact]
    public async Task AddVictimToIncident_PersistsWithForeignKey()
    {
        using var db = GetInMemoryDbContext();
        var incident = new IncidentReport
        {
            DisasterType = "Landslide",
            Description = "Hillside collapse near village road.",
            SeverityReported = "Critical",
            ReportedByUserId = Guid.NewGuid(),
        };
        db.Incidents.Add(incident);
        await db.SaveChangesAsync();

        var victim = new Victim { IncidentId = incident.Id, Name = "Test Victim", Status = "Missing" };
        db.Victims.Add(victim);
        await db.SaveChangesAsync();

        var loaded = await db.Incidents.Include(i => i.Victims).FirstAsync(i => i.Id == incident.Id);
        Assert.Single(loaded.Victims);
        Assert.Equal("Missing", loaded.Victims.First().Status);
    }

    // ──────────────────────────────────────────────
    // 3. RescueMission approval workflow
    // ──────────────────────────────────────────────

    [Fact]
    public async Task RescueMission_DefaultStatus_IsPending()
    {
        using var db = GetInMemoryDbContext();
        var incident = new IncidentReport
        {
            DisasterType = "Flood",
            Description = "Family stranded on rooftop.",
            SeverityReported = "Critical",
            ReportedByUserId = Guid.NewGuid(),
        };
        db.Incidents.Add(incident);
        await db.SaveChangesAsync();

        var mission = new RescueMission { IncidentId = incident.Id, TeamsRequired = 2 };
        db.RescueMissions.Add(mission);
        await db.SaveChangesAsync();

        Assert.Equal("Pending", mission.Status);
        Assert.Null(mission.ApprovedAt);
    }

    [Fact]
    public async Task ApproveRescueMission_SetsApprovedAtAndOfficer()
    {
        using var db = GetInMemoryDbContext();
        var incident = new IncidentReport
        {
            DisasterType = "Fire",
            Description = "Warehouse fire spreading.",
            SeverityReported = "High",
            ReportedByUserId = Guid.NewGuid(),
        };
        db.Incidents.Add(incident);
        await db.SaveChangesAsync();

        var mission = new RescueMission { IncidentId = incident.Id, TeamsRequired = 1 };
        db.RescueMissions.Add(mission);
        await db.SaveChangesAsync();

        var officerId = Guid.NewGuid();
        mission.Status = "Approved";
        mission.ApprovedByOfficerId = officerId;
        mission.ApprovedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var reloaded = await db.RescueMissions.FindAsync(mission.Id);
        Assert.Equal("Approved", reloaded!.Status);
        Assert.Equal(officerId, reloaded.ApprovedByOfficerId);
        Assert.NotNull(reloaded.ApprovedAt);
    }

    // ──────────────────────────────────────────────
    // 4. Dedup linking (self-referencing FK)
    // ──────────────────────────────────────────────

    [Fact]
    public async Task LinkDuplicateIncident_SetsLinkedIncidentId()
    {
        using var db = GetInMemoryDbContext();
        var primary = new IncidentReport
        {
            DisasterType = "Flood",
            Description = "Original report near main road.",
            SeverityReported = "High",
            ReportedByUserId = Guid.NewGuid(),
        };
        db.Incidents.Add(primary);
        await db.SaveChangesAsync();

        var duplicate = new IncidentReport
        {
            DisasterType = "Flood",
            Description = "Same flood, different reporter.",
            SeverityReported = "High",
            ReportedByUserId = Guid.NewGuid(),
            LinkedIncidentId = primary.Id,
            DedupConfidence = 92,
            DedupReasoning = "Matching location and timeframe.",
        };
        db.Incidents.Add(duplicate);
        await db.SaveChangesAsync();

        var reloaded = await db.Incidents.FindAsync(duplicate.Id);
        Assert.Equal(primary.Id, reloaded!.LinkedIncidentId);
        Assert.Equal(92, reloaded.DedupConfidence);
    }

    // ──────────────────────────────────────────────
    // 5. Rejection workflow
    // ──────────────────────────────────────────────

    [Fact]
    public async Task RejectIncident_RequiresRejectionReason()
    {
        using var db = GetInMemoryDbContext();
        var incident = new IncidentReport
        {
            DisasterType = "Flood",
            Description = "Unverifiable report.",
            SeverityReported = "Low",
            ReportedByUserId = Guid.NewGuid(),
        };
        db.Incidents.Add(incident);
        await db.SaveChangesAsync();

        incident.Status = "Rejected";
        incident.RejectionReason = "Failed plausibility check — no supporting evidence.";
        await db.SaveChangesAsync();

        var reloaded = await db.Incidents.FindAsync(incident.Id);
        Assert.Equal("Rejected", reloaded!.Status);
        Assert.False(string.IsNullOrWhiteSpace(reloaded.RejectionReason));
    }
}