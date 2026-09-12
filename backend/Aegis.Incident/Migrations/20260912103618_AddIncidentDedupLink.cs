using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Aegis.Incident.Migrations
{
    /// <inheritdoc />
    public partial class AddIncidentDedupLink : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "LinkedIncidentId",
                schema: "incident",
                table: "Incidents",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Incidents_LinkedIncidentId",
                schema: "incident",
                table: "Incidents",
                column: "LinkedIncidentId");

            migrationBuilder.AddForeignKey(
                name: "FK_Incidents_Incidents_LinkedIncidentId",
                schema: "incident",
                table: "Incidents",
                column: "LinkedIncidentId",
                principalSchema: "incident",
                principalTable: "Incidents",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Incidents_Incidents_LinkedIncidentId",
                schema: "incident",
                table: "Incidents");

            migrationBuilder.DropIndex(
                name: "IX_Incidents_LinkedIncidentId",
                schema: "incident",
                table: "Incidents");

            migrationBuilder.DropColumn(
                name: "LinkedIncidentId",
                schema: "incident",
                table: "Incidents");
        }
    }
}
