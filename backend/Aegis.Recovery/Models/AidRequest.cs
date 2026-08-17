using System;

namespace Aegis.Recovery.Models;

public class AidRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string VictimName { get; set; } = string.Empty;
    public string ContactPhone { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public string AidType { get; set; } = "Shelter"; // Food | Medical | Shelter | Financial | Clothing
    public int FamilySize { get; set; } = 1;
    public string Urgency { get; set; } = "Medium"; // Critical | High | Medium | Low
    public string Status { get; set; } = "Pending"; // Pending | Approved | Fulfilled | Rejected
    public Guid? ShelterId { get; set; }
    public Shelter? Shelter { get; set; }
    public string Notes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
