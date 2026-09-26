using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Aegis.Incident.Migrations
{
    /// <inheritdoc />
    public partial class AddRejectHoldSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RejectionReason",
                schema: "incident",
                table: "Incidents",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RejectionReason",
                schema: "incident",
                table: "Incidents");
        }
    }
}
