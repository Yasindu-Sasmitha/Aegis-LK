using System;

namespace Aegis.Resource.Entities
{
    // Kept as its own table for normalization, per the spec's expectations.
    // If you're short on time, these three fields can instead be folded
    // directly onto Vehicle and this class removed.
    public class Fuel
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid VehicleId { get; set; }
        public Vehicle? Vehicle { get; set; }

        public decimal FuelLevel { get; set; } // percentage, 0-100
        public DateTime? LastRefueledAt { get; set; }
        public decimal? RangeEstimateKm { get; set; }
    }
}
