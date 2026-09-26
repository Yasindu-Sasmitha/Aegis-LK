using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace Aegis.Resource.Entities
{
    // Call ResourceModuleModelConfiguration.Apply(modelBuilder) from inside
    // your shared AegisDbContext.OnModelCreating(). Keeping it in its own
    // static class means you only add ONE line to the shared DbContext file
    // ("shared file — edit with care") instead of pasting all this in.
    public static class ResourceModuleModelConfiguration
    {
        public static void Apply(ModelBuilder modelBuilder)
        {
            // Warehouse -> Inventory (1-to-many)
            modelBuilder.Entity<Inventory>()
                .HasOne(i => i.Warehouse)
                .WithMany(w => w.InventoryItems)
                .HasForeignKey(i => i.WarehouseId)
                .OnDelete(DeleteBehavior.Cascade);

            // Warehouse -> Vehicle (1-to-many)
            modelBuilder.Entity<Vehicle>()
                .HasOne(v => v.Warehouse)
                .WithMany(w => w.Vehicles)
                .HasForeignKey(v => v.WarehouseId)
                .OnDelete(DeleteBehavior.Restrict);

            // Vehicle -> Fuel (1-to-1)
            modelBuilder.Entity<Vehicle>()
                .HasOne(v => v.Fuel)
                .WithOne(f => f.Vehicle)
                .HasForeignKey<Fuel>(f => f.VehicleId);

            // ResourceRequest -> Dispatch (1-to-1)
            modelBuilder.Entity<ResourceRequest>()
                .HasOne(r => r.Dispatch)
                .WithOne(d => d.ResourceRequest)
                .HasForeignKey<Dispatch>(d => d.ResourceRequestId);

            // Dispatch -> Warehouse / Vehicle (many-to-one, no back-collection needed)
            modelBuilder.Entity<Dispatch>()
                .HasOne(d => d.Warehouse)
                .WithMany()
                .HasForeignKey(d => d.WarehouseId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Dispatch>()
                .HasOne(d => d.Vehicle)
                .WithMany()
                .HasForeignKey(d => d.VehicleId)
                .OnDelete(DeleteBehavior.Restrict);

            // Dispatch -> Delivery (1-to-1)
            modelBuilder.Entity<Dispatch>()
                .HasOne(d => d.Delivery)
                .WithOne(del => del.Dispatch)
                .HasForeignKey<Delivery>(del => del.DispatchId);

            // Store ItemsAllocated as a PostgreSQL jsonb column instead of a
            // separate join table.
            modelBuilder.Entity<Dispatch>()
                .Property(d => d.ItemsAllocated)
                .HasColumnType("jsonb")
                .HasConversion(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<System.Collections.Generic.List<AllocatedItem>>(
                        v, (JsonSerializerOptions?)null) ?? new()
                );

            // Helpful index — you'll query "does any warehouse have stock of
            // this item type" constantly from the agent.
            modelBuilder.Entity<Inventory>()
                .HasIndex(i => new { i.WarehouseId, i.ItemType });
        }
    }
}
