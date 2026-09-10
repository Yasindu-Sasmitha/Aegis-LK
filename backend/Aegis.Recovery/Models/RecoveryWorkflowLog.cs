using System;
using System.Collections.Generic;

namespace Aegis.Recovery.Models;

/// <summary>
/// Persists the full multi-agent workflow execution state for a recovery plan.
/// Stores agent steps, tool calls, validation results, approval decisions and errors.
/// Hidden model reasoning / chain-of-thought is NEVER stored here.
/// </summary>
public class RecoveryWorkflowLog
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Foreign key to the recovery plan produced by this workflow.</summary>
    public Guid RecoveryPlanId { get; set; }
    public RecoveryPlan? RecoveryPlan { get; set; }

    /// <summary>The original incident damage intake that triggered the workflow.</summary>
    public string ObjectiveJson { get; set; } = "{}";

    /// <summary>JSON array of agent execution steps (agent name, input, output summary, duration_ms, status).</summary>
    public string AgentStepsJson { get; set; } = "[]";

    /// <summary>JSON array of tool calls made by Agent 3 (tool name, input, output, duration_ms).</summary>
    public string ToolCallsJson { get; set; } = "[]";

    /// <summary>JSON array of business-rule validation results from Agent 4.</summary>
    public string ValidationResultsJson { get; set; } = "[]";

    /// <summary>Any errors encountered during execution; empty string if none.</summary>
    public string Errors { get; set; } = string.Empty;

    /// <summary>Number of retries attempted across all agents.</summary>
    public int RetryCount { get; set; }

    /// <summary>Overall execution status: Running | PendingApproval | Approved | Rejected | Failed.</summary>
    public string ExecutionStatus { get; set; } = "Running";

    /// <summary>Total wall-clock time in milliseconds for the entire workflow.</summary>
    public int TotalDurationMs { get; set; }

    /// <summary>Name of the officer who approved/rejected, if actioned.</summary>
    public string? ApprovedBy { get; set; }

    /// <summary>Approval decision: Approved | Rejected | RevisionRequested | null (if not yet actioned).</summary>
    public string? ApprovalDecision { get; set; }

    /// <summary>Timestamp of the human approval/rejection decision.</summary>
    public DateTime? ApprovalTimestamp { get; set; }

    /// <summary>The officer's notes at the time of approval/rejection/revision.</summary>
    public string? ApprovalNotes { get; set; }

    /// <summary>Concise human-readable execution summary for the UI.</summary>
    public string ExecutionSummary { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
