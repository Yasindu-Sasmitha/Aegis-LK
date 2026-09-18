using System;

namespace Aegis.Resource.Entities
{
    public class Delivery
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid DispatchId { get; set; }
        public Dispatch? Dispatch { get; set; }

        public DeliveryStatus Status { get; set; } = DeliveryStatus.InTransit;
        public DateTime? DepartedAt { get; set; }
        public DateTime? DeliveredAt { get; set; }

        // Populated if you implement the QR-scan-on-arrival Flutter feature.
        public string? ConfirmationCode { get; set; }
    }
}
