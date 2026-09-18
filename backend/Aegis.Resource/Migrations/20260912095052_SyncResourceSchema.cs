using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Aegis.Resource.Migrations
{
    /// <inheritdoc />
    public partial class SyncResourceSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "resource");

            migrationBuilder.RenameTable(
                name: "Warehouses",
                newName: "Warehouses",
                newSchema: "resource");

            migrationBuilder.RenameTable(
                name: "Vehicles",
                newName: "Vehicles",
                newSchema: "resource");

            migrationBuilder.RenameTable(
                name: "ResourceRequests",
                newName: "ResourceRequests",
                newSchema: "resource");

            migrationBuilder.RenameTable(
                name: "Inventory",
                newName: "Inventory",
                newSchema: "resource");

            migrationBuilder.RenameTable(
                name: "Fuel",
                newName: "Fuel",
                newSchema: "resource");

            migrationBuilder.RenameTable(
                name: "Dispatches",
                newName: "Dispatches",
                newSchema: "resource");

            migrationBuilder.RenameTable(
                name: "Deliveries",
                newName: "Deliveries",
                newSchema: "resource");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameTable(
                name: "Warehouses",
                schema: "resource",
                newName: "Warehouses");

            migrationBuilder.RenameTable(
                name: "Vehicles",
                schema: "resource",
                newName: "Vehicles");

            migrationBuilder.RenameTable(
                name: "ResourceRequests",
                schema: "resource",
                newName: "ResourceRequests");

            migrationBuilder.RenameTable(
                name: "Inventory",
                schema: "resource",
                newName: "Inventory");

            migrationBuilder.RenameTable(
                name: "Fuel",
                schema: "resource",
                newName: "Fuel");

            migrationBuilder.RenameTable(
                name: "Dispatches",
                schema: "resource",
                newName: "Dispatches");

            migrationBuilder.RenameTable(
                name: "Deliveries",
                schema: "resource",
                newName: "Deliveries");
        }
    }
}
