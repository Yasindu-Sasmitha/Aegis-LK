using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Aegis.Recovery.Models;
using Microsoft.EntityFrameworkCore;

namespace Aegis.Recovery.Data;

public static class RecoveryDataSeeder
{
    public static async Task EnsureSchemaAsync(RecoveryDbContext db)
    {
        if (!db.Database.IsRelational())
        {
            await db.Database.EnsureCreatedAsync();
            return;
        }

        var statements = new[]
        {
            "CREATE SCHEMA IF NOT EXISTS recovery;",

            """
            CREATE TABLE IF NOT EXISTS recovery."RecoveryPlans" (
                "Id" uuid NOT NULL PRIMARY KEY,
                "IncidentId" uuid NOT NULL,
                "PlanName" text NOT NULL DEFAULT '',
                "Status" text NOT NULL DEFAULT 'Draft',
                "EstimatedTotalBudget" numeric(18,2) NOT NULL DEFAULT 0,
                "PlanSummaryJson" text NOT NULL DEFAULT '{}',
                "ReviewNotes" text NULL,
                "ReviewedBy" text NULL,
                "RevisionCount" integer NOT NULL DEFAULT 0,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                "ReviewedAt" timestamp with time zone NULL,
                "UpdatedAt" timestamp with time zone NULL
            );
            """,
            "ALTER TABLE recovery.\"RecoveryPlans\" ADD COLUMN IF NOT EXISTS \"RevisionCount\" integer NOT NULL DEFAULT 0;",
            "ALTER TABLE recovery.\"RecoveryPlans\" ADD COLUMN IF NOT EXISTS \"ReviewNotes\" text NULL;",
            "ALTER TABLE recovery.\"RecoveryPlans\" ADD COLUMN IF NOT EXISTS \"ReviewedBy\" text NULL;",
            "ALTER TABLE recovery.\"RecoveryPlans\" ADD COLUMN IF NOT EXISTS \"ReviewedAt\" timestamp with time zone NULL;",
            "ALTER TABLE recovery.\"RecoveryPlans\" ADD COLUMN IF NOT EXISTS \"UpdatedAt\" timestamp with time zone NULL;",

            """
            CREATE TABLE IF NOT EXISTS recovery."Shelters" (
                "Id" uuid NOT NULL PRIMARY KEY,
                "Name" text NOT NULL DEFAULT '',
                "Location" text NOT NULL DEFAULT '',
                "District" text NOT NULL DEFAULT '',
                "Latitude" double precision NOT NULL DEFAULT 0,
                "Longitude" double precision NOT NULL DEFAULT 0,
                "Capacity" integer NOT NULL DEFAULT 0,
                "CurrentOccupancy" integer NOT NULL DEFAULT 0,
                "Status" text NOT NULL DEFAULT 'Active',
                "ContactPerson" text NOT NULL DEFAULT '',
                "ContactPhone" text NOT NULL DEFAULT '',
                "Facilities" text NOT NULL DEFAULT '',
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                "UpdatedAt" timestamp with time zone NULL
            );
            """,
            "ALTER TABLE recovery.\"Shelters\" ADD COLUMN IF NOT EXISTS \"Facilities\" text NOT NULL DEFAULT '';",
            "ALTER TABLE recovery.\"Shelters\" ADD COLUMN IF NOT EXISTS \"UpdatedAt\" timestamp with time zone NULL;",

            """
            CREATE TABLE IF NOT EXISTS recovery."AidRequests" (
                "Id" uuid NOT NULL PRIMARY KEY,
                "VictimName" text NOT NULL DEFAULT '',
                "ContactPhone" text NOT NULL DEFAULT '',
                "District" text NOT NULL DEFAULT '',
                "AidType" text NOT NULL DEFAULT 'Shelter',
                "FamilySize" integer NOT NULL DEFAULT 1,
                "Urgency" text NOT NULL DEFAULT 'Medium',
                "Status" text NOT NULL DEFAULT 'Pending',
                "ShelterId" uuid NULL,
                "Notes" text NOT NULL DEFAULT '',
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                "UpdatedAt" timestamp with time zone NULL
            );
            """,
            "ALTER TABLE recovery.\"AidRequests\" ADD COLUMN IF NOT EXISTS \"Notes\" text NOT NULL DEFAULT '';",
            "ALTER TABLE recovery.\"AidRequests\" ADD COLUMN IF NOT EXISTS \"UpdatedAt\" timestamp with time zone NULL;",

            """
            CREATE TABLE IF NOT EXISTS recovery."Donations" (
                "Id" uuid NOT NULL PRIMARY KEY,
                "DonorName" text NOT NULL DEFAULT '',
                "DonorContact" text NOT NULL DEFAULT '',
                "DonationType" text NOT NULL DEFAULT 'Funds',
                "AmountOrQuantity" numeric(18,2) NOT NULL DEFAULT 0,
                "ItemDescription" text NOT NULL DEFAULT '',
                "TargetShelterId" uuid NULL,
                "AllocationStatus" text NOT NULL DEFAULT 'Received',
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW()
            );
            """,

            """
            CREATE TABLE IF NOT EXISTS recovery."Compensations" (
                "Id" uuid NOT NULL PRIMARY KEY,
                "ApplicantName" text NOT NULL DEFAULT '',
                "NIC" text NOT NULL DEFAULT '',
                "DamageCategory" text NOT NULL DEFAULT '',
                "ClaimAmount" numeric(18,2) NOT NULL DEFAULT 0,
                "ApprovedAmount" numeric(18,2) NULL,
                "Status" text NOT NULL DEFAULT 'Submitted',
                "VerificationNotes" text NOT NULL DEFAULT '',
                "ApprovedBy" text NULL,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                "ApprovedAt" timestamp with time zone NULL
            );
            """,

            """
            CREATE TABLE IF NOT EXISTS recovery."NGOs" (
                "Id" uuid NOT NULL PRIMARY KEY,
                "Name" text NOT NULL,
                "ContactEmail" text NOT NULL DEFAULT '',
                "ContactPhone" text NOT NULL DEFAULT '',
                "Sectors" text NOT NULL DEFAULT '',
                "OperatingDistricts" text NOT NULL DEFAULT '',
                "AssignedBudget" numeric(18,2) NOT NULL DEFAULT 0,
                "Status" text NOT NULL DEFAULT 'Active',
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                "UpdatedAt" timestamp with time zone NULL
            );
            """,

            """
            CREATE TABLE IF NOT EXISTS recovery."InfrastructureDamages" (
                "Id" uuid NOT NULL PRIMARY KEY,
                "IncidentId" uuid NOT NULL,
                "AssetName" text NOT NULL,
                "AssetType" text NOT NULL DEFAULT '',
                "DamageLevel" text NOT NULL DEFAULT '',
                "EstimatedRepairCost" numeric(18,2) NOT NULL DEFAULT 0,
                "PriorityScore" integer NOT NULL DEFAULT 0,
                "Status" text NOT NULL DEFAULT 'Planning',
                "Notes" text NULL,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                "UpdatedAt" timestamp with time zone NULL
            );
            """,

            """
            CREATE TABLE IF NOT EXISTS recovery."RecoveryTasks" (
                "Id" uuid NOT NULL PRIMARY KEY,
                "RecoveryPlanId" uuid NOT NULL,
                "Title" text NOT NULL DEFAULT '',
                "Description" text NOT NULL DEFAULT '',
                "AssignedNGOId" uuid NULL,
                "Priority" text NOT NULL DEFAULT 'Medium',
                "EstimatedCost" numeric(18,2) NOT NULL DEFAULT 0,
                "Status" text NOT NULL DEFAULT 'Pending',
                "TargetCompletionDate" timestamp with time zone NULL,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                "UpdatedAt" timestamp with time zone NULL
            );
            """,
            "ALTER TABLE recovery.\"RecoveryTasks\" ADD COLUMN IF NOT EXISTS \"UpdatedAt\" timestamp with time zone NULL;",

            """
            CREATE TABLE IF NOT EXISTS recovery."RecoveryWorkflowLogs" (
                "Id" uuid NOT NULL PRIMARY KEY,
                "RecoveryPlanId" uuid NOT NULL,
                "ObjectiveJson" text NOT NULL DEFAULT '',
                "AgentStepsJson" text NOT NULL DEFAULT '',
                "ToolCallsJson" text NOT NULL DEFAULT '',
                "ValidationResultsJson" text NOT NULL DEFAULT '',
                "Errors" text NOT NULL DEFAULT '',
                "RetryCount" integer NOT NULL DEFAULT 0,
                "ExecutionStatus" text NOT NULL DEFAULT '',
                "TotalDurationMs" integer NOT NULL DEFAULT 0,
                "ExecutionSummary" text NOT NULL DEFAULT '',
                "ApprovedBy" text NULL,
                "ApprovalDecision" text NULL,
                "ApprovalTimestamp" timestamp with time zone NULL,
                "ApprovalNotes" text NULL,
                "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW()
            );
            """,

            """
            CREATE TABLE IF NOT EXISTS recovery."RecoveryReports" (
                "Id" uuid NOT NULL PRIMARY KEY,
                "IncidentId" uuid NOT NULL,
                "Title" text NOT NULL DEFAULT '',
                "TotalSheltered" integer NOT NULL DEFAULT 0,
                "TotalAidRequestsFulfilled" integer NOT NULL DEFAULT 0,
                "TotalCompensationDisbursed" numeric(18,2) NOT NULL DEFAULT 0,
                "TotalBudgetSpent" numeric(18,2) NOT NULL DEFAULT 0,
                "ReportSummary" text NOT NULL DEFAULT '',
                "GeneratedAt" timestamp with time zone NOT NULL DEFAULT NOW()
            );
            """
        };

        foreach (var stmt in statements)
        {
            try
            {
                await db.Database.ExecuteSqlRawAsync(stmt);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Recovery Schema Warning] {ex.Message}");
            }
        }
    }

    public static async Task SeedAsync(RecoveryDbContext db)
    {
        await EnsureSchemaAsync(db);

        if (!await db.Shelters.AnyAsync())
        {
            var shelters = new List<Shelter>
            {
                new Shelter
                {
                    Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
                    Name = "Kalutara Royal College Emergency Shelter",
                    Location = "Galle Road, Kalutara",
                    District = "Kalutara",
                    Latitude = 6.5854,
                    Longitude = 79.9607,
                    Capacity = 200,
                    CurrentOccupancy = 45,
                    Status = "Active",
                    ContactPerson = "Sunil Perera",
                    ContactPhone = "+94771234567",
                    Facilities = "Water, Medical, Food Supply, Sanitation"
                },
                new Shelter
                {
                    Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
                    Name = "Ratnapura Town Hall Community Relief Center",
                    Location = "Main Street, Ratnapura",
                    District = "Ratnapura",
                    Latitude = 6.6828,
                    Longitude = 80.3992,
                    Capacity = 150,
                    CurrentOccupancy = 120,
                    Status = "Active",
                    ContactPerson = "Kamlika Jayasinghe",
                    ContactPhone = "+94719876543",
                    Facilities = "Water, Generator, Blankets, Kitchen"
                },
                new Shelter
                {
                    Id = Guid.Parse("33333333-3333-3333-3333-333333333333"),
                    Name = "Matara Mahinda College Relief Shelter",
                    Location = "Beach Road, Matara",
                    District = "Matara",
                    Latitude = 5.9496,
                    Longitude = 80.5469,
                    Capacity = 300,
                    CurrentOccupancy = 300,
                    Status = "Full",
                    ContactPerson = "Nimal Siriwardena",
                    ContactPhone = "+94705554433",
                    Facilities = "Full Support Center, Medical Aid"
                }
            };
            db.Shelters.AddRange(shelters);
        }

        if (!await db.NGOs.AnyAsync())
        {
            var ngos = new List<NGO>
            {
                new NGO
                {
                    Id = Guid.Parse("44444444-4444-4444-4444-444444444444"),
                    Name = "Red Cross Sri Lanka",
                    ContactEmail = "info@redcross.lk",
                    ContactPhone = "+94112691095",
                    Sectors = "Medical, Emergency Relief, Water & Sanitation",
                    OperatingDistricts = "Kalutara, Ratnapura, Matara, Colombo",
                    AssignedBudget = 5000000.00m,
                    Status = "Active"
                },
                new NGO
                {
                    Id = Guid.Parse("55555555-5555-5555-5555-555555555555"),
                    Name = "Habitat for Humanity Sri Lanka",
                    ContactEmail = "contact@habitat.lk",
                    ContactPhone = "+94112508840",
                    Sectors = "Housing Reconstruction, Infrastructure, Shelter Repair",
                    OperatingDistricts = "Kalutara, Ratnapura, Galle",
                    AssignedBudget = 8500000.00m,
                    Status = "Active"
                },
                new NGO
                {
                    Id = Guid.Parse("66666666-6666-6666-6666-666666666666"),
                    Name = "Sarvodaya Shramadana Movement",
                    ContactEmail = "help@sarvodaya.org",
                    ContactPhone = "+94112655255",
                    Sectors = "Community Support, Food Distribution, Livelihood Recovery",
                    OperatingDistricts = "All Districts",
                    AssignedBudget = 3000000.00m,
                    Status = "Active"
                }
            };
            db.NGOs.AddRange(ngos);
        }

        await db.SaveChangesAsync();
    }
}
