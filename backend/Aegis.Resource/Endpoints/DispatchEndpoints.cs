using System;
using System.Security.Claims;
using Aegis.Resource.DTOs;
using Aegis.Resource.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace Aegis.Resource.Endpoints
{
    public static class DispatchEndpoints
    {
        public static void MapDispatchEndpoints(this WebApplication app)
        {
            // READ endpoints — Admin, DisasterOfficer, Responder
            var readGroup = app.MapGroup("/api/resource/dispatch")
                .RequireAuthorization(p => p.RequireRole(
                    "Admin", "DisasterOfficer", "Responder"))
                .WithTags("Resource - Dispatch");

            readGroup.MapGet("/", async (IDispatchService svc) =>
            {
                var plans = await svc.GetAllAsync();
                return Results.Ok(plans);
            });

            readGroup.MapGet("/{id:guid}", async (Guid id, IDispatchService svc) =>
            {
                var plan = await svc.GetAsync(id);
                return plan is null ? Results.NotFound() : Results.Ok(plan);
            });

            // WRITE endpoints — Admin, DisasterOfficer + internal service
            // POST /api/resource/dispatch/requests
            // This endpoint accepts two authentication paths:
            //   1. Internal service-to-service call (X-Aegis-Agent-Key header)
            //      — from the Incident module's cross-module dispatch trigger.
            //   2. External authenticated user with a staff role (Admin / DisasterOfficer).
            // Citizens and Responders cannot create dispatch plans.
            app.MapPost("/api/resource/dispatch/requests", async (
                CreateDispatchRequestDto dto,
                IDispatchService svc,
                HttpContext ctx,
                IConfiguration config) =>
            {
                var agentKey = config["AgenticAi:AgentKey"]
                    ?? Environment.GetEnvironmentVariable("AEGIS_AGENT_KEY")
                    ?? "";
                var providedKey = ctx.Request.Headers["X-Aegis-Agent-Key"].ToString();
                var isInternalCall = !string.IsNullOrWhiteSpace(agentKey)
                    && string.Equals(agentKey, providedKey, StringComparison.Ordinal);

                if (!isInternalCall
                    && !ctx.User.IsInRole("Admin")
                    && !ctx.User.IsInRole("DisasterOfficer"))
                {
                    return Results.Forbid();
                }

                var result = await svc.CreateDispatchRequestAsync(dto);
                if (result is null)
                    return Results.Problem("Agent service unavailable.", statusCode: 503);
                if (result.ApprovalStatus == "SafeFailure")
                    return Results.UnprocessableEntity(result);
                return Results.Ok(result);
            })
            .AllowAnonymous()  // Authorization is enforced inside the handler
            .WithTags("Resource - Dispatch (write)");

            // POST /approve — Admin, DisasterOfficer only
            var approveGroup = app.MapGroup("/api/resource/dispatch")
                .RequireAuthorization(p => p.RequireRole(
                    "Admin", "DisasterOfficer"))
                .WithTags("Resource - Dispatch (write)");

            approveGroup.MapPost("/{id:guid}/approve", async (
                Guid id, IDispatchService svc, HttpContext ctx) =>
            {
                var userId = Guid.TryParse(
                    ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value,
                    out var uid) ? uid : Guid.Empty;
                try
                {
                    var d = await svc.ApproveAsync(id, userId);
                    return d is null ? Results.NotFound() : Results.Ok(d);
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new { message = ex.Message });
                }
            });

            // DELETE — Admin, DisasterOfficer only
            approveGroup.MapDelete("/{id:guid}", async (Guid id, IDispatchService svc) =>
            {
                try
                {
                    var deleted = await svc.DeleteAsync(id);
                    return deleted ? Results.NoContent() : Results.NotFound();
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new { message = ex.Message });
                }
            });
        }
    }
}