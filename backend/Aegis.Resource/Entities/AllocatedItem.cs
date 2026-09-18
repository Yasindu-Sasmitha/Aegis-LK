using System;

namespace Aegis.Resource.Entities
{
    // Not a database entity on its own — this is the shape of each object
    // inside Dispatch.ItemsAllocated (stored as PostgreSQL jsonb).
    public class AllocatedItem
    {
        public Guid InventoryId { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public int Quantity { get; set; }
    }
}
