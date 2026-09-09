using System;

namespace Aegis.Recovery.Models;

public class Compensation
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string ApplicantName { get; set; } = string.Empty;
    public string NIC { get; set; } = string.Empty;
    public string DamageCategory { get; set; } = "Total House Loss"; // Total House Loss | Partial Loss | Livelihood Loss
    public decimal ClaimAmount { get; set; }
    public decimal? ApprovedAmount { get; set; }
    public string Status { get; set; } = "Submitted"; // Submitted | UnderReview | Approved | Disbursed | Rejected
    public string VerificationNotes { get; set; } = string.Empty;
    public string? ApprovedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ApprovedAt { get; set; }
}
