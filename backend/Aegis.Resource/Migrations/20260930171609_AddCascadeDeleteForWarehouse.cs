using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Aegis.Resource.Migrations
{
    /// <inheritdoc />
    public partial class AddCascadeDeleteForWarehouse : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Vehicles_Warehouses_WarehouseId",
                schema: "resource",
                table: "Vehicles");

            migrationBuilder.AddForeignKey(
                name: "FK_Vehicles_Warehouses_WarehouseId",
                schema: "resource",
                table: "Vehicles",
                column: "WarehouseId",
                principalSchema: "resource",
                principalTable: "Warehouses",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Vehicles_Warehouses_WarehouseId",
                schema: "resource",
                table: "Vehicles");

            migrationBuilder.AddForeignKey(
                name: "FK_Vehicles_Warehouses_WarehouseId",
                schema: "resource",
                table: "Vehicles",
                column: "WarehouseId",
                principalSchema: "resource",
                principalTable: "Warehouses",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
