using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Aegis.Incident.Data;
using Aegis.Incident.Dtos;
using Aegis.Incident.Models;
using Aegis.Incident.Services;

namespace Aegis.Incident.Endpoints;

public static class IncidentEndpoints
{
    public static void MapIncidentEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/incidents").WithTags("Incidents");

        // GET /api/incidents — list all (primaries only; duplicates are hidden here,
        // available via GET /{id}/related-reports)
        group.MapGet("/", async (IncidentDbContext db) =>
            await db.Incidents
                .Where(i => i.LinkedIncidentId == null)
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync());

        // GET /api/incidents/nearby — internal, called by the Dedup Agent's search_nearby_incidents tool
        group.MapGet("/nearby", async (double lat, double lng, double radiusKm, double hours, IncidentDbContext db) =>
        {
            var cutoff = DateTime.UtcNow.AddHours(-hours);

            var candidates = await db.Incidents
                .Where(i => i.CreatedAt >= cutoff && i.LinkedIncidentId == null)
                .ToListAsync();

            var nearby = candidates
                .Where(i => HaversineDistanceKm(lat, lng, i.Latitude, i.Longitude) <= radiusKm)
                .Select(i => new NearbyIncidentResponse
                {
                    Id = i.Id,
                    DisasterType = i.DisasterType,
                    Description = i.Description,
                    SeverityReported = i.SeverityReported,
                    Latitude = i.Latitude,
                    Longitude = i.Longitude,
                    CreatedAt = i.CreatedAt
                })
                .ToList();

            return Results.Ok(nearby);
        });

        // GET /api/incidents/{id} — single incident
        group.MapGet("/{id:guid}", async (Guid id, IncidentDbContext db) =>
        {
            var incident = await db.Incidents.FindAsync(id);
            return incident is null ? Results.NotFound() : Results.Ok(incident);
        });

        // POST /api/incidents — citizen creates a report
        group.MapPost("/", async (CreateIncidentRequest request, IncidentDbContext db, IServiceScopeFactory scopeFactory) =>
        {
            if (string.IsNullOrWhiteSpace(request.DisasterType))
                return Results.BadRequest("disasterType is required.");
            if (string.IsNullOrWhiteSpace(request.SeverityReported))
                return Results.BadRequest("severityReported is required.");

            var incident = new IncidentReport
            {
                DisasterType = request.DisasterType,
                Description = request.Description,
                SeverityReported = request.SeverityReported,
                Latitude = request.Latitude,
                Longitude = request.Longitude,
                PhotoUrl = request.PhotoUrl,
                ReportedByUserId = request.ReportedByUserId,
                Status = "Reported"
            };

            db.Incidents.Add(incident);
            await db.SaveChangesAsync();

            // Fire-and-forget: the citizen gets their 201 immediately, the plausibility
            // check runs in the background. This needs its own DI scope (and therefore its
            // own DbContext) because the original request's scope — and its `db` instance —
            // gets disposed the moment this handler returns.
            _ = RunPlausibilityCheckAsync(incident.Id, scopeFactory);
            
            _ = RunDedupCheckAsync(incident.Id, scopeFactory);

            return Results.Created($"/api/incidents/{incident.Id}", incident);
        });

        // POST /api/incidents/{id}/assess — calls the Incident Assessment Agent
        group.MapPost("/{id:guid}/assess", async (Guid id, IncidentDbContext db, IncidentAgentClient agentClient) =>
        {
            var incident = await db.Incidents.FindAsync(id);
            if (incident is null) return Results.NotFound();

            var agentResult = await agentClient.AssessAsync(new AssessRequestDto
            {
                DisasterType = incident.DisasterType,
                SeverityReported = incident.SeverityReported,
                Description = incident.Description,
                Latitude = incident.Latitude,
                Longitude = incident.Longitude
            });

            if (agentResult is null || agentResult.OverallStatus != "Success")
            {
                db.MissionLogs.Add(new MissionLog
                {
                    IncidentId = id,
                    Note = $"Assessment failed: {agentResult?.Error ?? "Agent service unreachable"}"
                });
                await db.SaveChangesAsync();
                return Results.Problem("Agent assessment failed — logged for review.", statusCode: 502);
            }

            incident.SeverityAssessed = agentResult.SeverityAssessed;
            incident.Status = "Assessed";
            incident.UpdatedAt = DateTime.UtcNow;

            db.MissionLogs.Add(new MissionLog
            {
                IncidentId = id,
                Note = $"Assessed: severity={agentResult.SeverityAssessed}, teamsRequired={agentResult.TeamsRequired}. {agentResult.Recommendation}"
            });

            await db.SaveChangesAsync();

            return Results.Ok(new AssessIncidentResponse
            {
                IncidentId = id,
                SeverityAssessed = agentResult.SeverityAssessed,
                TeamsRequired = agentResult.TeamsRequired,
                Recommendation = agentResult.Recommendation,
                OverallStatus = agentResult.OverallStatus
            });
        });

