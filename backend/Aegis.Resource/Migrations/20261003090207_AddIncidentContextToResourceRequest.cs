using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Aegis.Resource.Migrations
{
    /// <inheritdoc />
    public partial class AddIncidentContextToResourceRequest : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "IncidentCreatedAt",
                schema: "resource",
                table: "ResourceRequests",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IncidentDisasterType",
                schema: "resource",
                table: "ResourceRequests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IncidentSeverity",
                schema: "resource",
                table: "ResourceRequests",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IncidentCreatedAt",
                schema: "resource",
                table: "ResourceRequests");

            migrationBuilder.DropColumn(
                name: "IncidentDisasterType",
                schema: "resource",
                table: "ResourceRequests");

            migrationBuilder.DropColumn(
                name: "IncidentSeverity",
                schema: "resource",
                table: "ResourceRequests");
        }
    }
}
