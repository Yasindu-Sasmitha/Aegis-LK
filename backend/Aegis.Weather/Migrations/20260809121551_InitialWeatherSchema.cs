using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Aegis.Weather.Migrations
{
    /// <inheritdoc />
    public partial class InitialWeatherSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "weather");

            migrationBuilder.CreateTable(
                name: "AgentExecutionLogs",
                schema: "weather",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DistrictId = table.Column<Guid>(type: "uuid", nullable: false),
                    TriggerType = table.Column<string>(type: "text", nullable: false),
                    TriggeredByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    StepsJson = table.Column<string>(type: "text", nullable: false),
                    OverallStatus = table.Column<string>(type: "text", nullable: false),
                    ErrorMessage = table.Column<string>(type: "text", nullable: true),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AgentExecutionLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Districts",
                schema: "weather",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Province = table.Column<string>(type: "text", nullable: false),
                    Latitude = table.Column<double>(type: "double precision", nullable: false),
                    Longitude = table.Column<double>(type: "double precision", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Districts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "HistoricalWeather",
                schema: "weather",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DistrictId = table.Column<Guid>(type: "uuid", nullable: false),
                    Month = table.Column<int>(type: "integer", nullable: false),
                    AvgRainfallMm = table.Column<double>(type: "double precision", nullable: false),
                    FloodThresholdMm = table.Column<double>(type: "double precision", nullable: false),
                    Source = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HistoricalWeather", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HistoricalWeather_Districts_DistrictId",
                        column: x => x.DistrictId,
                        principalSchema: "weather",
                        principalTable: "Districts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Predictions",
                schema: "weather",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DistrictId = table.Column<Guid>(type: "uuid", nullable: false),
                    AgentRunId = table.Column<Guid>(type: "uuid", nullable: false),
                    FloodProbabilityPct = table.Column<double>(type: "double precision", nullable: false),
                    ConfidencePct = table.Column<double>(type: "double precision", nullable: false),
                    ForecastRainfallMm = table.Column<double>(type: "double precision", nullable: false),
                    HistoricalThresholdMm = table.Column<double>(type: "double precision", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Predictions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Predictions_Districts_DistrictId",
                        column: x => x.DistrictId,
                        principalSchema: "weather",
                        principalTable: "Districts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WeatherStations",
                schema: "weather",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DistrictId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Latitude = table.Column<double>(type: "double precision", nullable: false),
                    Longitude = table.Column<double>(type: "double precision", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WeatherStations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WeatherStations_Districts_DistrictId",
                        column: x => x.DistrictId,
                        principalSchema: "weather",
                        principalTable: "Districts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ForecastHistory",
                schema: "weather",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PredictionId = table.Column<Guid>(type: "uuid", nullable: false),
                    ActualFloodOccurred = table.Column<bool>(type: "boolean", nullable: true),
                    ActualRainfallMm = table.Column<double>(type: "double precision", nullable: true),
                    ConfirmedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ConfirmedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ForecastHistory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ForecastHistory_Predictions_PredictionId",
                        column: x => x.PredictionId,
                        principalSchema: "weather",
                        principalTable: "Predictions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WeatherAlerts",
                schema: "weather",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DistrictId = table.Column<Guid>(type: "uuid", nullable: false),
                    PredictionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Severity = table.Column<string>(type: "text", nullable: false),
                    Message = table.Column<string>(type: "text", nullable: false),
                    Status = table.Column<string>(type: "text", nullable: false),
                    ReviewedByUserId = table.Column<Guid>(type: "uuid", nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PublishedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WeatherAlerts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WeatherAlerts_Districts_DistrictId",
                        column: x => x.DistrictId,
                        principalSchema: "weather",
                        principalTable: "Districts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_WeatherAlerts_Predictions_PredictionId",
                        column: x => x.PredictionId,
                        principalSchema: "weather",
                        principalTable: "Predictions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WeatherObservations",
                schema: "weather",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StationId = table.Column<Guid>(type: "uuid", nullable: false),
                    ObservedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RainfallMm = table.Column<double>(type: "double precision", nullable: false),
                    TemperatureC = table.Column<double>(type: "double precision", nullable: false),
                    WindSpeedKmh = table.Column<double>(type: "double precision", nullable: false),
                    Source = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WeatherObservations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WeatherObservations_WeatherStations_StationId",
                        column: x => x.StationId,
                        principalSchema: "weather",
                        principalTable: "WeatherStations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Districts_Name",
                schema: "weather",
                table: "Districts",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ForecastHistory_PredictionId",
                schema: "weather",
                table: "ForecastHistory",
                column: "PredictionId");

            migrationBuilder.CreateIndex(
                name: "IX_HistoricalWeather_DistrictId_Month",
                schema: "weather",
                table: "HistoricalWeather",
                columns: new[] { "DistrictId", "Month" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Predictions_DistrictId_CreatedAt",
                schema: "weather",
                table: "Predictions",
                columns: new[] { "DistrictId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_WeatherAlerts_DistrictId_Status",
                schema: "weather",
                table: "WeatherAlerts",
                columns: new[] { "DistrictId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_WeatherAlerts_PredictionId",
                schema: "weather",
                table: "WeatherAlerts",
                column: "PredictionId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WeatherObservations_StationId",
                schema: "weather",
                table: "WeatherObservations",
                column: "StationId");

            migrationBuilder.CreateIndex(
                name: "IX_WeatherStations_DistrictId",
                schema: "weather",
                table: "WeatherStations",
                column: "DistrictId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AgentExecutionLogs",
                schema: "weather");

            migrationBuilder.DropTable(
                name: "ForecastHistory",
                schema: "weather");

            migrationBuilder.DropTable(
                name: "HistoricalWeather",
                schema: "weather");

            migrationBuilder.DropTable(
                name: "WeatherAlerts",
                schema: "weather");

            migrationBuilder.DropTable(
                name: "WeatherObservations",
                schema: "weather");

            migrationBuilder.DropTable(
                name: "Predictions",
                schema: "weather");

            migrationBuilder.DropTable(
                name: "WeatherStations",
                schema: "weather");

            migrationBuilder.DropTable(
                name: "Districts",
                schema: "weather");
        }
    }
}
