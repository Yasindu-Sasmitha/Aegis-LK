using Microsoft.AspNetCore.Builder;

namespace Aegis.Resource.Endpoints
{
    public static class ResourceEndpoints
    {
        public static void MapResourceEndpoints(this WebApplication app)
        {
            app.MapWarehouseEndpoints();
            app.MapInventoryEndpoints();
            // app.MapDispatchEndpoints(); // add once ResourceRequest/Dispatch flow is built
        }
    }
}
