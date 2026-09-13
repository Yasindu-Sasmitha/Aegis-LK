using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Aegis.Resource.Data;
using Aegis.Resource.DTOs;
using Aegis.Resource.Entities;
using Microsoft.EntityFrameworkCore;

namespace Aegis.Resource.Services
{
    public class InventoryService : IInventoryService
    {
        private readonly ResourceDbContext _db;

        public InventoryService(ResourceDbContext db)
        {
            _db = db;
        }

        public async Task<IEnumerable<InventoryResponseDto>> GetAllAsync(
            Guid? warehouseId, ItemType? itemType, bool? lowStockOnly,
            string? sortBy, bool descending, int page, int pageSize)
        {
            var query = _db.Inventory.Include(i => i.Warehouse).AsQueryable();

            if (warehouseId.HasValue)
                query = query.Where(i => i.WarehouseId == warehouseId.Value);

            if (itemType.HasValue)
                query = query.Where(i => i.ItemType == itemType.Value);

            if (lowStockOnly == true)
                query = query.Where(i =>
                    i.ReorderThreshold != null && i.QuantityAvailable <= i.ReorderThreshold);

            query = sortBy?.ToLower() switch
            {
                "quantity" => descending
                    ? query.OrderByDescending(i => i.QuantityAvailable)
                    : query.OrderBy(i => i.QuantityAvailable),
                "name" => descending
                    ? query.OrderByDescending(i => i.ItemName)
                    : query.OrderBy(i => i.ItemName),
                _ => query.OrderBy(i => i.ItemName)
            };

            page = page < 1 ? 1 : page;
            pageSize = pageSize is < 1 or > 100 ? 20 : pageSize;

            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return items.Select(ToDto);
        }

        public async Task<InventoryResponseDto?> GetByIdAsync(Guid id)
        {
            var item = await _db.Inventory
                .Include(i => i.Warehouse)
                .FirstOrDefaultAsync(i => i.Id == id);

            return item is null ? null : ToDto(item);
        }

        public async Task<InventoryResponseDto> CreateAsync(CreateInventoryDto dto)
        {
            var warehouseExists = await _db.Warehouses.AnyAsync(w => w.Id == dto.WarehouseId);
            if (!warehouseExists)
                throw new InvalidOperationException("WarehouseId does not exist.");

            var item = new Inventory
            {
                WarehouseId = dto.WarehouseId,
                ItemName = dto.ItemName,
                ItemType = dto.ItemType,
                QuantityAvailable = dto.QuantityAvailable,
                Unit = dto.Unit,
                ReorderThreshold = dto.ReorderThreshold
            };

            _db.Inventory.Add(item);
            await _db.SaveChangesAsync();

            await _db.Entry(item).Reference(i => i.Warehouse).LoadAsync();
            return ToDto(item);
        }

        public async Task<InventoryResponseDto?> UpdateAsync(Guid id, UpdateInventoryDto dto)
        {
            var item = await _db.Inventory
                .Include(i => i.Warehouse)
                .FirstOrDefaultAsync(i => i.Id == id);

            if (item is null) return null;

            item.ItemName = dto.ItemName;
            item.ItemType = dto.ItemType;
            item.QuantityAvailable = dto.QuantityAvailable;
            item.Unit = dto.Unit;
            item.ReorderThreshold = dto.ReorderThreshold;
            item.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return ToDto(item);
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var item = await _db.Inventory.FindAsync(id);
            if (item is null) return false;

            _db.Inventory.Remove(item);
            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<InventoryResponseDto?> AdjustQuantityAsync(Guid id, AdjustInventoryQuantityDto dto)
        {
            var item = await _db.Inventory
                .Include(i => i.Warehouse)
                .FirstOrDefaultAsync(i => i.Id == id);

            if (item is null) return null;

            var newQuantity = item.QuantityAvailable + dto.QuantityChange;
            if (newQuantity < 0)
                throw new InvalidOperationException("Adjustment would result in negative stock.");

            item.QuantityAvailable = newQuantity;
            item.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return ToDto(item);
        }

        private static InventoryResponseDto ToDto(Inventory i) => new()
        {
            Id = i.Id,
            WarehouseId = i.WarehouseId,
            WarehouseName = i.Warehouse?.Name ?? string.Empty,
            ItemName = i.ItemName,
            ItemType = i.ItemType,
            QuantityAvailable = i.QuantityAvailable,
            Unit = i.Unit,
            ReorderThreshold = i.ReorderThreshold,
            IsLowStock = i.ReorderThreshold.HasValue && i.QuantityAvailable <= i.ReorderThreshold.Value,
            CreatedAt = i.CreatedAt,
            UpdatedAt = i.UpdatedAt
        };
    }
}
