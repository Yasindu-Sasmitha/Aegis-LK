using System;
using System.Collections.Generic;

namespace Aegis.Recovery.Dtos;

public class InfrastructureDamageItemDto
{
    public string AssetName { get; set; } = string.Empty;
    public string AssetType { get; set; } = "Road";
    public string DamageLevel { get; set; } = "Moderate"; // Minor | Moderate | Severe | Destroyed
    public decimal EstimatedCost { get; set; }
}

public class IncidentDamageReportDto
{
    public Guid IncidentId { get; set; }
    public string DisasterType { get; set; } = "Flood";
    public string Location { get; set; } = "Kalutara";
    public int HousesDamaged { get; set; }
    public int DisplacedFamilies { get; set; }
    public List<InfrastructureDamageItemDto> InfrastructureDamage { get; set; } = new();
}
