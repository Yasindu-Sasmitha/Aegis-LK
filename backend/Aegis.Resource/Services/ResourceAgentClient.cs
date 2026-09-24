using System.Net.Http.Json;

namespace Aegis.Resource.Services;

public class ResourceAgentClient
{
    private readonly HttpClient _http;

    public ResourceAgentClient(HttpClient http)
    {
        _http = http;
        _http.Timeout = TimeSpan.FromSeconds(30);
    }

    public async Task<ResourceDispatchResponse?> DispatchAsync(ResourceDispatchRequest request)
    {
        try
        {
            var response = await _http.PostAsJsonAsync("/dispatch", request);
            if (!response.IsSuccessStatusCode)
                return null;

            return await response.Content.ReadFromJsonAsync<ResourceDispatchResponse>();
        }
        catch
        {
            return null;
        }
    }
}
