using Aegis.Resource.DTOs;
using Aegis.Resource.Entities;
using Aegis.Resource.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

namespace Aegis.Resource.Endpoints
{
    public static class InventoryEndpoints
    {
        public static void MapInventoryEndpoints(this WebApplication app)
        {
            var group = app.MapGroup("/api/resource/inventory")
                .RequireAuthorization()
                .WithTags("Resource - Inventory");

            group.MapGet("/", async (
                Guid? warehouseId,
                ItemType? itemType,
                bool? lowStockOnly,
                string? sortBy,
                bool descending,
                int page,
                int pageSize,
                IInventoryService inventoryService) =>
            {
                var result = await inventoryService.GetAllAsync(
                    warehouseId, itemType, lowStockOnly, sortBy, descending,
                    page == 0 ? 1 : page, pageSize == 0 ? 20 : pageSize);
                return Results.Ok(result);
            });

            group.MapGet("/{id:guid}", async (Guid id, IInventoryService inventoryService) =>
            {
                var result = await inventoryService.GetByIdAsync(id);
                return result is null ? Results.NotFound() : Results.Ok(result);
            });

            group.MapPost("/", async (CreateInventoryDto dto, IInventoryService inventoryService) =>
            {
                try
                {
                    var created = await inventoryService.CreateAsync(dto);
                    return Results.Created($"/api/resource/inventory/{created.Id}", created);
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new { message = ex.Message });
                }
            }).RequireAuthorization(policy => policy.RequireRole("ResourceManager", "Admin"));

            group.MapPut("/{id:guid}", async (Guid id, UpdateInventoryDto dto, IInventoryService inventoryService) =>
            {
                var updated = await inventoryService.UpdateAsync(id, dto);
                return updated is null ? Results.NotFound() : Results.Ok(updated);
            }).RequireAuthorization(policy => policy.RequireRole("ResourceManager", "Admin"));

            group.MapDelete("/{id:guid}", async (Guid id, IInventoryService inventoryService) =>
            {
                var deleted = await inventoryService.DeleteAsync(id);
                return deleted ? Results.NoContent() : Results.NotFound();
            }).RequireAuthorization(policy => policy.RequireRole("Admin"));

            // Business-specific operation beyond basic CRUD
            group.MapPatch("/{id:guid}/adjust", async (
                Guid id, AdjustInventoryQuantityDto dto, IInventoryService inventoryService) =>
            {
                try
                {
                    var updated = await inventoryService.AdjustQuantityAsync(id, dto);
                    return updated is null ? Results.NotFound() : Results.Ok(updated);
                }
                catch (InvalidOperationException ex)
                {
                    return Results.BadRequest(new { message = ex.Message });
                }
            }).RequireAuthorization(policy => policy.RequireRole("ResourceManager", "Admin"));
        }
    }
}
