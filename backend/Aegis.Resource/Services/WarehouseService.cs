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
    public class WarehouseService : IWarehouseService
    {
        private readonly ResourceDbContext _db;

        public WarehouseService(ResourceDbContext db)
        {
            _db = db;
        }

        public async Task<IEnumerable<WarehouseResponseDto>> GetAllAsync(
            string? district, string? search, int page, int pageSize)
        {
            var query = _db.Warehouses
                .Include(w => w.InventoryItems)
                .Include(w => w.Vehicles)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(district))
                query = query.Where(w => w.District == district);

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(w => w.Name.Contains(search));

            page = page < 1 ? 1 : page;
            pageSize = pageSize is < 1 or > 100 ? 20 : pageSize;

            var warehouses = await query
                .OrderBy(w => w.Name)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return warehouses.Select(ToDto);
        }

        public async Task<WarehouseResponseDto?> GetByIdAsync(Guid id)
        {
            var warehouse = await _db.Warehouses
                .Include(w => w.InventoryItems)
                .Include(w => w.Vehicles)
                .FirstOrDefaultAsync(w => w.Id == id);

            return warehouse is null ? null : ToDto(warehouse);
        }

        public async Task<WarehouseResponseDto> CreateAsync(CreateWarehouseDto dto)
        {
            var warehouse = new Warehouse
            {
                Name = dto.Name,
                District = dto.District,
                Latitude = dto.Latitude,
                Longitude = dto.Longitude,
                ContactPhone = dto.ContactPhone
            };

            _db.Warehouses.Add(warehouse);
            await _db.SaveChangesAsync();

            return ToDto(warehouse);
        }

        public async Task<WarehouseResponseDto?> UpdateAsync(Guid id, UpdateWarehouseDto dto)
        {
            var warehouse = await _db.Warehouses
                .Include(w => w.InventoryItems)
                .Include(w => w.Vehicles)
                .FirstOrDefaultAsync(w => w.Id == id);

            if (warehouse is null) return null;

            warehouse.Name = dto.Name;
            warehouse.District = dto.District;
            warehouse.Latitude = dto.Latitude;
            warehouse.Longitude = dto.Longitude;
            warehouse.ContactPhone = dto.ContactPhone;
            warehouse.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return ToDto(warehouse);
        }

        public async Task<bool> DeleteAsync(Guid id)
        {
            var warehouse = await _db.Warehouses.FindAsync(id);
            if (warehouse is null) return false;

            _db.Warehouses.Remove(warehouse);
            await _db.SaveChangesAsync();
            return true;
        }

        private static WarehouseResponseDto ToDto(Warehouse w) => new()
        {
            Id = w.Id,
            Name = w.Name,
            District = w.District,
            Latitude = w.Latitude,
            Longitude = w.Longitude,
            ContactPhone = w.ContactPhone,
            InventoryItemCount = w.InventoryItems?.Count ?? 0,
            VehicleCount = w.Vehicles?.Count ?? 0,
            CreatedAt = w.CreatedAt,
            UpdatedAt = w.UpdatedAt
        };
    }
}
