using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Aegis.Recovery.Migrations
{
    /// <inheritdoc />
    public partial class AddRecoverySubmittedByUserId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "SubmittedByUserId",
                schema: "recovery",
                table: "DamageReports",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SubmittedByUserId",
                schema: "recovery",
                table: "Compensations",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SubmittedByUserId",
                schema: "recovery",
                table: "AidRequests",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_DamageReports_SubmittedByUserId",
                schema: "recovery",
                table: "DamageReports",
                column: "SubmittedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Compensations_SubmittedByUserId",
                schema: "recovery",
                table: "Compensations",
                column: "SubmittedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AidRequests_SubmittedByUserId",
                schema: "recovery",
                table: "AidRequests",
                column: "SubmittedByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_DamageReports_SubmittedByUserId",
                schema: "recovery",
                table: "DamageReports");

            migrationBuilder.DropIndex(
                name: "IX_Compensations_SubmittedByUserId",
                schema: "recovery",
                table: "Compensations");

            migrationBuilder.DropIndex(
                name: "IX_AidRequests_SubmittedByUserId",
                schema: "recovery",
                table: "AidRequests");

            migrationBuilder.DropColumn(
                name: "SubmittedByUserId",
                schema: "recovery",
                table: "DamageReports");

            migrationBuilder.DropColumn(
                name: "SubmittedByUserId",
                schema: "recovery",
                table: "Compensations");

            migrationBuilder.DropColumn(
                name: "SubmittedByUserId",
                schema: "recovery",
                table: "AidRequests");
        }
    }
}
