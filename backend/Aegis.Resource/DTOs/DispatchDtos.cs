using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Aegis.Resource.DTOs
{
    public class CreateDispatchRequestDto
    {
        [Required] public Guid MissionId { get; set; }
        [Range(1, 20)] public int TeamsRequired { get; set; }
        [Required, MaxLength(100)] public string District { get; set; } = string.Empty;
        [Required] public decimal Latitude { get; set; }
        [Required] public decimal Longitude { get; set; }

        // [INCIDENT-LINK] Optional incident snapshot — sent by the Incident module
        // when the mission originated from a citizen report. Null for manual plans.
        [MaxLength(50)] public string? IncidentDisasterType { get; set; }
        [MaxLength(50)] public string? IncidentSeverity { get; set; }
        public DateTime? IncidentCreatedAt { get; set; }
    }

    public class DispatchItemDto
    {
        public string ItemName { get; set; } = string.Empty;
        public int Quantity { get; set; }
    }

    public class DispatchResponseDto
    {
        public Guid Id { get; set; }
        public Guid MissionId { get; set; }
        public Guid WarehouseId { get; set; }
        public string WarehouseName { get; set; } = string.Empty;
        public string District { get; set; } = string.Empty;
        public int VehicleCount { get; set; }
        public int EstimatedArrivalMinutes { get; set; }
        public string ApprovalStatus { get; set; } = string.Empty;
        public string RouteSummary { get; set; } = string.Empty;
        public List<DispatchItemDto> Items { get; set; } = new();
        public List<Dictionary<string, object>> Steps { get; set; } = new();
        public string OverallStatus { get; set; } = "Success";
        public string? Error { get; set; }
        public DateTime CreatedAt { get; set; }
        public int TeamsRequired { get; set; }

        // [INCIDENT-LINK] Echo the incident snapshot back to the UI.
        public string? IncidentDisasterType { get; set; }
        public string? IncidentSeverity { get; set; }
        public DateTime? IncidentCreatedAt { get; set; }
        public bool IsIncidentLinked => !string.IsNullOrWhiteSpace(IncidentDisasterType);
    }
}