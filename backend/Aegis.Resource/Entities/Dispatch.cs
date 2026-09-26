using System;
using System.Collections.Generic;

namespace Aegis.Resource.Entities
{
    // This is what the Resource Allocation Agent produces. It is created in
    // PendingApproval status and only moves resources once a manager approves
    // it via POST /api/resource/dispatch/{id}/approve.
    public class Dispatch
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid ResourceRequestId { get; set; }
        public ResourceRequest? ResourceRequest { get; set; }

        public Guid WarehouseId { get; set; }
        public Warehouse? Warehouse { get; set; }

        public Guid VehicleId { get; set; }
        public Vehicle? Vehicle { get; set; }

        // Mapped to a PostgreSQL jsonb column in the DbContext configuration.
        public List<AllocatedItem> ItemsAllocated { get; set; } = new();

        public int EstimatedArrivalMinutes { get; set; }

        public DispatchApprovalStatus ApprovalStatus { get; set; } = DispatchApprovalStatus.PendingApproval;
        public Guid? ApprovedByUserId { get; set; }
        public DateTime? ApprovedAt { get; set; }

        // Short human-readable explanation from the agent — supports the
        // assignment's "auditable result" requirement.
        public string? AgentReasoning { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Delivery? Delivery { get; set; }
    }
}
