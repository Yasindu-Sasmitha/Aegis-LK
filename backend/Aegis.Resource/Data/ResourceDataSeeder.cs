using System;
using System.Linq;
using System.Threading.Tasks;
using Aegis.Resource.Entities;
using Microsoft.EntityFrameworkCore;

namespace Aegis.Resource.Data;

public static class ResourceDataSeeder
{
    public static async Task SeedAsync(ResourceDbContext db)
    {
        var existingWarehouses = await db.Warehouses.OrderBy(w => w.Name).ToListAsync();
        if (!existingWarehouses.Any())
        {
            var warehouse1 = new Warehouse
            {
                Name = "Colombo Central Depot",
                District = "Colombo",
                Latitude = 6.9271m,
                Longitude = 79.8612m,
                ContactPhone = "+94112223344",
                CreatedAt = DateTime.UtcNow.AddDays(-20),
                UpdatedAt = DateTime.UtcNow.AddHours(-2)
            };

            var warehouse2 = new Warehouse
            {
                Name = "Kandy Relief Hub",
                District = "Kandy",
                Latitude = 7.2906m,
                Longitude = 80.6337m,
                ContactPhone = "+94112223355",
                CreatedAt = DateTime.UtcNow.AddDays(-18),
                UpdatedAt = DateTime.UtcNow.AddHours(-4)
            };

            var warehouse3 = new Warehouse
            {
                Name = "Galle Supply Base",
                District = "Galle",
                Latitude = 6.0535m,
                Longitude = 80.2210m,
                ContactPhone = "+94112223366",
                CreatedAt = DateTime.UtcNow.AddDays(-15),
                UpdatedAt = DateTime.UtcNow.AddHours(-6)
            };

            db.Warehouses.AddRange(warehouse1, warehouse2, warehouse3);
            await db.SaveChangesAsync();
            existingWarehouses = await db.Warehouses.OrderBy(w => w.Name).ToListAsync();
        }

        var warehouse1Entity = existingWarehouses.FirstOrDefault(w => w.Name == "Colombo Central Depot")
            ?? throw new InvalidOperationException("Expected Colombo Central Depot warehouse to exist.");
        var warehouse2Entity = existingWarehouses.FirstOrDefault(w => w.Name == "Kandy Relief Hub")
            ?? throw new InvalidOperationException("Expected Kandy Relief Hub warehouse to exist.");
        var warehouse3Entity = existingWarehouses.FirstOrDefault(w => w.Name == "Galle Supply Base")
            ?? throw new InvalidOperationException("Expected Galle Supply Base warehouse to exist.");

        var waterBottles = await db.Inventory.FirstOrDefaultAsync(i => i.ItemName == "Water Bottles");
        if (waterBottles is null)
        {
            db.Inventory.AddRange(
                new Inventory
                {
                    WarehouseId = warehouse1Entity.Id,
                    ItemName = "Water Bottles",
                    ItemType = ItemType.Food,
                    QuantityAvailable = 420,
                    Unit = "cases",
                    ReorderThreshold = 200,
                    CreatedAt = DateTime.UtcNow.AddDays(-10),
                    UpdatedAt = DateTime.UtcNow.AddHours(-1)
                },
                new Inventory
                {
                    WarehouseId = warehouse1Entity.Id,
                    ItemName = "Medical Kits",
                    ItemType = ItemType.Medical,
                    QuantityAvailable = 75,
                    Unit = "kits",
                    ReorderThreshold = 80,
                    CreatedAt = DateTime.UtcNow.AddDays(-10),
                    UpdatedAt = DateTime.UtcNow.AddHours(-1)
                },
                new Inventory
                {
                    WarehouseId = warehouse2Entity.Id,
                    ItemName = "Rice Bags",
                    ItemType = ItemType.Food,
                    QuantityAvailable = 180,
                    Unit = "bags",
                    ReorderThreshold = 150,
                    CreatedAt = DateTime.UtcNow.AddDays(-12),
                    UpdatedAt = DateTime.UtcNow.AddHours(-2)
                },
                new Inventory
                {
                    WarehouseId = warehouse3Entity.Id,
                    ItemName = "Blankets",
                    ItemType = ItemType.Shelter,
                    QuantityAvailable = 120,
                    Unit = "packs",
                    ReorderThreshold = 200,
                    CreatedAt = DateTime.UtcNow.AddDays(-9),
                    UpdatedAt = DateTime.UtcNow.AddHours(-3)
                }
            );
            await db.SaveChangesAsync();
        }

        var request1 = await db.ResourceRequests.FirstOrDefaultAsync(r => r.District == "Colombo" && r.Status == ResourceRequestStatus.Approved);
        if (request1 is null)
        {
            request1 = new ResourceRequest
            {
                MissionId = Guid.NewGuid(),
                TeamsRequired = 3,
                District = "Colombo",
                Latitude = 6.9271m,
                Longitude = 79.8612m,
                Status = ResourceRequestStatus.Approved,
                CreatedAt = DateTime.UtcNow.AddDays(-2),
                UpdatedAt = DateTime.UtcNow.AddHours(-6)
            };
            db.ResourceRequests.Add(request1);
            await db.SaveChangesAsync();
        }

        var request2 = await db.ResourceRequests.FirstOrDefaultAsync(r => r.District == "Kandy" && r.Status == ResourceRequestStatus.Pending);
        if (request2 is null)
        {
            request2 = new ResourceRequest
            {
                MissionId = Guid.NewGuid(),
                TeamsRequired = 2,
                District = "Kandy",
                Latitude = 7.2906m,
                Longitude = 80.6337m,
                Status = ResourceRequestStatus.Pending,
                CreatedAt = DateTime.UtcNow.AddDays(-1),
                UpdatedAt = DateTime.UtcNow.AddHours(-5)
            };
            db.ResourceRequests.Add(request2);
            await db.SaveChangesAsync();
        }

        var vehicle1 = await db.Vehicles.FirstOrDefaultAsync(v => v.RegistrationNumber == "WP-TR-101");
        if (vehicle1 is null)
        {
            vehicle1 = new Vehicle
            {
                WarehouseId = warehouse1Entity.Id,
                RegistrationNumber = "WP-TR-101",
                VehicleType = VehicleType.Truck,
                Capacity = 1200m,
                Status = VehicleStatus.Available,
                CreatedAt = DateTime.UtcNow.AddDays(-30),
                UpdatedAt = DateTime.UtcNow.AddHours(-2)
            };
            db.Vehicles.Add(vehicle1);
            await db.SaveChangesAsync();
        }

        var vehicle2 = await db.Vehicles.FirstOrDefaultAsync(v => v.RegistrationNumber == "KN-TR-202");
        if (vehicle2 is null)
        {
            vehicle2 = new Vehicle
            {
                WarehouseId = warehouse2Entity.Id,
                RegistrationNumber = "KN-TR-202",
                VehicleType = VehicleType.Truck,
                Capacity = 900m,
                Status = VehicleStatus.Dispatched,
                CreatedAt = DateTime.UtcNow.AddDays(-25),
                UpdatedAt = DateTime.UtcNow.AddHours(-3)
            };
            db.Vehicles.Add(vehicle2);
            await db.SaveChangesAsync();
        }

        var dispatch1 = await db.Dispatches.FirstOrDefaultAsync(d => d.ResourceRequestId == request1.Id && d.VehicleId == vehicle1.Id);
        if (dispatch1 is null)
        {
            dispatch1 = new Dispatch
            {
                ResourceRequestId = request1.Id,
                WarehouseId = warehouse1Entity.Id,
                VehicleId = vehicle1.Id,
                ItemsAllocated = new System.Collections.Generic.List<AllocatedItem>
                {
                    new() { InventoryId = (await db.Inventory.FirstAsync(i => i.ItemName == "Water Bottles")).Id, ItemName = "Water Bottles", Quantity = 150 },
                },
                EstimatedArrivalMinutes = 90,
                ApprovalStatus = DispatchApprovalStatus.Approved,
                AgentReasoning = "Water priority allocation approved for Colombo shelters.",
                CreatedAt = DateTime.UtcNow.AddHours(-8),
                UpdatedAt = DateTime.UtcNow.AddHours(-2)
            };
            db.Dispatches.Add(dispatch1);
            await db.SaveChangesAsync();
        }

        var dispatch2 = await db.Dispatches.FirstOrDefaultAsync(d => d.ResourceRequestId == request2.Id && d.VehicleId == vehicle2.Id);
        if (dispatch2 is null)
        {
            dispatch2 = new Dispatch
            {
                ResourceRequestId = request2.Id,
                WarehouseId = warehouse2Entity.Id,
                VehicleId = vehicle2.Id,
                ItemsAllocated = new System.Collections.Generic.List<AllocatedItem>
                {
                    new() { InventoryId = (await db.Inventory.FirstAsync(i => i.ItemName == "Rice Bags")).Id, ItemName = "Rice Bags", Quantity = 45 },
                },
                EstimatedArrivalMinutes = 120,
                ApprovalStatus = DispatchApprovalStatus.PendingApproval,
                AgentReasoning = "Kandy rice request is queued for manager approval.",
                CreatedAt = DateTime.UtcNow.AddHours(-5),
                UpdatedAt = DateTime.UtcNow.AddHours(-1)
            };
            db.Dispatches.Add(dispatch2);
            await db.SaveChangesAsync();
        }

        var delivery1 = await db.Deliveries.FirstOrDefaultAsync(d => d.DispatchId == dispatch1.Id);
        if (delivery1 is null)
        {
            db.Deliveries.Add(new Delivery
            {
                DispatchId = dispatch1.Id,
                Status = DeliveryStatus.InTransit,
                DepartedAt = DateTime.UtcNow.AddHours(-3),
                ConfirmationCode = "DEL-1001",
            });
            await db.SaveChangesAsync();
        }

        var delivery2 = await db.Deliveries.FirstOrDefaultAsync(d => d.DispatchId == dispatch2.Id);
        if (delivery2 is null)
        {
            db.Deliveries.Add(new Delivery
            {
                DispatchId = dispatch2.Id,
                Status = DeliveryStatus.Delivered,
                DepartedAt = DateTime.UtcNow.AddDays(-1),
                DeliveredAt = DateTime.UtcNow.AddHours(-12),
                ConfirmationCode = "DEL-1002",
            });
            await db.SaveChangesAsync();
        }
    }
}
