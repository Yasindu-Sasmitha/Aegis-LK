using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Aegis.Recovery.Migrations
{
    /// <inheritdoc />
    public partial class InitialRecoverySchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "recovery");

            migrationBuilder.CreateTable(
                name: "Compensations",
                schema: "recovery",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ApplicantName = table.Column<string>(type: "text", nullable: false),
                    NIC = table.Column<string>(type: "text", nullable: false),
                    DamageCategory = table.Column<string>(type: "text", nullable: false),
                    ClaimAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    ApprovedAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    VerificationNotes = table.Column<string>(type: "text", nullable: false),
                    ApprovedBy = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Compensations", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "InfrastructureDamages",
                schema: "recovery",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    IncidentId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssetName = table.Column<string>(type: "text", nullable: false),
                    AssetType = table.Column<string>(type: "text", nullable: false),
                    DamageLevel = table.Column<string>(type: "text", nullable: false),
                    EstimatedRepairCost = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    PriorityScore = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InfrastructureDamages", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "NGOs",
                schema: "recovery",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    ContactEmail = table.Column<string>(type: "text", nullable: false),
                    ContactPhone = table.Column<string>(type: "text", nullable: false),
                    Sectors = table.Column<string>(type: "text", nullable: false),
                    OperatingDistricts = table.Column<string>(type: "text", nullable: false),
                    AssignedBudget = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NGOs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RecoveryPlans",
                schema: "recovery",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    IncidentId = table.Column<Guid>(type: "uuid", nullable: false),
                    PlanName = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    EstimatedTotalBudget = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    PlanSummaryJson = table.Column<string>(type: "text", nullable: false),
                    ReviewNotes = table.Column<string>(type: "text", nullable: true),
                    ReviewedBy = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ReviewedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecoveryPlans", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RecoveryReports",
                schema: "recovery",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    IncidentId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    TotalSheltered = table.Column<int>(type: "integer", nullable: false),
                    TotalAidRequestsFulfilled = table.Column<int>(type: "integer", nullable: false),
                    TotalCompensationDisbursed = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalBudgetSpent = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    ReportSummary = table.Column<string>(type: "text", nullable: false),
                    GeneratedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecoveryReports", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Shelters",
                schema: "recovery",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Location = table.Column<string>(type: "text", nullable: false),
                    District = table.Column<string>(type: "text", nullable: false),
                    Latitude = table.Column<double>(type: "double precision", nullable: false),
                    Longitude = table.Column<double>(type: "double precision", nullable: false),
                    Capacity = table.Column<int>(type: "integer", nullable: false),
                    CurrentOccupancy = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    ContactPerson = table.Column<string>(type: "text", nullable: false),
                    ContactPhone = table.Column<string>(type: "text", nullable: false),
                    Facilities = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Shelters", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RecoveryTasks",
                schema: "recovery",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RecoveryPlanId = table.Column<Guid>(type: "uuid", nullable: true),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    AssignedNGOId = table.Column<Guid>(type: "uuid", nullable: true),
                    Priority = table.Column<string>(type: "text", nullable: false),
                    EstimatedCost = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    TargetCompletionDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecoveryTasks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RecoveryTasks_NGOs_AssignedNGOId",
                        column: x => x.AssignedNGOId,
                        principalSchema: "recovery",
                        principalTable: "NGOs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_RecoveryTasks_RecoveryPlans_RecoveryPlanId",
                        column: x => x.RecoveryPlanId,
                        principalSchema: "recovery",
                        principalTable: "RecoveryPlans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AidRequests",
                schema: "recovery",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    VictimName = table.Column<string>(type: "text", nullable: false),
                    ContactPhone = table.Column<string>(type: "text", nullable: false),
                    District = table.Column<string>(type: "text", nullable: false),
                    AidType = table.Column<string>(type: "text", nullable: false),
                    FamilySize = table.Column<int>(type: "integer", nullable: false),
                    Urgency = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    ShelterId = table.Column<Guid>(type: "uuid", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AidRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AidRequests_Shelters_ShelterId",
                        column: x => x.ShelterId,
                        principalSchema: "recovery",
                        principalTable: "Shelters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Donations",
                schema: "recovery",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DonorName = table.Column<string>(type: "text", nullable: false),
                    DonorContact = table.Column<string>(type: "text", nullable: false),
                    DonationType = table.Column<string>(type: "text", nullable: false),
                    AmountOrQuantity = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    ItemDescription = table.Column<string>(type: "text", nullable: false),
                    TargetShelterId = table.Column<Guid>(type: "uuid", nullable: true),
                    AllocationStatus = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Donations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Donations_Shelters_TargetShelterId",
                        column: x => x.TargetShelterId,
                        principalSchema: "recovery",
                        principalTable: "Shelters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AidRequests_District",
                schema: "recovery",
                table: "AidRequests",
                column: "District");

            migrationBuilder.CreateIndex(
                name: "IX_AidRequests_ShelterId",
                schema: "recovery",
                table: "AidRequests",
                column: "ShelterId");

            migrationBuilder.CreateIndex(
                name: "IX_AidRequests_Status",
                schema: "recovery",
                table: "AidRequests",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Compensations_NIC",
                schema: "recovery",
                table: "Compensations",
                column: "NIC");

            migrationBuilder.CreateIndex(
                name: "IX_Compensations_Status",
                schema: "recovery",
                table: "Compensations",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Donations_TargetShelterId",
                schema: "recovery",
                table: "Donations",
                column: "TargetShelterId");

            migrationBuilder.CreateIndex(
                name: "IX_InfrastructureDamages_IncidentId",
                schema: "recovery",
                table: "InfrastructureDamages",
                column: "IncidentId");

            migrationBuilder.CreateIndex(
                name: "IX_NGOs_Name",
                schema: "recovery",
                table: "NGOs",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_RecoveryPlans_IncidentId",
                schema: "recovery",
                table: "RecoveryPlans",
                column: "IncidentId");

            migrationBuilder.CreateIndex(
                name: "IX_RecoveryPlans_Status",
                schema: "recovery",
                table: "RecoveryPlans",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_RecoveryReports_IncidentId",
                schema: "recovery",
                table: "RecoveryReports",
                column: "IncidentId");

            migrationBuilder.CreateIndex(
                name: "IX_RecoveryTasks_AssignedNGOId",
                schema: "recovery",
                table: "RecoveryTasks",
                column: "AssignedNGOId");

            migrationBuilder.CreateIndex(
                name: "IX_RecoveryTasks_RecoveryPlanId",
                schema: "recovery",
                table: "RecoveryTasks",
                column: "RecoveryPlanId");

            migrationBuilder.CreateIndex(
                name: "IX_Shelters_District",
                schema: "recovery",
                table: "Shelters",
                column: "District");

            migrationBuilder.CreateIndex(
                name: "IX_Shelters_Status",
                schema: "recovery",
                table: "Shelters",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AidRequests",
                schema: "recovery");

            migrationBuilder.DropTable(
                name: "Compensations",
                schema: "recovery");

            migrationBuilder.DropTable(
                name: "Donations",
                schema: "recovery");

            migrationBuilder.DropTable(
                name: "InfrastructureDamages",
                schema: "recovery");

            migrationBuilder.DropTable(
                name: "RecoveryReports",
                schema: "recovery");

            migrationBuilder.DropTable(
                name: "RecoveryTasks",
                schema: "recovery");

            migrationBuilder.DropTable(
                name: "Shelters",
                schema: "recovery");

            migrationBuilder.DropTable(
                name: "NGOs",
                schema: "recovery");

            migrationBuilder.DropTable(
                name: "RecoveryPlans",
                schema: "recovery");
        }
    }
}
