using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Aegis.Incident.Migrations
{
    /// <inheritdoc />
    public partial class InitialIncidentSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "incident");

            migrationBuilder.CreateTable(
                name: "Incidents",
                schema: "incident",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DisasterType = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    SeverityReported = table.Column<string>(type: "text", nullable: false),
                    SeverityAssessed = table.Column<string>(type: "text", nullable: true),
                    Latitude = table.Column<double>(type: "double precision", nullable: false),
                    Longitude = table.Column<double>(type: "double precision", nullable: false),
                    PhotoUrl = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<string>(type: "text", nullable: false),
                    ReportedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Incidents", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RescueTeams",
                schema: "incident",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    CurrentLatitude = table.Column<double>(type: "double precision", nullable: true),
                    CurrentLongitude = table.Column<double>(type: "double precision", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RescueTeams", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Volunteers",
                schema: "incident",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Skills = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Volunteers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DamageReports",
                schema: "incident",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    IncidentId = table.Column<Guid>(type: "uuid", nullable: false),
                    HousesDamaged = table.Column<int>(type: "integer", nullable: false),
                    DisplacedFamilies = table.Column<int>(type: "integer", nullable: false),
                    InfrastructureDamageNotes = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DamageReports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DamageReports_Incidents_IncidentId",
                        column: x => x.IncidentId,
                        principalSchema: "incident",
                        principalTable: "Incidents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MissionLogs",
                schema: "incident",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    IncidentId = table.Column<Guid>(type: "uuid", nullable: false),
                    Note = table.Column<string>(type: "text", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MissionLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MissionLogs_Incidents_IncidentId",
                        column: x => x.IncidentId,
                        principalSchema: "incident",
                        principalTable: "Incidents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RescueMissions",
                schema: "incident",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    IncidentId = table.Column<Guid>(type: "uuid", nullable: false),
                    TeamsRequired = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    ApprovedByOfficerId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RescueMissions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RescueMissions_Incidents_IncidentId",
                        column: x => x.IncidentId,
                        principalSchema: "incident",
                        principalTable: "Incidents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Victims",
                schema: "incident",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    IncidentId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    Notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Victims", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Victims_Incidents_IncidentId",
                        column: x => x.IncidentId,
                        principalSchema: "incident",
                        principalTable: "Incidents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DamageReports_IncidentId",
                schema: "incident",
                table: "DamageReports",
                column: "IncidentId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MissionLogs_IncidentId",
                schema: "incident",
                table: "MissionLogs",
                column: "IncidentId");

            migrationBuilder.CreateIndex(
                name: "IX_RescueMissions_IncidentId",
                schema: "incident",
                table: "RescueMissions",
                column: "IncidentId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Victims_IncidentId",
                schema: "incident",
                table: "Victims",
                column: "IncidentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DamageReports",
                schema: "incident");

            migrationBuilder.DropTable(
                name: "MissionLogs",
                schema: "incident");

            migrationBuilder.DropTable(
                name: "RescueMissions",
                schema: "incident");

            migrationBuilder.DropTable(
                name: "RescueTeams",
                schema: "incident");

            migrationBuilder.DropTable(
                name: "Victims",
                schema: "incident");

            migrationBuilder.DropTable(
                name: "Volunteers",
                schema: "incident");

            migrationBuilder.DropTable(
                name: "Incidents",
                schema: "incident");
        }
    }
}
