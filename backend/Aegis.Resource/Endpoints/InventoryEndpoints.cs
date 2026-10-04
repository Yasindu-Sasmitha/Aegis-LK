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
            // READ endpoints — Admin, DisasterOfficer, Responder
            var readGroup = app.MapGroup("/api/resource/inventory")
                .RequireAuthorization(p => p.RequireRole(
                    "Admin", "DisasterOfficer", "Responder"))
                .WithTags("Resource - Inventory");

            readGroup.MapGet("/", async (
                IInventoryService inventoryService,
                Guid? warehouseId = null,
                ItemType? itemType = null,
                bool? lowStockOnly = null,
                string? sortBy = null,
                bool descending = false,
                int page = 1,
                int pageSize = 20) =>
            {
                var result = await inventoryService.GetAllAsync(
                    warehouseId, itemType, lowStockOnly, sortBy, descending,
                    page == 0 ? 1 : page, pageSize == 0 ? 20 : pageSize);
                var items = result.ToList();

                return Results.Ok(new
                {
                    total = items.Count,
                    page = page == 0 ? 1 : page,
                    pageSize = pageSize == 0 ? 20 : pageSize,
                    items
                });
            });

            readGroup.MapGet("/{id:guid}", async (Guid id, IInventoryService inventoryService) =>
            {
                var result = await inventoryService.GetByIdAsync(id);
                return result is null ? Results.NotFound() : Results.Ok(result);
            });

            // WRITE endpoints — Admin, DisasterOfficer only
            var writeGroup = app.MapGroup("/api/resource/inventory")
                .RequireAuthorization(p => p.RequireRole(
                    "Admin", "DisasterOfficer"))
                .WithTags("Resource - Inventory (write)");

            writeGroup.MapPost("/", async (CreateInventoryDto dto, IInventoryService inventoryService) =>
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
            });

            writeGroup.MapPut("/{id:guid}", async (Guid id, UpdateInventoryDto dto, IInventoryService inventoryService) =>
            {
                var updated = await inventoryService.UpdateAsync(id, dto);
                return updated is null ? Results.NotFound() : Results.Ok(updated);
            });

            // PATCH /adjust — Admin, DisasterOfficer only
            writeGroup.MapPatch("/{id:guid}/adjust", async (
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
            });

            // DELETE — Admin only
            app.MapDelete("/api/resource/inventory/{id:guid}",
                async (Guid id, IInventoryService inventoryService) =>
                {
                    var deleted = await inventoryService.DeleteAsync(id);
                    return deleted ? Results.NoContent() : Results.NotFound();
                })
                .RequireAuthorization(p => p.RequireRole("Admin"))
                .WithTags("Resource - Inventory (admin)");
        }
    }
}