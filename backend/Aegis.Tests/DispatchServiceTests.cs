using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Aegis.Resource.Data;
using Aegis.Resource.DTOs;
using Aegis.Resource.Entities;
using Aegis.Resource.Services;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace Aegis.Tests
{
    /// <summary>
    /// Unit tests for DispatchService covering the two-tier vehicle resolution,
    /// inventory reservation on approval, safe failure paths, and listing.
    /// </summary>
    public class DispatchServiceTests : IDisposable
    {
        private readonly ResourceDbContext _db;
        private readonly Mock<ResourceAgentClient> _agentMock;

        public DispatchServiceTests()
        {
            var options = new DbContextOptionsBuilder<ResourceDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            _db = new ResourceDbContext(options);

            // Moq cannot mock a concrete class with a non-virtual method directly.
            // We construct a dummy HttpClient for the mock; the DispatchAsync
            // method itself will be replaced by Setup in each test.
            var http = new System.Net.Http.HttpClient();
            _agentMock = new Mock<ResourceAgentClient>(http);
        }

        public void Dispose()
        {
            _db.Dispose();
        }

        // -----------------------------------------------------------------
        // Helpers
        // -----------------------------------------------------------------
        private async Task<(Warehouse wh, Vehicle v, Inventory inv)> SeedWarehouseAsync(
            string name, string district, int waterBottles = 500, bool addVehicle = true)
        {
            var wh = new Warehouse
            {
                Id = Guid.NewGuid(),
                Name = name,
                District = district,
                Latitude = 6.9271m,
                Longitude = 79.8612m,
                ContactPhone = "+94112223344",
            };
            _db.Warehouses.Add(wh);

            Vehicle? v = null;
            if (addVehicle)
            {
                v = new Vehicle
                {
                    Id = Guid.NewGuid(),
                    WarehouseId = wh.Id,
                    RegistrationNumber = $"WP-TR-{Guid.NewGuid().ToString()[..4].ToUpper()}",
                    VehicleType = VehicleType.Truck,
                    Capacity = 1200m,
                    Status = VehicleStatus.Available,
                };
                _db.Vehicles.Add(v);
            }

            var inv = new Inventory
            {
                Id = Guid.NewGuid(),
                WarehouseId = wh.Id,
                ItemName = "Water Bottles",
                ItemType = ItemType.Food,
                QuantityAvailable = waterBottles,
                Unit = "cases",
                ReorderThreshold = 100,
            };
            _db.Inventory.Add(inv);

            await _db.SaveChangesAsync();
            return (wh, v!, inv);
        }

        private static ResourceDispatchResponse BuildAgentResponse(
            string warehouseId, string warehouseName, int waterBottlesQty = 20)
        {
            return new ResourceDispatchResponse
            {
                OverallStatus = "Success",
                EstimatedArrival = 78,
                DispatchPlan = new ResourceDispatchPlan
                {
                    MissionId = Guid.NewGuid().ToString(),
                    WarehouseId = warehouseId,
                    WarehouseName = warehouseName,
                    District = "Colombo",
                    VehicleCount = 1,
                    Items = new List<DispatchItemSummary>
                    {
                        new() { ItemName = "Water Bottles", Quantity = waterBottlesQty },
                    },
                    RouteSummary = $"Dispatch from {warehouseName}.",
                    ApprovalStatus = "PendingApproval",
                },
                Steps = new List<Dictionary<string, object>>(),
            };
        }

        // -----------------------------------------------------------------
        // Tests
        // -----------------------------------------------------------------

        [Fact]
        public async Task CreateDispatchRequestAsync_WithValidData_ReturnsPendingApprovalPlan()
        {
            // Arrange
            var (wh, _, _) = await SeedWarehouseAsync("Colombo Central Depot", "Colombo");
            var agentResponse = BuildAgentResponse(wh.Id.ToString(), wh.Name);
            _agentMock.Setup(a => a.DispatchAsync(It.IsAny<ResourceDispatchRequest>()))
                      .ReturnsAsync(agentResponse);
            var service = new DispatchService(_db, _agentMock.Object);

            var dto = new CreateDispatchRequestDto
            {
                MissionId = Guid.NewGuid(),
                TeamsRequired = 3,
                District = "Colombo",
                Latitude = 6.9271m,
                Longitude = 79.8612m,
            };

            // Act
            var result = await service.CreateDispatchRequestAsync(dto);

            // Assert
            Assert.NotNull(result);
            Assert.Equal("PendingApproval", result!.ApprovalStatus);
            Assert.Equal("Success", result.OverallStatus);
            Assert.Single(result.Items);
            Assert.Equal(20, result.Items.First().Quantity);
        }

        [Fact]
        public async Task CreateDispatchRequestAsync_WithNoAgentResponse_ReturnsSafeFailure()
        {
            // Arrange
            await SeedWarehouseAsync("Colombo Central Depot", "Colombo");
            _agentMock.Setup(a => a.DispatchAsync(It.IsAny<ResourceDispatchRequest>()))
                      .ReturnsAsync((ResourceDispatchResponse?)null);
            var service = new DispatchService(_db, _agentMock.Object);

            var dto = new CreateDispatchRequestDto
            {
                MissionId = Guid.NewGuid(),
                TeamsRequired = 2,
                District = "Colombo",
                Latitude = 6.9271m,
                Longitude = 79.8612m,
            };

            // Act
            var result = await service.CreateDispatchRequestAsync(dto);

            // Assert
            Assert.NotNull(result);
            Assert.Equal("SafeFailure", result!.ApprovalStatus);
            Assert.NotEqual("Success", result.OverallStatus);
        }

        [Fact]
        public async Task CreateDispatchRequestAsync_WhenLocalVehicleMissing_UsesSystemWideFallback()
        {
            // Arrange
            // Warehouse A: no vehicle
            var (whA, _, _) = await SeedWarehouseAsync(
                "Samagi", "Nuwara Eliya", waterBottles: 300, addVehicle: false);
            // Warehouse B: has an available vehicle
            var (whB, vehicleB, _) = await SeedWarehouseAsync(
                "Colombo Central Depot", "Colombo", addVehicle: true);

            // Agent picks Warehouse A
            var agentResponse = BuildAgentResponse(whA.Id.ToString(), whA.Name);
            _agentMock.Setup(a => a.DispatchAsync(It.IsAny<ResourceDispatchRequest>()))
                      .ReturnsAsync(agentResponse);
            var service = new DispatchService(_db, _agentMock.Object);

            var dto = new CreateDispatchRequestDto
            {
                MissionId = Guid.NewGuid(),
                TeamsRequired = 2,
                District = "Nuwara Eliya",
                Latitude = 6.9497m,
                Longitude = 80.7891m,
            };

            // Act
            var result = await service.CreateDispatchRequestAsync(dto);

            // Assert
            Assert.NotNull(result);
            Assert.Equal("PendingApproval", result!.ApprovalStatus);
            // Verify the fallback vehicle got marked as Dispatched
            var updatedVehicle = await _db.Vehicles.FindAsync(vehicleB.Id);
            Assert.Equal(VehicleStatus.Dispatched, updatedVehicle!.Status);
        }

        [Fact]
        public async Task CreateDispatchRequestAsync_WhenNoVehiclesAnywhere_ReturnsSafeFailure()
        {
            // Arrange
            var (wh, _, _) = await SeedWarehouseAsync(
                "Samagi", "Nuwara Eliya", waterBottles: 300, addVehicle: false);
            var agentResponse = BuildAgentResponse(wh.Id.ToString(), wh.Name);
            _agentMock.Setup(a => a.DispatchAsync(It.IsAny<ResourceDispatchRequest>()))
                      .ReturnsAsync(agentResponse);
            var service = new DispatchService(_db, _agentMock.Object);

            var dto = new CreateDispatchRequestDto
            {
                MissionId = Guid.NewGuid(),
                TeamsRequired = 2,
                District = "Nuwara Eliya",
                Latitude = 6.9497m,
                Longitude = 80.7891m,
            };

            // Act
            var result = await service.CreateDispatchRequestAsync(dto);

            // Assert
            Assert.NotNull(result);
            Assert.Equal("SafeFailure", result!.ApprovalStatus);
            Assert.Contains("No vehicles available system-wide", result.Error ?? "");
        }

        [Fact]
        public async Task ApproveAsync_DecrementsInventory()
        {
            // Arrange
            var (wh, _, inv) = await SeedWarehouseAsync(
                "Colombo Central Depot", "Colombo", waterBottles: 100);
            var agentResponse = BuildAgentResponse(wh.Id.ToString(), wh.Name, waterBottlesQty: 30);
            _agentMock.Setup(a => a.DispatchAsync(It.IsAny<ResourceDispatchRequest>()))
                      .ReturnsAsync(agentResponse);
            var service = new DispatchService(_db, _agentMock.Object);

            var dto = new CreateDispatchRequestDto
            {
                MissionId = Guid.NewGuid(),
                TeamsRequired = 2,
                District = "Colombo",
                Latitude = 6.9271m,
                Longitude = 79.8612m,
            };

            var created = await service.CreateDispatchRequestAsync(dto);
            Assert.NotNull(created);

            var before = (await _db.Inventory.FindAsync(inv.Id))!.QuantityAvailable;

            // Act
            var approved = await service.ApproveAsync(created!.Id, Guid.NewGuid());

            // Assert
            Assert.NotNull(approved);
            Assert.Equal("Approved", approved!.ApprovalStatus);
            var after = (await _db.Inventory.FindAsync(inv.Id))!.QuantityAvailable;
            Assert.Equal(before - 30, after);
        }

        [Fact]
        public async Task ApproveAsync_WhenStockInsufficient_ThrowsInvalidOperation()
        {
            // Arrange
            var (wh, v, inv) = await SeedWarehouseAsync(
                "Colombo Central Depot", "Colombo", waterBottles: 10);

            // Seed a matching ResourceRequest so navigation properties load cleanly
            var request = new ResourceRequest
            {
                Id = Guid.NewGuid(),
                MissionId = Guid.NewGuid(),
                TeamsRequired = 2,
                District = "Colombo",
                Latitude = 6.9271m,
                Longitude = 79.8612m,
                Status = ResourceRequestStatus.Pending,
            };
            _db.ResourceRequests.Add(request);

            // Persist an overallocated dispatch directly
            var dispatch = new Dispatch
            {
                Id = Guid.NewGuid(),
                ResourceRequestId = request.Id,
                WarehouseId = wh.Id,
                VehicleId = v.Id,
                ItemsAllocated = new List<AllocatedItem>
                {
                    new() { InventoryId = inv.Id, ItemName = "Water Bottles", Quantity = 500 },
                },
                EstimatedArrivalMinutes = 78,
                ApprovalStatus = DispatchApprovalStatus.PendingApproval,
                AgentReasoning = "test",
            };
            _db.Dispatches.Add(dispatch);
            await _db.SaveChangesAsync();

            var service = new DispatchService(_db, _agentMock.Object);

            // Act + Assert
            await Assert.ThrowsAsync<InvalidOperationException>(
                () => service.ApproveAsync(dispatch.Id, Guid.NewGuid()));
        }


        [Fact]
        public async Task GetAllAsync_ReturnsPlansOrderedByCreatedAtDescending()
        {
            // Arrange
            var (wh, v, _) = await SeedWarehouseAsync("Colombo Central Depot", "Colombo");

            var olderRequest = new ResourceRequest
            {
                Id = Guid.NewGuid(),
                MissionId = Guid.NewGuid(),
                TeamsRequired = 2,
                District = "Colombo",
                Latitude = 6.9271m,
                Longitude = 79.8612m,
                Status = ResourceRequestStatus.Pending,
            };
            var newerRequest = new ResourceRequest
            {
                Id = Guid.NewGuid(),
                MissionId = Guid.NewGuid(),
                TeamsRequired = 2,
                District = "Colombo",
                Latitude = 6.9271m,
                Longitude = 79.8612m,
                Status = ResourceRequestStatus.Pending,
            };
            _db.ResourceRequests.AddRange(olderRequest, newerRequest);

            var older = new Dispatch
            {
                Id = Guid.NewGuid(),
                ResourceRequestId = olderRequest.Id,
                WarehouseId = wh.Id,
                VehicleId = v.Id,
                ItemsAllocated = new List<AllocatedItem>(),
                EstimatedArrivalMinutes = 60,
                ApprovalStatus = DispatchApprovalStatus.PendingApproval,
                AgentReasoning = "older",
                CreatedAt = DateTime.UtcNow.AddHours(-2),
                UpdatedAt = DateTime.UtcNow.AddHours(-2),
            };
            var newer = new Dispatch
            {
                Id = Guid.NewGuid(),
                ResourceRequestId = newerRequest.Id,
                WarehouseId = wh.Id,
                VehicleId = v.Id,
                ItemsAllocated = new List<AllocatedItem>(),
                EstimatedArrivalMinutes = 60,
                ApprovalStatus = DispatchApprovalStatus.PendingApproval,
                AgentReasoning = "newer",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            _db.Dispatches.AddRange(older, newer);
            await _db.SaveChangesAsync();

            var service = new DispatchService(_db, _agentMock.Object);

            // Act
            var result = await service.GetAllAsync();

            // Assert
            Assert.NotEmpty(result);
            Assert.Equal(newer.Id, result.First().Id);
        }
    }
}