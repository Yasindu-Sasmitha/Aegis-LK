using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using Aegis.Recovery.Data;
using Aegis.Recovery.Dtos;
using Aegis.Recovery.Models;
using Aegis.Recovery.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;

namespace Aegis.Recovery.Endpoints;

public static class RecoveryEndpoints
{
    public static void MapRecoveryEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/recovery").WithTags("Recovery");

        #region Shelters

        group.MapGet("/shelters", async (string? district, string? status, RecoveryDbContext db) =>
        {
            var query = db.Shelters.AsQueryable();
            if (!string.IsNullOrWhiteSpace(district))
                query = query.Where(s => s.District.ToLower() == district.ToLower());
            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(s => s.Status.ToLower() == status.ToLower());

            var shelters = await query.OrderBy(s => s.Name).ToListAsync();
            return Results.Ok(shelters.Select(MapShelterDto));
        });

        group.MapGet("/shelters/{id:guid}", async (Guid id, RecoveryDbContext db) =>
        {
            var shelter = await db.Shelters.FindAsync(id);
            return shelter is null ? Results.NotFound() : Results.Ok(MapShelterDto(shelter));
        });

        group.MapPost("/shelters", async (CreateShelterRequest request, RecoveryDbContext db) =>
        {
            // Deterministic validation rules
            if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.District))
                return Results.BadRequest(new { error = "Shelter name and district are required." });

            if (request.Capacity <= 0)
                return Results.BadRequest(new { error = "Shelter capacity must be greater than zero." });

