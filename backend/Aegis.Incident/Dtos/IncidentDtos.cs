using System;
using System.Collections.Generic;

namespace Aegis.Incident.Dtos;

// ── POST /api/incidents ────────────────────────────────────────────────
public class CreateIncidentRequest
{
    public string DisasterType { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string SeverityReported { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string? PhotoUrl { get; set; }
    public Guid ReportedByUserId { get; set; }
}

// ── POST /api/incidents/{id}/assess ────────────────────────────────────
public class AssessIncidentResponse
{
    public Guid IncidentId { get; set; }
    public string SeverityAssessed { get; set; } = string.Empty;
    public int TeamsRequired { get; set; }
    public string Recommendation { get; set; } = string.Empty;
    public string OverallStatus { get; set; } = "Failed";
    public string? Error { get; set; }
}

// ── POST /api/incidents/{id}/approve ───────────────────────────────────
public class ApproveIncidentRequest
{
    public Guid ApprovedByOfficerId { get; set; }
    public int? TeamsRequiredOverride { get; set; } // officer can override the agent's suggestion
}

// ── POST /api/incidents/{id}/damage-report ─────────────────────────────
public class CreateDamageReportRequest
{
    public int HousesDamaged { get; set; }
    public int DisplacedFamilies { get; set; }
    public string InfrastructureDamageNotes { get; set; } = string.Empty;
    public List<InfrastructureDamageItemRequest> InfrastructureDamage { get; set; } = new();
}

public class InfrastructureDamageItemRequest
{
    public string AssetName { get; set; } = string.Empty;
    public string AssetType { get; set; } = "Road";
    public string DamageLevel { get; set; } = "Moderate";
    public decimal EstimatedCost { get; set; }
}

// ── GET /api/incident/{id}/damage-report ───────────────────────────────
// Shape matches Aegis.Recovery.Dtos.IncidentDamageReportDto exactly — this is a hard
// cross-module contract. Field names/casing must match for System.Text.Json to bind it.
public class IncidentDamageReportResponse
{
    public Guid IncidentId { get; set; }
    public string DisasterType { get; set; } = "Flood";
    public string Location { get; set; } = string.Empty;
    public int HousesDamaged { get; set; }
    public int DisplacedFamilies { get; set; }
    public List<InfrastructureDamageItemRequest> InfrastructureDamage { get; set; } = new();
}