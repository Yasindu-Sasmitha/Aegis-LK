using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Aegis.Resource.Migrations
{
    /// <inheritdoc />
    public partial class UpdateResourceModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Dispatches_Warehouses_WarehouseId",
                schema: "resource",
                table: "Dispatches");

            migrationBuilder.AddForeignKey(
                name: "FK_Dispatches_Warehouses_WarehouseId",
                schema: "resource",
                table: "Dispatches",
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
                name: "FK_Dispatches_Warehouses_WarehouseId",
                schema: "resource",
                table: "Dispatches");

            migrationBuilder.AddForeignKey(
                name: "FK_Dispatches_Warehouses_WarehouseId",
                schema: "resource",
                table: "Dispatches",
                column: "WarehouseId",
                principalSchema: "resource",
                principalTable: "Warehouses",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
