using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Aegis.Incident.Migrations
{
    /// <inheritdoc />
    public partial class AddDedupConfidenceAndReasoning : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DedupConfidence",
                schema: "incident",
                table: "Incidents",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DedupReasoning",
                schema: "incident",
                table: "Incidents",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DedupConfidence",
                schema: "incident",
                table: "Incidents");

            migrationBuilder.DropColumn(
                name: "DedupReasoning",
                schema: "incident",
                table: "Incidents");
        }
    }
}
