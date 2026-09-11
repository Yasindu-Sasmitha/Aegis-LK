using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Aegis.Recovery.Migrations
{
    /// <inheritdoc />
    public partial class SyncRecoveryModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "RevisionCount",
                schema: "recovery",
                table: "RecoveryPlans",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                schema: "recovery",
                table: "RecoveryPlans",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "RecoveryWorkflowLogs",
                schema: "recovery",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RecoveryPlanId = table.Column<Guid>(type: "uuid", nullable: false),
                    ObjectiveJson = table.Column<string>(type: "text", nullable: false),
                    AgentStepsJson = table.Column<string>(type: "text", nullable: false),
                    ToolCallsJson = table.Column<string>(type: "text", nullable: false),
                    ValidationResultsJson = table.Column<string>(type: "text", nullable: false),
                    Errors = table.Column<string>(type: "text", nullable: false),
                    RetryCount = table.Column<int>(type: "integer", nullable: false),
                    ExecutionStatus = table.Column<string>(type: "text", nullable: false),
                    TotalDurationMs = table.Column<int>(type: "integer", nullable: false),
                    ApprovedBy = table.Column<string>(type: "text", nullable: true),
                    ApprovalDecision = table.Column<string>(type: "text", nullable: true),
                    ApprovalTimestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ApprovalNotes = table.Column<string>(type: "text", nullable: true),
                    ExecutionSummary = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecoveryWorkflowLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RecoveryWorkflowLogs_RecoveryPlans_RecoveryPlanId",
                        column: x => x.RecoveryPlanId,
                        principalSchema: "recovery",
                        principalTable: "RecoveryPlans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RecoveryWorkflowLogs_ExecutionStatus",
                schema: "recovery",
                table: "RecoveryWorkflowLogs",
                column: "ExecutionStatus");

            migrationBuilder.CreateIndex(
                name: "IX_RecoveryWorkflowLogs_RecoveryPlanId",
                schema: "recovery",
                table: "RecoveryWorkflowLogs",
                column: "RecoveryPlanId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RecoveryWorkflowLogs",
                schema: "recovery");

            migrationBuilder.DropColumn(
                name: "RevisionCount",
                schema: "recovery",
                table: "RecoveryPlans");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                schema: "recovery",
                table: "RecoveryPlans");
        }
    }
}
