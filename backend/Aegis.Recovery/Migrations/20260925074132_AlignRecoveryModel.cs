using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Aegis.Recovery.Migrations
{
    /// <inheritdoc />
    public partial class AlignRecoveryModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DamageReports",
                schema: "recovery",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    IncidentId = table.Column<Guid>(type: "uuid", nullable: true),
                    District = table.Column<string>(type: "text", nullable: false),
                    Location = table.Column<string>(type: "text", nullable: false),
                    DisasterType = table.Column<string>(type: "text", nullable: false),
                    HousesDamaged = table.Column<int>(type: "integer", nullable: false),
                    DisplacedFamilies = table.Column<int>(type: "integer", nullable: false),
                    ReporterName = table.Column<string>(type: "text", nullable: false),
                    ReporterContact = table.Column<string>(type: "text", nullable: false),
                    AdditionalNotes = table.Column<string>(type: "text", nullable: false),
                    InfrastructureJson = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    RecoveryPlanId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ProcessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DamageReports", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DamageReports_District",
                schema: "recovery",
                table: "DamageReports",
                column: "District");

            migrationBuilder.CreateIndex(
                name: "IX_DamageReports_Status",
                schema: "recovery",
                table: "DamageReports",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DamageReports",
                schema: "recovery");
        }
    }
}
