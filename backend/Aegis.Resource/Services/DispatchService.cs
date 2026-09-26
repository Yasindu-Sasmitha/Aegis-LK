using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Aegis.Resource.Data;
using Aegis.Resource.DTOs;
using Aegis.Resource.Entities;
using Microsoft.EntityFrameworkCore;

namespace Aegis.Resource.Services
{
    public class DispatchService : IDispatchService
    {
        private readonly ResourceDbContext _db;
        private readonly ResourceAgentClient _agent;

        public DispatchService(ResourceDbContext db, ResourceAgentClient agent)
        {
            _db = db;
            _agent = agent;
        }

        public async Task<DispatchResponseDto?> CreateDispatchRequestAsync(CreateDispatchRequestDto dto)
        {
            // 1. Persist the inbound request (audit trail)
            var request = new ResourceRequest
            {
                MissionId = dto.MissionId,
                TeamsRequired = dto.TeamsRequired,
                District = dto.District,
                Latitude = dto.Latitude,
                Longitude = dto.Longitude,
                Status = ResourceRequestStatus.Pending,
            };
            _db.ResourceRequests.Add(request);
            await _db.SaveChangesAsync();

            // 2. Pull real Postgres data for the agent
            var warehouses = await _db.Warehouses
                .Select(w => new
                {
                    w.Id, w.Name, w.District, w.Latitude, w.Longitude
                }).ToListAsync();

            var inventory = await _db.Inventory
                .Select(i => new
                {
                    i.WarehouseId, i.ItemName, i.QuantityAvailable
                }).ToListAsync();

            var payload = new ResourceDispatchRequest
            {
                MissionId = dto.MissionId.ToString(),
                TeamsRequired = dto.TeamsRequired,
                District = dto.District,
                Location = new ResourceDispatchLocation
                {
                    Lat = (double)dto.Latitude,
                    Lng = (double)dto.Longitude,
                },
                Warehouses = warehouses.Select(w => new ResourceWarehouseSummary
                {
                    Id = w.Id.ToString(),
                    Name = w.Name,
                    District = w.District,
                    Latitude = (double)w.Latitude,
                    Longitude = (double)w.Longitude,
                }).ToList(),
                Inventory = inventory.Select(i => new ResourceInventorySummary
                {
                    WarehouseId = i.WarehouseId.ToString(),
                    ItemName = i.ItemName,
                    QuantityAvailable = i.QuantityAvailable,
                }).ToList(),
            };

            // 3. Call the Python agent service
            var agentResult = await _agent.DispatchAsync(payload);
            if (agentResult is null
                || agentResult.OverallStatus != "Success"
                || agentResult.DispatchPlan is null)
            {
                request.Status = ResourceRequestStatus.Rejected;
                await _db.SaveChangesAsync();

                return new DispatchResponseDto
                {
                    Id = Guid.Empty,
                    MissionId = dto.MissionId,
                    OverallStatus = agentResult?.OverallStatus ?? "AgentUnavailable",
                    ApprovalStatus = "SafeFailure",
                    Error = agentResult?.Error ?? "Agent service did not return a valid plan.",
                    Steps = agentResult?.Steps ?? new List<Dictionary<string, object>>(),
                    CreatedAt = DateTime.UtcNow,
                };
            }

            // 4. Persist the plan
            var plan = agentResult.DispatchPlan;
            // Pick an available vehicle at the chosen warehouse
            var chosenWarehouseId = Guid.TryParse(plan.WarehouseId, out var wid)
                ? wid : warehouses.First().Id;

            var vehicle = await _db.Vehicles
                .Where(v => v.WarehouseId == chosenWarehouseId)
                .OrderBy(v => v.Status)   // Available (0) comes before Dispatched (1)
                .FirstOrDefaultAsync();

            if (vehicle is null)
            {
                // No vehicle at this warehouse — mark as safe failure
                request.Status = ResourceRequestStatus.Rejected;
                await _db.SaveChangesAsync();
                return new DispatchResponseDto
                {
                    Id = Guid.Empty,
                    MissionId = dto.MissionId,
                    OverallStatus = "Failed",
                    ApprovalStatus = "SafeFailure",
                    Error = $"No vehicle available at warehouse {plan.WarehouseName}.",
                    Steps = agentResult.Steps,
                    CreatedAt = DateTime.UtcNow,
                };
            }

            var dispatch = new Dispatch
            {
                ResourceRequestId = request.Id,
                WarehouseId = chosenWarehouseId,
                VehicleId = vehicle.Id,                  // <-- THE FIX
                ItemsAllocated = plan.Items.Select(i => new AllocatedItem
                {
                    ItemName = i.ItemName,
                    Quantity = i.Quantity,
                }).ToList(),
                EstimatedArrivalMinutes = agentResult.EstimatedArrival,
                ApprovalStatus = DispatchApprovalStatus.PendingApproval,
                AgentReasoning = plan.RouteSummary,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };

// Mark the vehicle as dispatched
vehicle.Status = VehicleStatus.Dispatched;
vehicle.UpdatedAt = DateTime.UtcNow;

            _db.Dispatches.Add(dispatch);
            await _db.SaveChangesAsync();

            // Reload with navigation props for the DTO
            await _db.Entry(dispatch).Reference(d => d.Warehouse).LoadAsync();

            return ToDto(dispatch, request, plan, agentResult);
        }

