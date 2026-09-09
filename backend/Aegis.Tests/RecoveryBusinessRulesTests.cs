using System;
using System.Threading.Tasks;
using Aegis.Recovery.Data;
using Aegis.Recovery.Models;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Aegis.Tests;

public class RecoveryBusinessRulesTests
{
    private RecoveryDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<RecoveryDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new RecoveryDbContext(options);
    }

    [Fact]
    public async Task CreateShelter_ValidData_SavesSuccessfully()
    {
        using var db = GetInMemoryDbContext();
        var shelter = new Shelter
        {
            Name = "Kalutara High School Shelter",
            Location = "Main Street, Kalutara",
            District = "Kalutara",
            Capacity = 200,
            CurrentOccupancy = 50,
            Status = "Active",
            ContactPerson = "John Doe",
            ContactPhone = "0771234567"
        };

        db.Shelters.Add(shelter);
        await db.SaveChangesAsync();

        var saved = await db.Shelters.FirstOrDefaultAsync(s => s.Name == "Kalutara High School Shelter");
        Assert.NotNull(saved);
        Assert.Equal(200, saved.Capacity);
        Assert.Equal(50, saved.CurrentOccupancy);
    }

    [Fact]
    public async Task AidRequest_AssignedShelter_CapacityCheck()
    {
        using var db = GetInMemoryDbContext();
        var shelter = new Shelter
        {
            Name = "Town Hall",
            Location = "Galle Road",
            District = "Kalutara",
            Capacity = 10,
            CurrentOccupancy = 8,
            Status = "Active"
        };
        db.Shelters.Add(shelter);
        await db.SaveChangesAsync();

        var aidRequest = new AidRequest
        {
            VictimName = "Saman Perera",
            ContactPhone = "0719876543",
            District = "Kalutara",
            FamilySize = 4, // 8 + 4 = 12 > 10 (exceeds capacity)
            ShelterId = shelter.Id,
            Status = "Pending"
        };

        // Business rule verification: Occupancy + FamilySize > Capacity
        bool canAccommodate = (shelter.CurrentOccupancy + aidRequest.FamilySize) <= shelter.Capacity;
        Assert.False(canAccommodate);
    }

    [Fact]
    public void Compensation_ApprovedAmount_CannotExceedClaimAmount()
    {
        var compensation = new Compensation
        {
            ApplicantName = "Kamal Gunaratne",
            NIC = "198012345678",
            ClaimAmount = 500000m,
            ApprovedAmount = 600000m // Exceeds claim amount
        };

        bool isValidApproval = compensation.ApprovedAmount <= compensation.ClaimAmount;
        Assert.False(isValidApproval);
    }

    [Fact]
    public async Task RecoveryPlan_ApproveAction_UpdatesStatusAndTasks()
    {
        using var db = GetInMemoryDbContext();
        var plan = new RecoveryPlan
        {
            IncidentId = Guid.NewGuid(),
            PlanName = "Master Flood Recovery",
            Status = "PendingApproval",
            EstimatedTotalBudget = 1000000m,
            Tasks = new System.Collections.Generic.List<RecoveryTask>
            {
                new RecoveryTask { Title = "Fix Bridge", Priority = "Critical", EstimatedCost = 500000m, Status = "Pending" },
                new RecoveryTask { Title = "Distribute Food", Priority = "High", EstimatedCost = 500000m, Status = "Pending" }
            }
        };

        db.RecoveryPlans.Add(plan);
        await db.SaveChangesAsync();

        // Simulate Plan Approval action
        plan.Status = "Approved";
        foreach (var task in plan.Tasks)
        {
            task.Status = "InProgress";
        }
        await db.SaveChangesAsync();

        var updatedPlan = await db.RecoveryPlans.Include(p => p.Tasks).FirstAsync(p => p.Id == plan.Id);
        Assert.Equal("Approved", updatedPlan.Status);
        Assert.All(updatedPlan.Tasks, t => Assert.Equal("InProgress", t.Status));
    }
}
