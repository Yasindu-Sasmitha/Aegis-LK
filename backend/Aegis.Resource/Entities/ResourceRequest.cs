using System;

namespace Aegis.Resource.Entities
{
    // Created when Incident's module POSTs to /api/resource/dispatch-requests.
    // MissionId is stored as-is; this module never queries Incident's tables
    // directly to validate it — that would cross the module boundary.
    public class ResourceRequest
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid MissionId { get; set; }
        public int TeamsRequired { get; set; }

        public decimal Latitude { get; set; }
        public decimal Longitude { get; set; }
        public string? District { get; set; }

        public ResourceRequestStatus Status { get; set; } = ResourceRequestStatus.Pending;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        public Dispatch? Dispatch { get; set; }
    }
}
