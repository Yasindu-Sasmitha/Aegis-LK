using System;
using System.Collections.Generic;

namespace Aegis.Incident.Models;

public class IncidentReport
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string DisasterType { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string SeverityReported { get; set; } = string.Empty;
    public string? SeverityAssessed { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public string? PhotoUrl { get; set; }
    public string Status { get; set; } = "Reported";
    public Guid ReportedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public RescueMission? RescueMission { get; set; }
    public DamageReport? DamageReport { get; set; }
    public ICollection<Victim> Victims { get; set; } = new List<Victim>();
    public ICollection<MissionLog> Logs { get; set; } = new List<MissionLog>();
}

public class Victim
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid IncidentId { get; set; }
    public IncidentReport? Incident { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = "Unknown";
    public string? Notes { get; set; }
}

public class Volunteer
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Skills { get; set; } = string.Empty;
    public string Status { get; set; } = "Available";
}

public class RescueTeam
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = "Available";
    public double? CurrentLatitude { get; set; }
    public double? CurrentLongitude { get; set; }
}

public class RescueMission
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid IncidentId { get; set; }
    public IncidentReport? Incident { get; set; }
    public int TeamsRequired { get; set; }
    public string Status { get; set; } = "Pending";
    public Guid? ApprovedByOfficerId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ApprovedAt { get; set; }
}

public class MissionLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid IncidentId { get; set; }
    public IncidentReport? Incident { get; set; }
    public string Note { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class DamageReport
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid IncidentId { get; set; }
    public IncidentReport? Incident { get; set; }
    public int HousesDamaged { get; set; }
    public int DisplacedFamilies { get; set; }
    public string InfrastructureDamageNotes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}