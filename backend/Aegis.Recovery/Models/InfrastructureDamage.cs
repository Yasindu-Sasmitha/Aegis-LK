using System;

namespace Aegis.Recovery.Models;

public class InfrastructureDamage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid IncidentId { get; set; }
    public string AssetName { get; set; } = string.Empty;
    public string AssetType { get; set; } = "Road"; // Bridge | Road | School | Hospital | PowerGrid | WaterFacility
    public string DamageLevel { get; set; } = "Moderate"; // Minor | Moderate | Severe | Destroyed
    public decimal EstimatedRepairCost { get; set; }
    public int PriorityScore { get; set; } = 1;
    public string Status { get; set; } = "Reported"; // Reported | Planning | InRepair | Restored
    public string Notes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
