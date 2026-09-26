using System;

namespace Aegis.Recovery.Models;

public class DamageReport
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? IncidentId { get; set; }
    public string District { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string DisasterType { get; set; } = "Flood";
    public int HousesDamaged { get; set; }
    public int DisplacedFamilies { get; set; }
    public string ReporterName { get; set; } = string.Empty;
    public string ReporterContact { get; set; } = string.Empty;
    public string AdditionalNotes { get; set; } = string.Empty;
    public string InfrastructureJson { get; set; } = "[]";
    public string Status { get; set; } = "Submitted"; // Submitted, PlanGenerated, UnderReview, Approved, Rejected
    public Guid? RecoveryPlanId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }
}