        // POST /api/incidents/{id}/approve — officer approves, creates RescueMission
        group.MapPost("/{id:guid}/approve", async (Guid id, ApproveIncidentRequest request, IncidentDbContext db) =>
        {
            var incident = await db.Incidents
                .Include(i => i.RescueMission)
                .FirstOrDefaultAsync(i => i.Id == id);

            if (incident is null) return Results.NotFound();
            if (incident.RescueMission is not null)
                return Results.Conflict("This incident already has a rescue mission.");

            var teamsRequired = request.TeamsRequiredOverride ?? 1;

            var mission = new RescueMission
            {
                IncidentId = id,
                TeamsRequired = teamsRequired,
                Status = "Approved",
                ApprovedByOfficerId = request.ApprovedByOfficerId,
                ApprovedAt = DateTime.UtcNow
            };

            db.RescueMissions.Add(mission);
            incident.Status = "MissionApproved";
            incident.UpdatedAt = DateTime.UtcNow;

            db.MissionLogs.Add(new MissionLog
            {
                IncidentId = id,
                Note = $"Mission approved by officer {request.ApprovedByOfficerId}. Teams required: {teamsRequired}."
            });

            await db.SaveChangesAsync();

            // TODO (later branch): fire outbound POST to Resource's /api/resource/dispatch-requests
            // wrapped in try/catch so this endpoint still succeeds if Resource isn't built/running yet.

            return Results.Ok(mission);
        });

        // POST /api/incidents/{id}/damage-report — closes the incident, records damage
        group.MapPost("/{id:guid}/damage-report", async (Guid id, CreateDamageReportRequest request, IncidentDbContext db) =>
        {
            var incident = await db.Incidents
                .Include(i => i.DamageReport)
                .FirstOrDefaultAsync(i => i.Id == id);

            if (incident is null) return Results.NotFound();
            if (incident.DamageReport is not null)
                return Results.Conflict("This incident already has a damage report.");

            var damageReport = new DamageReport
            {
                IncidentId = id,
                HousesDamaged = request.HousesDamaged,
                DisplacedFamilies = request.DisplacedFamilies,
                InfrastructureDamageNotes = request.InfrastructureDamageNotes
            };

            db.DamageReports.Add(damageReport);
            incident.Status = "Closed";
            incident.UpdatedAt = DateTime.UtcNow;

            await db.SaveChangesAsync();

            return Results.Created($"/api/incident/{id}/damage-report", damageReport);
        });

        // POST /api/incidents/{id}/photo - citizen (or officer) attaches a photo after creation
        group.MapPost("/{id:guid}/photo", async (Guid id, HttpRequest request, IncidentDbContext db, CloudinaryService cloudinaryService) =>
        {
            var incident = await db.Incidents.FindAsync(id);
            if (incident is null) return Results.NotFound();

            if (!request.HasFormContentType)
                return Results.BadRequest("Expected multipart/form-data with a 'file' field.");

            var form = await request.ReadFormAsync();
            var file = form.Files.GetFile("file");
            if (file is null || file.Length == 0)
                return Results.BadRequest("No file uploaded.");

            await using var stream = file.OpenReadStream();
            var photoUrl = await cloudinaryService.UploadIncidentPhotoAsync(stream, file.FileName, id);

            if (photoUrl is null)
                return Results.Problem("Photo upload failed — please try again.", statusCode: 502);

            incident.PhotoUrl = photoUrl;
            incident.UpdatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            return Results.Ok(new { incident.Id, incident.PhotoUrl });
        });

        // GET /api/incidents/{id}/related-reports — duplicate reports linked to this primary
        group.MapGet("/{id:guid}/related-reports", async (Guid id, IncidentDbContext db) =>
        {
            var related = await db.Incidents
                .Where(i => i.LinkedIncidentId == id)
                .OrderBy(i => i.CreatedAt)
                .ToListAsync();
            return Results.Ok(related);
        });

        // ── Cross-module contract endpoint - Recovery calls this exact path ────────
        // NOTE: singular "/api/incident/", NOT "/api/incidents/" - matches
        // Aegis.Recovery.Services.IncidentIntegrationService's GetDamageReportAsync call.
        var incidentSingular = app.MapGroup("/api/incident").WithTags("Incidents");

