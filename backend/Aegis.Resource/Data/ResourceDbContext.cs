using Aegis.Resource.Entities;
using Microsoft.EntityFrameworkCore;

namespace Aegis.Resource.Data
{
    public class ResourceDbContext : DbContext
    {
        public ResourceDbContext(DbContextOptions<ResourceDbContext> options) : base(options) { }

        public DbSet<Warehouse> Warehouses => Set<Warehouse>();
        public DbSet<Inventory> Inventory => Set<Inventory>();
        public DbSet<Vehicle> Vehicles => Set<Vehicle>();
        public DbSet<Fuel> Fuel => Set<Fuel>();
        public DbSet<ResourceRequest> ResourceRequests => Set<ResourceRequest>();
        public DbSet<Dispatch> Dispatches => Set<Dispatch>();
        public DbSet<Delivery> Deliveries => Set<Delivery>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.HasDefaultSchema("resource");
            ResourceModuleModelConfiguration.Apply(modelBuilder);
        }
    }
}
