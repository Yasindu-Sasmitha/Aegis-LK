using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Aegis.Resource.DTOs;
using Aegis.Resource.Entities;

namespace Aegis.Resource.Services
{
    public interface IInventoryService
    {
        Task<IEnumerable<InventoryResponseDto>> GetAllAsync(
            Guid? warehouseId, ItemType? itemType, bool? lowStockOnly,
            string? sortBy, bool descending, int page, int pageSize);
        Task<InventoryResponseDto?> GetByIdAsync(Guid id);
        Task<InventoryResponseDto> CreateAsync(CreateInventoryDto dto);
        Task<InventoryResponseDto?> UpdateAsync(Guid id, UpdateInventoryDto dto);
        Task<bool> DeleteAsync(Guid id);

        // Business-specific operation beyond basic CRUD: adjust stock up or
        // down (e.g. restocking, or deducting after a dispatch is sent).
        Task<InventoryResponseDto?> AdjustQuantityAsync(Guid id, AdjustInventoryQuantityDto dto);
    }
}
