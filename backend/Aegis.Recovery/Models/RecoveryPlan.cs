using System;
using System.Collections.Generic;

namespace Aegis.Recovery.Models;

public class RecoveryPlan
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid IncidentId { get; set; }
    public string PlanName { get; set; } = string.Empty;
    public string Status { get; set; } = "Draft"; // Draft | PendingApproval | Approved | Rejected | RevisionRequested
    public decimal EstimatedTotalBudget { get; set; }
    public string PlanSummaryJson { get; set; } = "{}";
    public string? ReviewNotes { get; set; }
    public string? ReviewedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReviewedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    /// <summary>Number of times the workflow has been revised and re-run.</summary>
    public int RevisionCount { get; set; }

    public ICollection<RecoveryTask> Tasks { get; set; } = new List<RecoveryTask>();

    /// <summary>One-to-one agentic execution log for observability.</summary>
    public RecoveryWorkflowLog? WorkflowLog { get; set; }
}
