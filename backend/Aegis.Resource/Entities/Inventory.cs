using System;

namespace Aegis.Resource.Entities
{
    public class Inventory
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid WarehouseId { get; set; }
        public Warehouse? Warehouse { get; set; }

        public string ItemName { get; set; } = string.Empty;
        public ItemType ItemType { get; set; }
        public int QuantityAvailable { get; set; }
        public string Unit { get; set; } = "units";
        public int? ReorderThreshold { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