            var shelter = new Shelter
            {
                Name = request.Name.Trim(),
                Location = request.Location.Trim(),
                District = request.District.Trim(),
                Latitude = request.Latitude,
                Longitude = request.Longitude,
                Capacity = request.Capacity,
                CurrentOccupancy = 0,
                Status = "Active",
                ContactPerson = request.ContactPerson.Trim(),
                ContactPhone = request.ContactPhone.Trim(),
                Facilities = request.Facilities.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            db.Shelters.Add(shelter);
            await db.SaveChangesAsync();

            return Results.Created($"/api/recovery/shelters/{shelter.Id}", MapShelterDto(shelter));
        });

        group.MapPut("/shelters/{id:guid}/occupancy", async (Guid id, UpdateShelterOccupancyRequest request, RecoveryDbContext db) =>
        {
            var shelter = await db.Shelters.FindAsync(id);
            if (shelter is null) return Results.NotFound();

            if (request.CurrentOccupancy < 0)
                return Results.BadRequest(new { error = "Current occupancy cannot be negative." });

            if (request.CurrentOccupancy > shelter.Capacity)
                return Results.BadRequest(new { error = $"Occupancy ({request.CurrentOccupancy}) cannot exceed capacity ({shelter.Capacity})." });

            shelter.CurrentOccupancy = request.CurrentOccupancy;
            if (!string.IsNullOrWhiteSpace(request.Status))
            {
                if (request.Status == "Active" && shelter.CurrentOccupancy >= shelter.Capacity)
                    shelter.Status = "Full";
                else
                    shelter.Status = request.Status;
            }
            else
            {
                shelter.Status = shelter.CurrentOccupancy >= shelter.Capacity ? "Full" : "Active";
            }

            shelter.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            return Results.Ok(MapShelterDto(shelter));
        });

        #endregion

        #region Aid Requests

        group.MapGet("/aid-requests", async (string? status, string? urgency, string? district, RecoveryDbContext db) =>
        {
            var query = db.AidRequests.Include(a => a.Shelter).AsQueryable();
            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(a => a.Status.ToLower() == status.ToLower());
            if (!string.IsNullOrWhiteSpace(urgency))
                query = query.Where(a => a.Urgency.ToLower() == urgency.ToLower());
            if (!string.IsNullOrWhiteSpace(district))
                query = query.Where(a => a.District.ToLower() == district.ToLower());

            var list = await query.OrderByDescending(a => a.CreatedAt).ToListAsync();
            return Results.Ok(list.Select(MapAidRequestDto));
        });

        group.MapPost("/aid-requests", async (CreateAidRequest request, RecoveryDbContext db) =>
        {
            // Deterministic Business Validation
            if (string.IsNullOrWhiteSpace(request.VictimName) || string.IsNullOrWhiteSpace(request.ContactPhone))
                return Results.BadRequest(new { error = "Victim name and contact phone are required." });

            if (request.FamilySize < 1)
                return Results.BadRequest(new { error = "Family size must be at least 1." });

            if (request.ShelterId.HasValue)
            {
                var shelter = await db.Shelters.FindAsync(request.ShelterId.Value);
                if (shelter is null)
                    return Results.BadRequest(new { error = "Target shelter not found." });

                if (shelter.Status == "Inactive")
                    return Results.BadRequest(new { error = "Selected shelter is inactive and cannot accept allocations." });

                if (shelter.CurrentOccupancy + request.FamilySize > shelter.Capacity)
                    return Results.BadRequest(new { error = $"Selected shelter does not have capacity for {request.FamilySize} additional person(s)." });
            }

            var aidRequest = new AidRequest
            {
                VictimName = request.VictimName.Trim(),
                ContactPhone = request.ContactPhone.Trim(),
                District = request.District.Trim(),
                AidType = string.IsNullOrWhiteSpace(request.AidType) ? "Shelter" : request.AidType.Trim(),
                FamilySize = request.FamilySize,
                Urgency = string.IsNullOrWhiteSpace(request.Urgency) ? "Medium" : request.Urgency.Trim(),
                Status = "Pending",
                ShelterId = request.ShelterId,
                Notes = request.Notes?.Trim() ?? string.Empty,
                CreatedAt = DateTime.UtcNow
            };

            db.AidRequests.Add(aidRequest);
            await db.SaveChangesAsync();

            var loaded = await db.AidRequests.Include(a => a.Shelter).FirstAsync(a => a.Id == aidRequest.Id);
            return Results.Created($"/api/recovery/aid-requests/{aidRequest.Id}", MapAidRequestDto(loaded));
        });

        group.MapPut("/aid-requests/{id:guid}/status", async (Guid id, UpdateAidRequestStatus request, RecoveryDbContext db) =>
        {
            var aidRequest = await db.AidRequests.Include(a => a.Shelter).FirstOrDefaultAsync(a => a.Id == id);
            if (aidRequest is null) return Results.NotFound();

            if (string.IsNullOrWhiteSpace(request.Status))
                return Results.BadRequest(new { error = "Status is required." });

            var validStatuses = new[] { "Pending", "Approved", "Fulfilled", "Rejected" };
            if (!validStatuses.Contains(request.Status))
                return Results.BadRequest(new { error = $"Invalid status. Must be one of: {string.Join(", ", validStatuses)}" });

            // If assigning shelter during status update
            if (request.ShelterId.HasValue && request.ShelterId != aidRequest.ShelterId)
            {
                var shelter = await db.Shelters.FindAsync(request.ShelterId.Value);
                if (shelter is null)
                    return Results.BadRequest(new { error = "Target shelter not found." });

                if (shelter.Status == "Inactive")
                    return Results.BadRequest(new { error = "Shelter is inactive." });

                if (shelter.CurrentOccupancy + aidRequest.FamilySize > shelter.Capacity)
                    return Results.BadRequest(new { error = "Shelter capacity exceeded." });

                // If moving from another shelter
                if (aidRequest.Shelter != null)
                {
                    aidRequest.Shelter.CurrentOccupancy = Math.Max(0, aidRequest.Shelter.CurrentOccupancy - aidRequest.FamilySize);
                    if (aidRequest.Shelter.CurrentOccupancy < aidRequest.Shelter.Capacity && aidRequest.Shelter.Status == "Full")
                        aidRequest.Shelter.Status = "Active";
                }

                aidRequest.ShelterId = request.ShelterId;
                shelter.CurrentOccupancy += aidRequest.FamilySize;
                if (shelter.CurrentOccupancy >= shelter.Capacity)
                    shelter.Status = "Full";
            }

            aidRequest.Status = request.Status;
            if (!string.IsNullOrWhiteSpace(request.Notes))
                aidRequest.Notes = request.Notes;
            aidRequest.UpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return Results.Ok(MapAidRequestDto(aidRequest));
        });

        #endregion

        #region Donations

        group.MapGet("/donations", async (RecoveryDbContext db) =>
        {
            var list = await db.Donations.OrderByDescending(d => d.CreatedAt).ToListAsync();
            return Results.Ok(list.Select(MapDonationDto));
        });

        group.MapPost("/donations", async (CreateDonationRequest request, RecoveryDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(request.DonorName))
                return Results.BadRequest(new { error = "Donor name is required." });

            if (request.AmountOrQuantity <= 0)
                return Results.BadRequest(new { error = "Donation amount or quantity must be greater than zero." });

            var donation = new Donation
            {
                DonorName = request.DonorName.Trim(),
                DonorContact = request.DonorContact?.Trim() ?? string.Empty,
                DonationType = string.IsNullOrWhiteSpace(request.DonationType) ? "Monetary" : request.DonationType.Trim(),
                AmountOrQuantity = request.AmountOrQuantity,
                ItemDescription = request.ItemDescription?.Trim() ?? string.Empty,
                TargetShelterId = request.TargetShelterId,
                AllocationStatus = request.TargetShelterId.HasValue ? "Allocated" : "Unallocated",
                CreatedAt = DateTime.UtcNow
            };

            db.Donations.Add(donation);
            await db.SaveChangesAsync();

            return Results.Created($"/api/recovery/donations/{donation.Id}", MapDonationDto(donation));
        });

        #endregion

        #region Compensation

        group.MapGet("/compensations", async (RecoveryDbContext db) =>
        {
            var list = await db.Compensations.OrderByDescending(c => c.CreatedAt).ToListAsync();
            return Results.Ok(list.Select(MapCompensationDto));
        });

        group.MapPost("/compensations", async (CreateCompensationRequest request, RecoveryDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(request.ApplicantName) || string.IsNullOrWhiteSpace(request.NIC))
                return Results.BadRequest(new { error = "Applicant name and NIC are required." });

            if (request.ClaimAmount <= 0)
                return Results.BadRequest(new { error = "Claim amount must be greater than zero." });

            var compensation = new Compensation
            {
                ApplicantName = request.ApplicantName.Trim(),
                NIC = request.NIC.Trim(),
                DamageCategory = string.IsNullOrWhiteSpace(request.DamageCategory) ? "Total House Loss" : request.DamageCategory.Trim(),
                ClaimAmount = request.ClaimAmount,
                Status = "Submitted",
                VerificationNotes = request.VerificationNotes?.Trim() ?? string.Empty,
                CreatedAt = DateTime.UtcNow
            };

            db.Compensations.Add(compensation);
            await db.SaveChangesAsync();

            return Results.Created($"/api/recovery/compensations/{compensation.Id}", MapCompensationDto(compensation));
        });

        group.MapPut("/compensations/{id:guid}/approve", async (Guid id, ApproveCompensationRequest request, RecoveryDbContext db) =>
        {
            var compensation = await db.Compensations.FindAsync(id);
            if (compensation is null) return Results.NotFound();

            if (request.ApprovedAmount < 0)
                return Results.BadRequest(new { error = "Approved amount cannot be negative." });

            if (request.ApprovedAmount > compensation.ClaimAmount)
                return Results.BadRequest(new { error = $"Approved amount ({request.ApprovedAmount:C}) cannot exceed claimed amount ({compensation.ClaimAmount:C})." });

            compensation.ApprovedAmount = request.ApprovedAmount;
            compensation.Status = string.IsNullOrWhiteSpace(request.Status) ? "Approved" : request.Status;
            compensation.VerificationNotes = request.VerificationNotes;
            compensation.ApprovedBy = request.ApprovedBy;
            compensation.ApprovedAt = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return Results.Ok(MapCompensationDto(compensation));
        });

        #endregion

        #region NGOs & Infrastructure Damage

        group.MapGet("/ngos", async (RecoveryDbContext db) =>
        {
            var ngos = await db.NGOs.OrderBy(n => n.Name).ToListAsync();
            return Results.Ok(ngos.Select(MapNGODto));
        });

        group.MapPost("/ngos", async (CreateNGORequest request, RecoveryDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                return Results.BadRequest(new { error = "NGO name is required." });

            var ngo = new NGO
            {
                Name = request.Name.Trim(),
                ContactEmail = request.ContactEmail?.Trim() ?? string.Empty,
                ContactPhone = request.ContactPhone?.Trim() ?? string.Empty,
                Sectors = request.Sectors?.Trim() ?? string.Empty,
                OperatingDistricts = request.OperatingDistricts?.Trim() ?? string.Empty,
                AssignedBudget = request.AssignedBudget >= 0 ? request.AssignedBudget : 0,
                Status = "Active",
                CreatedAt = DateTime.UtcNow
            };

            db.NGOs.Add(ngo);
            await db.SaveChangesAsync();

            return Results.Created($"/api/recovery/ngos/{ngo.Id}", MapNGODto(ngo));
        });

        group.MapGet("/infrastructure-damage", async (Guid? incidentId, RecoveryDbContext db) =>
        {
            var query = db.InfrastructureDamages.AsQueryable();
            if (incidentId.HasValue)
                query = query.Where(i => i.IncidentId == incidentId.Value);

            var items = await query.OrderByDescending(i => i.PriorityScore).ToListAsync();
            return Results.Ok(items);
        });

        #endregion

        #region Recovery Plans & Approval Workflow

        // GET /api/recovery/plan/{incidentId}
        group.MapGet("/plan/{incidentId:guid}", async (Guid incidentId, RecoveryDbContext db) =>
        {
            var plan = await db.RecoveryPlans
                .Include(p => p.Tasks)
                .ThenInclude(t => t.AssignedNGO)
                .OrderByDescending(p => p.CreatedAt)
                .FirstOrDefaultAsync(p => p.IncidentId == incidentId);

            return plan is null ? Results.NotFound(new { message = $"No recovery plan found for incident {incidentId}." }) : Results.Ok(MapRecoveryPlanDto(plan));
        });

        // POST /api/recovery/plan/generate
        group.MapPost("/plan/generate", async (GeneratePlanRequest request, RecoveryDbContext db, IIncidentIntegrationService incidentService, RecoveryAgentClientService agentClient) =>
        {
            if (request.IncidentId == Guid.Empty)
                return Results.BadRequest(new { error = "Valid Incident ID is required." });

            var damageReport = await incidentService.GetDamageReportAsync(request.IncidentId);
            if (damageReport is null)
                return Results.NotFound(new { error = "Damage report not found for incident." });

            var shelters = await db.Shelters.Where(s => s.Status == "Active").ToListAsync();
            var ngos = await db.NGOs.Where(n => n.Status == "Active").ToListAsync();

            // Run Recovery Planning Agent
            var plan = await agentClient.GeneratePlanAsync(request.IncidentId, damageReport, shelters, ngos);

            // Save plan in PendingApproval status
            db.RecoveryPlans.Add(plan);
            await db.SaveChangesAsync();

            // Populate InfrastructureDamage table from damage report
            foreach (var item in damageReport.InfrastructureDamage)
            {
                var damageRecord = new InfrastructureDamage
                {
                    IncidentId = request.IncidentId,
                    AssetName = item.AssetName,
                    AssetType = item.AssetType,
                    DamageLevel = item.DamageLevel,
                    EstimatedRepairCost = item.EstimatedCost,
                    PriorityScore = item.DamageLevel == "Destroyed" ? 5 : item.DamageLevel == "Severe" ? 4 : 3,
                    Status = "Planning",
                    CreatedAt = DateTime.UtcNow
                };
                db.InfrastructureDamages.Add(damageRecord);
            }
            await db.SaveChangesAsync();

            var reloaded = await db.RecoveryPlans
                .Include(p => p.Tasks)
                .ThenInclude(t => t.AssignedNGO)
                .FirstAsync(p => p.Id == plan.Id);

            return Results.Created($"/api/recovery/plan/{reloaded.IncidentId}", MapRecoveryPlanDto(reloaded));
        });

        // POST /api/recovery/plan/{id}/approve
        group.MapPost("/plan/{id:guid}/approve", async (Guid id, ApprovePlanRequest request, RecoveryDbContext db) =>
        {
            var plan = await db.RecoveryPlans
                .Include(p => p.Tasks)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (plan is null) return Results.NotFound(new { error = "Recovery plan not found." });

            var action = request.Action?.Trim() ?? "Approve";
            if (!new[] { "Approve", "Reject", "Revise" }.Contains(action, StringComparer.OrdinalIgnoreCase))
                return Results.BadRequest(new { error = "Invalid action. Must be 'Approve', 'Reject', or 'Revise'." });

            if (string.Equals(action, "Approve", StringComparison.OrdinalIgnoreCase))
            {
                plan.Status = "Approved";
                foreach (var task in plan.Tasks)
                {
                    task.Status = "InProgress";
                }
            }
            else if (string.Equals(action, "Reject", StringComparison.OrdinalIgnoreCase))
            {
                plan.Status = "Rejected";
            }
            else if (string.Equals(action, "Revise", StringComparison.OrdinalIgnoreCase))
            {
                plan.Status = "RevisionRequested";
            }

            plan.ReviewNotes = request.ReviewerNotes;
            plan.ReviewedBy = string.IsNullOrWhiteSpace(request.ReviewedBy) ? "Recovery Officer" : request.ReviewedBy;
            plan.ReviewedAt = DateTime.UtcNow;

            await db.SaveChangesAsync();
            return Results.Ok(MapRecoveryPlanDto(plan));
        });

        #endregion

        #region Reports

        group.MapGet("/reports", async (RecoveryDbContext db) =>
        {
            var reports = await db.RecoveryReports.OrderByDescending(r => r.GeneratedAt).ToListAsync();
            return Results.Ok(reports);
        });

        group.MapPost("/reports/generate", async (GenerateReportRequest request, RecoveryDbContext db) =>
        {
            var shelteredCount = await db.Shelters.SumAsync(s => s.CurrentOccupancy);
            var fulfilledAid = await db.AidRequests.CountAsync(a => a.Status == "Fulfilled");
            var compensationTotal = await db.Compensations
                .Where(c => c.Status == "Disbursed" || c.Status == "Approved")
                .SumAsync(c => c.ApprovedAmount ?? 0);
            var budgetSpent = await db.RecoveryTasks
                .Where(t => t.Status == "Completed" || t.Status == "InProgress")
                .SumAsync(t => t.EstimatedCost);

            var report = new RecoveryReport
            {
                IncidentId = request.IncidentId,
                Title = string.IsNullOrWhiteSpace(request.Title) ? "Post-Disaster Recovery Summary Report" : request.Title,
                TotalSheltered = shelteredCount,
                TotalAidRequestsFulfilled = fulfilledAid,
                TotalCompensationDisbursed = compensationTotal,
                TotalBudgetSpent = budgetSpent,
                ReportSummary = $"Summary report for incident {request.IncidentId}: {shelteredCount} sheltered, {fulfilledAid} aid requests fulfilled, {compensationTotal:C} compensation disbursed.",
                GeneratedAt = DateTime.UtcNow
            };

            db.RecoveryReports.Add(report);
            await db.SaveChangesAsync();

            return Results.Created($"/api/recovery/reports/{report.Id}", report);
        });

        #endregion
    }

    // Mapping Helpers
    private static ShelterDto MapShelterDto(Shelter s) => new(
        s.Id, s.Name, s.Location, s.District, s.Latitude, s.Longitude,
        s.Capacity, s.CurrentOccupancy, s.Status, s.ContactPerson, s.ContactPhone, s.Facilities, s.CreatedAt
    );

    private static AidRequestDto MapAidRequestDto(AidRequest a) => new(
        a.Id, a.VictimName, a.ContactPhone, a.District, a.AidType, a.FamilySize, a.Urgency,
        a.Status, a.ShelterId, a.Shelter?.Name, a.Notes, a.CreatedAt
    );

    private static DonationDto MapDonationDto(Donation d) => new(
        d.Id, d.DonorName, d.DonationType, d.AmountOrQuantity, d.ItemDescription,
        d.TargetShelterId, d.AllocationStatus, d.CreatedAt
    );

    private static CompensationDto MapCompensationDto(Compensation c) => new(
        c.Id, c.ApplicantName, c.DamageCategory, c.ClaimAmount, c.ApprovedAmount,
        c.Status, c.VerificationNotes, c.ApprovedBy, c.CreatedAt, c.ApprovedAt
    );

    private static NGODto MapNGODto(NGO n) => new(
        n.Id, n.Name, n.ContactEmail, n.ContactPhone, n.Sectors, n.OperatingDistricts, n.AssignedBudget, n.Status
    );

    private static RecoveryPlanDto MapRecoveryPlanDto(RecoveryPlan p) => new(
        p.Id, p.IncidentId, p.PlanName, p.Status, p.EstimatedTotalBudget, p.PlanSummaryJson,
        p.ReviewNotes, p.ReviewedBy, p.CreatedAt, p.ReviewedAt,
        p.Tasks.Select(t => new TaskDto(t.Id, t.Title, t.Description, t.AssignedNGOId, t.AssignedNGO?.Name, t.Priority, t.EstimatedCost, t.Status, t.TargetCompletionDate)).ToList()
    );
}
