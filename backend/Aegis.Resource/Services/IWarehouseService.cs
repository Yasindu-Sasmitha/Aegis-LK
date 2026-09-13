using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Aegis.Resource.DTOs;

namespace Aegis.Resource.Services
{
    public interface IWarehouseService
    {
        Task<IEnumerable<WarehouseResponseDto>> GetAllAsync(string? district, string? search, int page, int pageSize);
        Task<WarehouseResponseDto?> GetByIdAsync(Guid id);
        Task<WarehouseResponseDto> CreateAsync(CreateWarehouseDto dto);
        Task<WarehouseResponseDto?> UpdateAsync(Guid id, UpdateWarehouseDto dto);
        Task<bool> DeleteAsync(Guid id);
    }
}
