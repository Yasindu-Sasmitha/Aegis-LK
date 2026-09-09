using System;

namespace Aegis.Recovery.Models;

public class Donation
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string DonorName { get; set; } = string.Empty;
    public string DonorContact { get; set; } = string.Empty;
    public string DonationType { get; set; } = "Monetary"; // Monetary | Supplies | Equipment
    public decimal AmountOrQuantity { get; set; }
    public string ItemDescription { get; set; } = string.Empty;
    public Guid? TargetShelterId { get; set; }
    public Shelter? TargetShelter { get; set; }
    public string AllocationStatus { get; set; } = "Unallocated"; // Unallocated | Allocated | Distributed
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
