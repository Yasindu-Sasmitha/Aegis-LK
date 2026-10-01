using System;
using System.Security.Claims;
using Aegis.Resource.DTOs;
using Aegis.Resource.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

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
                CreateDispatchRequestDto dto, IDispatchService svc) =>
            {
                var result = await svc.CreateDispatchRequestAsync(dto);
                if (result is null)
                    return Results.Problem(
                        "Agent service unavailable.", statusCode: 503);
                if (result.ApprovalStatus == "SafeFailure")
                    return Results.UnprocessableEntity(result);
                return Results.Ok(result);
            }).RequireAuthorization(p => p.RequireRole(
                "Admin", "DisasterOfficer"));

            group.MapGet("/{id:guid}", async (Guid id, IDispatchService svc) =>
            {
                var d = await svc.GetAsync(id);
                return d is null ? Results.NotFound() : Results.Ok(d);
            });

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
        }
    }
}