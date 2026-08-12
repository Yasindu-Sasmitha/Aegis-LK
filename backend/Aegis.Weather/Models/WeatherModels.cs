namespace Aegis.Weather.Models;

public class District
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Province { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
}

public class HistoricalWeather
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DistrictId { get; set; }
    public District? District { get; set; }
    public int Month { get; set; }
    public double AvgRainfallMm { get; set; }
    public double FloodThresholdMm { get; set; }
    public string Source { get; set; } = string.Empty;
}

public class WeatherStation
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DistrictId { get; set; }
    public District? District { get; set; }
    public string Name { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public bool IsActive { get; set; } = true;
}

public class WeatherObservation
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid StationId { get; set; }
    public WeatherStation? Station { get; set; }
    public DateTime ObservedAt { get; set; }
    public double RainfallMm { get; set; }
    public double TemperatureC { get; set; }
    public double WindSpeedKmh { get; set; }
    public string Source { get; set; } = "open-meteo";
}

public class Prediction
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DistrictId { get; set; }
    public District? District { get; set; }
    public Guid AgentRunId { get; set; }
    public double FloodProbabilityPct { get; set; }
    public double ConfidencePct { get; set; }
    public double ForecastRainfallMm { get; set; }
    public double HistoricalThresholdMm { get; set; }
    public string Status { get; set; } = "Completed";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public WeatherAlert? Alert { get; set; }
}

public class WeatherAlert
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DistrictId { get; set; }
    public District? District { get; set; }
    public Guid PredictionId { get; set; }
    public Prediction? Prediction { get; set; }
    public string Severity { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Status { get; set; } = "PendingReview";
    public Guid? ReviewedByUserId { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public DateTime? PublishedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class ForecastHistory
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PredictionId { get; set; }
    public Prediction? Prediction { get; set; }
    public bool? ActualFloodOccurred { get; set; }
    public double? ActualRainfallMm { get; set; }
    public Guid? ConfirmedByUserId { get; set; }
    public DateTime? ConfirmedAt { get; set; }
}

public class AgentExecutionLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DistrictId { get; set; }
    public string TriggerType { get; set; } = "Manual";
    public Guid? TriggeredByUserId { get; set; }
    public string StepsJson { get; set; } = "[]";
    public string OverallStatus { get; set; } = "Success";
    public string? ErrorMessage { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}