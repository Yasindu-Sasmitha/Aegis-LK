using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Aegis.Incident.Data;

namespace Aegis.Incident.Endpoints;

public static class IncidentEndpoints
{
    public static void MapIncidentEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/incidents").WithTags("Incidents");

        group.MapGet("/", async (IncidentDbContext db) =>
            await db.Incidents.OrderByDescending(i => i.CreatedAt).ToListAsync());

        group.MapGet("/{id:guid}", async (Guid id, IncidentDbContext db) =>
        {
            var incident = await db.Incidents.FindAsync(id);
            return incident is null ? Results.NotFound() : Results.Ok(incident);
        });
    }
}