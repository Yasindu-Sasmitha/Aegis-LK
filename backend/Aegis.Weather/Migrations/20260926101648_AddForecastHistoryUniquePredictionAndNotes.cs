using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Aegis.Weather.Migrations
{
    /// <inheritdoc />
    public partial class AddForecastHistoryUniquePredictionAndNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ForecastHistory_PredictionId",
                schema: "weather",
                table: "ForecastHistory");

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                schema: "weather",
                table: "ForecastHistory",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ForecastHistory_PredictionId",
                schema: "weather",
                table: "ForecastHistory",
                column: "PredictionId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ForecastHistory_PredictionId",
                schema: "weather",
                table: "ForecastHistory");

            migrationBuilder.DropColumn(
                name: "Notes",
                schema: "weather",
                table: "ForecastHistory");

            migrationBuilder.CreateIndex(
                name: "IX_ForecastHistory_PredictionId",
                schema: "weather",
                table: "ForecastHistory",
                column: "PredictionId");
        }
    }
}
