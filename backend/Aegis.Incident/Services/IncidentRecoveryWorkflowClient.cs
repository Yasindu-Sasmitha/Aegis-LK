using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;

namespace Aegis.Incident.Services;

/// <summary>
/// Triggers the recovery planning multi-agent workflow when an incident is closed with a damage report.
/// </summary>
public class IncidentRecoveryWorkflowClient
{
    private readonly HttpClient _http;

    public IncidentRecoveryWorkflowClient(HttpClient http)
    {
        _http = http;
        _http.Timeout = TimeSpan.FromSeconds(60);
    }

    public async Task<bool> TriggerRecoveryWorkflowAsync(Guid incidentId)
    {
        try
        {
            var response = await _http.PostAsJsonAsync($"/api/recovery/workflows/auto-start/{incidentId}", new { incidentId });
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }
}
