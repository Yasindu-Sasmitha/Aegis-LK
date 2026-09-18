using System;

namespace Aegis.Resource.Entities
{
    public class Vehicle
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid WarehouseId { get; set; }
        public Warehouse? Warehouse { get; set; }

        public string RegistrationNumber { get; set; } = string.Empty;
        public VehicleType VehicleType { get; set; }
        public decimal Capacity { get; set; }
        public VehicleStatus Status { get; set; } = VehicleStatus.Available;

        // 1:1 with Fuel — nullable because a brand-new vehicle record might not
        // have a fuel reading yet.
        public Guid? FuelId { get; set; }
        public Fuel? Fuel { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
