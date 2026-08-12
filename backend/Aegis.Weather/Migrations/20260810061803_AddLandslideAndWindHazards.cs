using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Aegis.Weather.Migrations
{
    /// <inheritdoc />
    public partial class AddLandslideAndWindHazards : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WeatherAlerts_DistrictId_Status",
                schema: "weather",
                table: "WeatherAlerts");

            migrationBuilder.DropIndex(
                name: "IX_Predictions_DistrictId_CreatedAt",
                schema: "weather",
                table: "Predictions");

            migrationBuilder.RenameColumn(
                name: "HistoricalThresholdMm",
                schema: "weather",
                table: "Predictions",
                newName: "RiskProbabilityPct");

            migrationBuilder.RenameColumn(
                name: "ForecastRainfallMm",
                schema: "weather",
                table: "Predictions",
                newName: "HistoricalThreshold");

            migrationBuilder.RenameColumn(
                name: "FloodProbabilityPct",
                schema: "weather",
                table: "Predictions",
                newName: "ForecastValue");

            migrationBuilder.RenameColumn(
                name: "ActualRainfallMm",
                schema: "weather",
                table: "ForecastHistory",
                newName: "ActualValue");

            migrationBuilder.RenameColumn(
                name: "ActualFloodOccurred",
                schema: "weather",
                table: "ForecastHistory",
                newName: "ActualDisasterOccurred");

            migrationBuilder.AddColumn<string>(
                name: "HazardType",
                schema: "weather",
                table: "WeatherAlerts",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "HazardType",
                schema: "weather",
                table: "Predictions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Unit",
                schema: "weather",
                table: "Predictions",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<double>(
                name: "HighWindThresholdKmh",
                schema: "weather",
                table: "HistoricalWeather",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "LandslideThresholdMm",
                schema: "weather",
                table: "HistoricalWeather",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsLandslideProne",
                schema: "weather",
                table: "Districts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_WeatherAlerts_DistrictId_HazardType_Status",
                schema: "weather",
                table: "WeatherAlerts",
                columns: new[] { "DistrictId", "HazardType", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Predictions_DistrictId_HazardType_CreatedAt",
                schema: "weather",
                table: "Predictions",
                columns: new[] { "DistrictId", "HazardType", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_WeatherAlerts_DistrictId_HazardType_Status",
                schema: "weather",
                table: "WeatherAlerts");

            migrationBuilder.DropIndex(
                name: "IX_Predictions_DistrictId_HazardType_CreatedAt",
                schema: "weather",
                table: "Predictions");

            migrationBuilder.DropColumn(
                name: "HazardType",
                schema: "weather",
                table: "WeatherAlerts");

            migrationBuilder.DropColumn(
                name: "HazardType",
                schema: "weather",
                table: "Predictions");

            migrationBuilder.DropColumn(
                name: "Unit",
                schema: "weather",
                table: "Predictions");

            migrationBuilder.DropColumn(
                name: "HighWindThresholdKmh",
                schema: "weather",
                table: "HistoricalWeather");

            migrationBuilder.DropColumn(
                name: "LandslideThresholdMm",
                schema: "weather",
                table: "HistoricalWeather");

            migrationBuilder.DropColumn(
                name: "IsLandslideProne",
                schema: "weather",
                table: "Districts");

            migrationBuilder.RenameColumn(
                name: "RiskProbabilityPct",
                schema: "weather",
                table: "Predictions",
                newName: "HistoricalThresholdMm");

            migrationBuilder.RenameColumn(
                name: "HistoricalThreshold",
                schema: "weather",
                table: "Predictions",
                newName: "ForecastRainfallMm");

            migrationBuilder.RenameColumn(
                name: "ForecastValue",
                schema: "weather",
                table: "Predictions",
                newName: "FloodProbabilityPct");

            migrationBuilder.RenameColumn(
                name: "ActualValue",
                schema: "weather",
                table: "ForecastHistory",
                newName: "ActualRainfallMm");

            migrationBuilder.RenameColumn(
                name: "ActualDisasterOccurred",
                schema: "weather",
                table: "ForecastHistory",
                newName: "ActualFloodOccurred");

            migrationBuilder.CreateIndex(
                name: "IX_WeatherAlerts_DistrictId_Status",
                schema: "weather",
                table: "WeatherAlerts",
                columns: new[] { "DistrictId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Predictions_DistrictId_CreatedAt",
                schema: "weather",
                table: "Predictions",
                columns: new[] { "DistrictId", "CreatedAt" });
        }
    }
}
