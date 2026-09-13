using System;
using System.Collections.Generic;

namespace Aegis.Recovery.Dtos;

// Shelter DTOs
public record CreateShelterRequest(
    string Name,
    string Location,
    string District,
    double Latitude,
    double Longitude,
    int Capacity,
    string ContactPerson,
    string ContactPhone,
    string Facilities
);

public record UpdateShelterOccupancyRequest(int CurrentOccupancy, string? Status);

public record ShelterDto(
    Guid Id,
    string Name,
    string Location,
    string District,
    double Latitude,
    double Longitude,
    int Capacity,
    int CurrentOccupancy,
    string Status,
    string ContactPerson,
    string ContactPhone,
    string Facilities,
    DateTime CreatedAt
);

// Aid Request DTOs
public record CreateAidRequest(
    string VictimName,
    string ContactPhone,
    string District,
    string AidType,
    int FamilySize,
    string Urgency,
    Guid? ShelterId,
    string Notes
);

public record UpdateAidRequestStatus(string Status, Guid? ShelterId, string? Notes);

public record AidRequestDto(
    Guid Id,
    string VictimName,
    string ContactPhone,
    string District,
    string AidType,
    int FamilySize,
    string Urgency,
    string Status,
    Guid? ShelterId,
    string? ShelterName,
    string Notes,
    DateTime CreatedAt
);

// Donation DTOs
public record CreateDonationRequest(
    string DonorName,
    string DonorContact,
    string DonationType,
    decimal AmountOrQuantity,
    string ItemDescription,
    Guid? TargetShelterId
);

public record DonationDto(
    Guid Id,
    string DonorName,
    string DonationType,
    decimal AmountOrQuantity,
    string ItemDescription,
    Guid? TargetShelterId,
    string AllocationStatus,
    DateTime CreatedAt
);

// Compensation DTOs
public record CreateCompensationRequest(
    string ApplicantName,
    string NIC,
    string DamageCategory,
    decimal ClaimAmount,
    string VerificationNotes
);

public record ApproveCompensationRequest(
    decimal ApprovedAmount,
    string Status,
    string VerificationNotes,
    string ApprovedBy
);

public record CompensationDto(
    Guid Id,
    string ApplicantName,
    string DamageCategory,
    decimal ClaimAmount,
    decimal? ApprovedAmount,
    string Status,
    string VerificationNotes,
    string? ApprovedBy,
    DateTime CreatedAt,
    DateTime? ApprovedAt
);

// NGO DTOs
public record CreateNGORequest(
    string Name,
    string ContactEmail,
    string ContactPhone,
    string Sectors,
    string OperatingDistricts,
    decimal AssignedBudget
);

public record NGODto(
    Guid Id,
    string Name,
    string ContactEmail,
    string ContactPhone,
    string Sectors,
    string OperatingDistricts,
    decimal AssignedBudget,
    string Status
);

// Plan & Approval DTOs
public record GeneratePlanRequest(Guid IncidentId);

public record ApprovePlanRequest(
    string Action, // "Approve" | "Reject" | "Revise"
    string ReviewerNotes,
    string ReviewedBy
);

public record TaskDto(
    Guid Id,
    string Title,
    string Description,
    Guid? AssignedNGOId,
    string? AssignedNGOName,
    string Priority,
    decimal EstimatedCost,
    string Status,
    DateTime? TargetCompletionDate
);

public record RecoveryPlanDto(
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
    List<TaskDto> Tasks
);

// Report DTOs
public record GenerateReportRequest(Guid IncidentId, string Title);

public record RecoveryReportDto(
    Guid Id,
    Guid IncidentId,
    string Title,
    int TotalSheltered,
    int TotalAidRequestsFulfilled,
    decimal TotalCompensationDisbursed,
    decimal TotalBudgetSpent,
    string ReportSummary,
    DateTime GeneratedAt
);