        public async Task<DispatchResponseDto?> GetAsync(Guid id)
        {
            var d = await _db.Dispatches
                .Include(x => x.Warehouse)
                .Include(x => x.ResourceRequest)
                .FirstOrDefaultAsync(x => x.Id == id);
            return d is null ? null : ToDto(d, d.ResourceRequest, null, null);
        }

        public async Task<DispatchResponseDto?> ApproveAsync(Guid id, Guid userId)
        {
            var d = await _db.Dispatches
                .Include(x => x.Warehouse)
                .Include(x => x.ResourceRequest)
                .FirstOrDefaultAsync(x => x.Id == id);
            if (d is null) return null;

            // Reserve inventory on approval (the business-specific operation)
            foreach (var item in d.ItemsAllocated)
            {
                var inv = await _db.Inventory
                    .FirstOrDefaultAsync(i =>
                        i.WarehouseId == d.WarehouseId && i.ItemName == item.ItemName);
                if (inv is null)
                    throw new InvalidOperationException(
                        $"No inventory row for {item.ItemName}.");
                if (inv.QuantityAvailable < item.Quantity)
                    throw new InvalidOperationException(
                        $"Insufficient stock for {item.ItemName}. " +
                        $"Available {inv.QuantityAvailable}, needed {item.Quantity}.");
                inv.QuantityAvailable -= item.Quantity;
                inv.UpdatedAt = DateTime.UtcNow;
            }

            d.ApprovalStatus = DispatchApprovalStatus.Approved;
            d.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return ToDto(d, d.ResourceRequest, null, null);
        }

        private static DispatchResponseDto ToDto(
            Dispatch d,
            ResourceRequest? req,
            Aegis.Resource.Services.ResourceDispatchPlan? plan,
            ResourceDispatchResponse? agentResult)
        {
            return new DispatchResponseDto
            {
                Id = d.Id,
                MissionId = req?.MissionId ?? Guid.Empty,
                WarehouseId = d.WarehouseId,
                WarehouseName = d.Warehouse?.Name ?? string.Empty,
                District = req?.District ?? string.Empty,
                VehicleCount = plan?.VehicleCount
                    ?? Math.Max(1, d.ItemsAllocated.Count / 2),
                EstimatedArrivalMinutes = d.EstimatedArrivalMinutes,
                ApprovalStatus = d.ApprovalStatus.ToString(),
                RouteSummary = d.AgentReasoning ?? string.Empty,
                Items = d.ItemsAllocated
                    .Select(i => new DispatchItemDto
                    {
                        ItemName = i.ItemName,
                        Quantity = i.Quantity,
                    }).ToList(),
                Steps = agentResult?.Steps ?? new List<Dictionary<string, object>>(),
                OverallStatus = agentResult?.OverallStatus ?? "Success",
                Error = agentResult?.Error,
                CreatedAt = d.CreatedAt,
            };
        }
    }
}