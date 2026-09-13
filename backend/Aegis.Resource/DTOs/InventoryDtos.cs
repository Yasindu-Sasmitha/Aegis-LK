using System;
using System.ComponentModel.DataAnnotations;
using Aegis.Resource.Entities;

namespace Aegis.Resource.DTOs
{
    public class CreateInventoryDto
    {
        [Required]
        public Guid WarehouseId { get; set; }

        [Required, MaxLength(150)]
        public string ItemName { get; set; } = string.Empty;

        [Required]
        public ItemType ItemType { get; set; }

        [Range(0, int.MaxValue)]
        public int QuantityAvailable { get; set; }

        [MaxLength(20)]
        public string Unit { get; set; } = "units";

        public int? ReorderThreshold { get; set; }
    }

    public class UpdateInventoryDto
    {
        [Required, MaxLength(150)]
        public string ItemName { get; set; } = string.Empty;

        [Required]
        public ItemType ItemType { get; set; }

        [Range(0, int.MaxValue)]
        public int QuantityAvailable { get; set; }

        [MaxLength(20)]
        public string Unit { get; set; } = "units";

        public int? ReorderThreshold { get; set; }
    }

    // Small, focused DTO for the common "restock" / "consume stock" operation —
    // a business-specific operation beyond basic CRUD, which the spec requires
    // at least one of per component.
    public class AdjustInventoryQuantityDto
    {
        // Positive to add stock, negative to deduct (e.g. after a dispatch).
        [Required]
        public int QuantityChange { get; set; }

        [MaxLength(200)]
        public string? Reason { get; set; }
    }

    public class InventoryResponseDto
    {
        public Guid Id { get; set; }
        public Guid WarehouseId { get; set; }
        public string WarehouseName { get; set; } = string.Empty;
        public string ItemName { get; set; } = string.Empty;
        public ItemType ItemType { get; set; }
        public int QuantityAvailable { get; set; }
        public string Unit { get; set; } = string.Empty;
        public int? ReorderThreshold { get; set; }
        public bool IsLowStock { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
