namespace Aegis.Resource.Services;

public class ResourceDispatchLocation
{
    public double Lat { get; set; }
    public double Lng { get; set; }
}

public class ResourceWarehouseSummary
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
}

public class ResourceInventorySummary
{
    public string WarehouseId { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public int QuantityAvailable { get; set; }
}

public class ResourceDispatchRequest
{
    public string MissionId { get; set; } = string.Empty;
    public int TeamsRequired { get; set; }
    public string District { get; set; } = string.Empty;
    public ResourceDispatchLocation Location { get; set; } = new();
    public List<ResourceWarehouseSummary> Warehouses { get; set; } = new();
    public List<ResourceInventorySummary> Inventory { get; set; } = new();
}

public class DispatchItemSummary
{
    public string ItemName { get; set; } = string.Empty;
    public int Quantity { get; set; }
}

public class ResourceDispatchPlan
{
    public string MissionId { get; set; } = string.Empty;
    public string WarehouseId { get; set; } = string.Empty;
    public string WarehouseName { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public int VehicleCount { get; set; }
    public List<DispatchItemSummary> Items { get; set; } = new();
    public string RouteSummary { get; set; } = string.Empty;
    public string ApprovalStatus { get; set; } = string.Empty;
}

public class ResourceDispatchResponse
{
    public ResourceDispatchPlan DispatchPlan { get; set; } = new();
    public int EstimatedArrival { get; set; }
    public List<Dictionary<string, object>> Steps { get; set; } = new();
    public string OverallStatus { get; set; } = "Success";
    public string? Error { get; set; }
}
