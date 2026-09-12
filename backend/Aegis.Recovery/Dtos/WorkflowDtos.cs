using System;
using System.Collections.Generic;

namespace Aegis.Recovery.Dtos;

// ─────────────────────────────────────────────────────────────────────────────
// Independent Damage Intake (allows recovery module to work without Incident module)
// ─────────────────────────────────────────────────────────────────────────────

/// <summary>
/// Submitted by a field officer or citizen via the Recovery module directly.
/// This is the entry point when the Incident module is unavailable or for testing.
/// </summary>
public record DamageIntakeRequest(
    string District,
    string DisasterType,          // Flood | Landslide | Cyclone | Earthquake | Drought
    int HousesDamaged,
    int DisplacedFamilies,
    List<InfrastructureItemRequest> InfrastructureDamage,
    string? ReporterName,
    string? ReporterContact,
    string? AdditionalNotes       // Sanitized before sending to AI
);

public record InfrastructureItemRequest(
    string AssetName,
    string AssetType,             // Road | Bridge | Water | Healthcare | School | Power
    string DamageLevel,           // Minor | Moderate | Severe | Destroyed
    decimal EstimatedCost
);

// ─────────────────────────────────────────────────────────────────────────────
// Workflow Start
// ─────────────────────────────────────────────────────────────────────────────

/// <summary>
/// Starts a full multi-agent recovery planning workflow for an existing incident ID
/// or with inline damage data from the independent intake.
/// </summary>
public record StartWorkflowRequest(
    Guid? IncidentId,                           // Optional — uses IncidentIntegrationService if provided
    DamageIntakeRequest? DirectDamageIntake,    // Required if IncidentId is null
    string? RevisionGuidance                    // Populated when re-running after a revision request
);

// ─────────────────────────────────────────────────────────────────────────────
// Workflow Observability DTOs
// ─────────────────────────────────────────────────────────────────────────────

public record AgentStepDto(
    string AgentName,
    string Role,
    string InputSummary,
    string OutputSummary,
    int DurationMs,
    string Status,              // success | failed | skipped
    string? ErrorMessage
);

public record ToolCallDto(
    string ToolName,
    string InputJson,
    string OutputJson,
    int DurationMs,
    string Status,              // success | failed | validation_error
    string? ErrorMessage
);

public record ValidationResultDto(
    string RuleName,
    bool Passed,
    string Detail
);

public record WorkflowTraceDto(
    Guid WorkflowLogId,
    Guid RecoveryPlanId,
    string ExecutionStatus,
    int TotalDurationMs,
    int RetryCount,
    string ExecutionSummary,
    List<AgentStepDto> AgentSteps,
    List<ToolCallDto> ToolCalls,
    List<ValidationResultDto> ValidationResults,
    string Errors,
    // Approval audit
    string? ApprovedBy,
    string? ApprovalDecision,
    DateTime? ApprovalTimestamp,
    string? ApprovalNotes,
    DateTime CreatedAt
);

// ─────────────────────────────────────────────────────────────────────────────
// Extended Plan DTO (includes workflow trace link)
// ─────────────────────────────────────────────────────────────────────────────

public record RecoveryPlanDetailDto(
    Guid Id,
    Guid IncidentId,
    string PlanName,
    string Status,
    decimal EstimatedTotalBudget,
    string PlanSummaryJson,
    string? ReviewNotes,
    string? ReviewedBy,
    DateTime CreatedAt,
    DateTime? ReviewedAt,
    int RevisionCount,
    List<TaskDto> Tasks,
    WorkflowTraceDto? WorkflowTrace    // null if no agentic workflow was run
);

public record CreateRecoveryReportRequest(
    string Title,
    int TotalSheltered,
    int TotalAidRequestsFulfilled,
    decimal TotalCompensationDisbursed,
    decimal TotalBudgetSpent,
    string? ReportSummary
);
