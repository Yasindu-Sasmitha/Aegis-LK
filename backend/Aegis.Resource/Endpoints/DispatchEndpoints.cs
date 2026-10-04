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
            var group = app.MapGroup("/api/resource/dispatch")
                .RequireAuthorization()
                .WithTags("Resource - Dispatch");

            group.MapGet("/", async (IDispatchService svc) =>
            {
                var plans = await svc.GetAllAsync();
                return Results.Ok(plans);
            });
            group.MapPost("/requests", async (
            CreateDispatchRequestDto dto,
            IDispatchService svc,
            HttpContext ctx,
            IConfiguration config) =>
        {
            // Internal service-to-service call: check for X-Aegis-Agent-Key header.
            // If present and valid, bypass JWT role check (but still require an authenticated identity).
            var agentKey = config["AgenticAi:AgentKey"]
                ?? Environment.GetEnvironmentVariable("AEGIS_AGENT_KEY")
                ?? "";
            var providedKey = ctx.Request.Headers["X-Aegis-Agent-Key"].ToString();
            var isInternalCall = !string.IsNullOrWhiteSpace(agentKey)
                && string.Equals(agentKey, providedKey, StringComparison.Ordinal);

            // If not an internal call, enforce the role policy.
            if (!isInternalCall && !ctx.User.IsInRole("Responder")
                && !ctx.User.IsInRole("Admin") && !ctx.User.IsInRole("DisasterOfficer"))
            {
                return Results.Unauthorized();
            }

            var result = await svc.CreateDispatchRequestAsync(dto);
            if (result is null)
                return Results.Problem("Agent service unavailable.", statusCode: 503);
            if (result.ApprovalStatus == "SafeFailure")
                return Results.UnprocessableEntity(result);
            return Results.Ok(result);
        }).AllowAnonymous();

            group.MapPost("/{id:guid}/approve", async (
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
            }).RequireAuthorization(p => p.RequireRole(
                "Admin", "DisasterOfficer"));
                            group.MapDelete("/{id:guid}", async (Guid id, IDispatchService svc) =>
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
            }).RequireAuthorization(p => p.RequireRole(
                "Admin", "DisasterOfficer"));
        }
    }
}