        incidentSingular.MapGet("/{id:guid}/damage-report", async (Guid id, IncidentDbContext db) =>
        {
            var incident = await db.Incidents
                .Include(i => i.DamageReport)
                .FirstOrDefaultAsync(i => i.Id == id);

            if (incident is null || incident.DamageReport is null)
                return Results.NotFound();

            var response = new IncidentDamageReportResponse
            {
                IncidentId = incident.Id,
                DisasterType = incident.DisasterType,
                Location = $"{incident.Latitude}, {incident.Longitude}",
                HousesDamaged = incident.DamageReport.HousesDamaged,
                DisplacedFamilies = incident.DamageReport.DisplacedFamilies,
                InfrastructureDamage = new List<InfrastructureDamageItemRequest>()
            };

            return Results.Ok(response);
        });
    }

    private static async Task RunPlausibilityCheckAsync(Guid incidentId, IServiceScopeFactory scopeFactory)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IncidentDbContext>();
        var agentClient = scope.ServiceProvider.GetRequiredService<IncidentPlausibilityAgentClient>();

        var incident = await db.Incidents.FindAsync(incidentId);
        if (incident is null) return;

        var result = await agentClient.CheckPlausibilityAsync(new PlausibilityRequestDto
        {
            DisasterType = incident.DisasterType,
            Description = incident.Description,
            Latitude = incident.Latitude,
            Longitude = incident.Longitude,
            PhotoUrl = incident.PhotoUrl
        });

        if (result is null || result.OverallStatus != "Success")
        {
            db.MissionLogs.Add(new MissionLog
            {
                IncidentId = incidentId,
                Note = $"Plausibility check failed: {result?.Error ?? "Agent service unreachable"}"
            });
            await db.SaveChangesAsync();
            return;
        }

        incident.PlausibilityScore = result.PlausibilityScore;
        incident.PlausibilityReasoning = result.PlausibilityReasoning;

        db.MissionLogs.Add(new MissionLog
        {
            IncidentId = incidentId,
            Note = $"Plausibility check: score={result.PlausibilityScore}, district={result.DistrictChecked}. {result.PlausibilityReasoning}"
        });

        await db.SaveChangesAsync();
    }

    private static async Task RunDedupCheckAsync(Guid incidentId, IServiceScopeFactory scopeFactory)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IncidentDbContext>();
        var agentClient = scope.ServiceProvider.GetRequiredService<IncidentDedupAgentClient>();

        var incident = await db.Incidents.FindAsync(incidentId);
        if (incident is null) return;

        var result = await agentClient.CheckForDuplicateAsync(new DedupRequestDto
        {
            IncidentId = incidentId.ToString(),
            DisasterType = incident.DisasterType,
            Description = incident.Description,
            Latitude = incident.Latitude,
            Longitude = incident.Longitude
        });

        if (result is null || result.OverallStatus != "Success")
        {
            db.MissionLogs.Add(new MissionLog
            {
                IncidentId = incidentId,
                Note = $"Dedup check failed: {result?.Error ?? "Agent service unreachable"}"
            });
            await db.SaveChangesAsync();
            return;
        }

        db.MissionLogs.Add(new MissionLog
        {
            IncidentId = incidentId,
            Note = $"Dedup check: isDuplicate={result.IsDuplicate}, confidence={result.Confidence}. {result.Reasoning}"
        });

        if (result.IsDuplicate && Guid.TryParse(result.MatchedIncidentId, out var matchedId) && matchedId != incidentId)
        {
            // Confirm the matched incident actually exists and isn't itself a duplicate
            // (never chain duplicates — always link to a true primary).
            var matchedIncident = await db.Incidents.FindAsync(matchedId);
            if (matchedIncident is not null && matchedIncident.LinkedIncidentId is null)
            {
                incident.LinkedIncidentId = matchedId;
            }
        }

        await db.SaveChangesAsync();
    }

    private static double HaversineDistanceKm(double lat1, double lng1, double lat2, double lng2)
    {
        const double earthRadiusKm = 6371.0;
        double dLat = (lat2 - lat1) * Math.PI / 180.0;
        double dLng = (lng2 - lng1) * Math.PI / 180.0;
        double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                   Math.Cos(lat1 * Math.PI / 180.0) * Math.Cos(lat2 * Math.PI / 180.0) *
                   Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
        double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return earthRadiusKm * c;
    }
}