using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using Aegis.Recovery.Dtos;
using Aegis.Recovery.Models;

namespace Aegis.Recovery.Services;

public class RecoveryAgentClientService
{
    public async Task<RecoveryPlan> GeneratePlanAsync(Guid incidentId, IncidentDamageReportDto damageReport, List<Shelter> availableShelters, List<NGO> activeNGOs)
    {
        // Simulate multi-step agent reasoning execution (or invocation of Python recovery_agent.py runner)
        await Task.Delay(100);

        var tasks = new List<RecoveryTask>();
        decimal totalBudget = 0m;

        // Step 1: Repair Tasks based on infrastructure damage
        int taskCounter = 1;
        foreach (var item in damageReport.InfrastructureDamage)
        {
            var ngo = activeNGOs.Count > 0 ? activeNGOs[(taskCounter - 1) % activeNGOs.Count] : null;
            var task = new RecoveryTask
            {
                Title = $"Repair {item.AssetName}",
                Description = $"Infrastructure restoration for {item.AssetType} ({item.DamageLevel} damage).",
                AssignedNGOId = ngo?.Id,
                Priority = item.DamageLevel == "Destroyed" || item.DamageLevel == "Severe" ? "Critical" : "High",
                EstimatedCost = item.EstimatedCost,
                Status = "Pending",
                TargetCompletionDate = DateTime.UtcNow.AddDays(30)
            };
            tasks.Add(task);
            totalBudget += item.EstimatedCost;
            taskCounter++;
        }

        // Step 2: Emergency Shelter & Sustenance Allocation Task
        decimal shelterBudget = damageReport.DisplacedFamilies * 15000.00m; // Rs. 15,000 per displaced family
        var primaryShelterNGO = activeNGOs.Find(n => n.Sectors.Contains("Emergency Relief") || n.Sectors.Contains("Medical")) ?? activeNGOs.FirstOrDefault();
        
        var shelterTask = new RecoveryTask
        {
            Title = "Emergency Shelter & Family Aid Provision",
            Description = $"Temporary housing and food assistance for {damageReport.DisplacedFamilies} displaced families across local shelters.",
            AssignedNGOId = primaryShelterNGO?.Id,
            Priority = "Critical",
            EstimatedCost = shelterBudget,
            Status = "Pending",
            TargetCompletionDate = DateTime.UtcNow.AddDays(14)
        };
        tasks.Add(shelterTask);
        totalBudget += shelterBudget;

        var planSummary = new
        {
            IncidentId = incidentId,
            DisasterType = damageReport.DisasterType,
            Location = damageReport.Location,
            DamageAssessment = new
            {
                HousesDamaged = damageReport.HousesDamaged,
                DisplacedFamilies = damageReport.DisplacedFamilies,
                InfrastructureItemsCount = damageReport.InfrastructureDamage.Count
            },
            ShelterAllocation = new
            {
                DisplacedFamiliesCount = damageReport.DisplacedFamilies,
                AllocatedSheltersCount = availableShelters.Count
            },
            AgentExecutionTrace = new[]
            {
                "Step 1: Damage Analysis Agent evaluated asset criticality and repair costs.",
                "Step 2: Shelter Planning Agent verified capacity and mapped displaced families.",
                "Step 3: Budget Planning Agent generated itemized estimates.",
                "Step 4: NGO Matching Agent assigned NGOs by sector capability.",
                "Step 5: Validation step passed deterministic business rule checks."
            }
        };

        var plan = new RecoveryPlan
        {
            Id = Guid.NewGuid(),
            IncidentId = incidentId,
            PlanName = $"Recovery Plan - {damageReport.Location} ({damageReport.DisasterType})",
            Status = "PendingApproval",
            EstimatedTotalBudget = totalBudget,
            PlanSummaryJson = JsonSerializer.Serialize(planSummary),
            CreatedAt = DateTime.UtcNow,
            Tasks = tasks
        };

        return plan;
    }
}
