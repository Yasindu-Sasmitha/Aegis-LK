using System;

namespace Aegis.Recovery.Models;

public class RecoveryReport
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid IncidentId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int TotalSheltered { get; set; }
    public int TotalAidRequestsFulfilled { get; set; }
    public decimal TotalCompensationDisbursed { get; set; }
    public decimal TotalBudgetSpent { get; set; }
    public string ReportSummary { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}
