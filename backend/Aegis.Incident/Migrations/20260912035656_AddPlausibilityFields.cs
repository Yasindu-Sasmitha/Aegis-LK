using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Aegis.Incident.Migrations
{
    /// <inheritdoc />
    public partial class AddPlausibilityFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PlausibilityReasoning",
                schema: "incident",
                table: "Incidents",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PlausibilityScore",
                schema: "incident",
                table: "Incidents",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PlausibilityReasoning",
                schema: "incident",
                table: "Incidents");

            migrationBuilder.DropColumn(
                name: "PlausibilityScore",
                schema: "incident",
                table: "Incidents");
        }
    }
}
