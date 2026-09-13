using Aegis.Resource.DTOs;
using Aegis.Resource.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
namespace Aegis.Resource.Endpoints
{
    public static class WarehouseEndpoints
    {
        public static void MapWarehouseEndpoints(this WebApplication app)
        {
            var group = app.MapGroup("/api/resource/warehouses")
                .RequireAuthorization()
                .WithTags("Resource - Warehouses");

            group.MapGet("/", async (
                string? district,
                string? search,
                int page,
                int pageSize,
                IWarehouseService warehouseService) =>
            {
                var result = await warehouseService.GetAllAsync(
                    district, search, page == 0 ? 1 : page, pageSize == 0 ? 20 : pageSize);
                return Results.Ok(result);
            });

            group.MapGet("/{id:guid}", async (Guid id, IWarehouseService warehouseService) =>
            {
                var result = await warehouseService.GetByIdAsync(id);
                return result is null ? Results.NotFound() : Results.Ok(result);
            });

            group.MapPost("/", async (CreateWarehouseDto dto, IWarehouseService warehouseService) =>
            {
                var created = await warehouseService.CreateAsync(dto);
                return Results.Created($"/api/resource/warehouses/{created.Id}", created);
            }).RequireAuthorization(policy => policy.RequireRole("ResourceManager", "Admin"));

            group.MapPut("/{id:guid}", async (Guid id, UpdateWarehouseDto dto, IWarehouseService warehouseService) =>
            {
                var updated = await warehouseService.UpdateAsync(id, dto);
                return updated is null ? Results.NotFound() : Results.Ok(updated);
            }).RequireAuthorization(policy => policy.RequireRole("ResourceManager", "Admin"));

            group.MapDelete("/{id:guid}", async (Guid id, IWarehouseService warehouseService) =>
            {
                var deleted = await warehouseService.DeleteAsync(id);
                return deleted ? Results.NoContent() : Results.NotFound();
            }).RequireAuthorization(policy => policy.RequireRole("Admin"));
        }
    }
}
