using System;
using System.Collections.Generic;

namespace Aegis.Resource.Entities
{
    public class Warehouse
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public string Name { get; set; } = string.Empty;
        public string District { get; set; } = string.Empty;
        public decimal Latitude { get; set; }
        public decimal Longitude { get; set; }
        public string? ContactPhone { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public ICollection<Inventory> InventoryItems { get; set; } = new List<Inventory>();
        public ICollection<Vehicle> Vehicles { get; set; } = new List<Vehicle>();
    }
}
