using System;

namespace Aegis.Recovery.Models;

public class RecoveryTask
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? RecoveryPlanId { get; set; }
    public RecoveryPlan? RecoveryPlan { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Guid? AssignedNGOId { get; set; }
    public NGO? AssignedNGO { get; set; }
    public string Priority { get; set; } = "Medium"; // Critical | High | Medium | Low
    public decimal EstimatedCost { get; set; }
    public string Status { get; set; } = "Pending"; // Pending | InProgress | Completed
    public DateTime? TargetCompletionDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
