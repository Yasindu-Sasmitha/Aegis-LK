using System;

namespace Aegis.Recovery.Models;

public class NGO
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string ContactEmail { get; set; } = string.Empty;
    public string ContactPhone { get; set; } = string.Empty;
    public string Sectors { get; set; } = string.Empty; // e.g. "Housing, Clean Water, Medical"
    public string OperatingDistricts { get; set; } = string.Empty; // e.g. "Colombo, Kalutara"
    public decimal AssignedBudget { get; set; }
    public string Status { get; set; } = "Active"; // Active | Assigned | Inactive
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
