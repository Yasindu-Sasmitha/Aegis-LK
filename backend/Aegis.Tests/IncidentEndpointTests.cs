using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using static Aegis.Tests.IncidentTestSupport;

namespace Aegis.Tests;

/// <summary>
/// Business-rule / API integration tests for the Incident module.
/// All calls use an Officer token so they pass both before and after role-based authorization.
/// </summary>
public class IncidentEndpointTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;
    private readonly string _officer = Token("DisasterOfficer");

    public IncidentEndpointTests(WebApplicationFactory<Program> baseFactory)
    {
        _factory = CreateFactory(baseFactory);
        _client = _factory.CreateClient();
    }

    private Task<HttpResponseMessage> Send(HttpMethod m, string url, object? body = null) =>
        SendAsync(_client, m, url, _officer, body);

    // ── List / pagination ────────────────────────────────────────────────────
    [Fact]
    public async Task List_WithNoQueryString_ReturnsOk_NotBadRequest()
    {
        // Regression: page/pageSize were once non-nullable and made the call 400.
        var res = await Send(HttpMethod.Get, "/api/incidents");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, json.GetProperty("page").GetInt32());
        Assert.Equal(20, json.GetProperty("pageSize").GetInt32());
    }

    [Fact]
    public async Task List_ReturnsPrimariesOnly_HidesLinkedDuplicates()
    {
        var primary = await SeedIncidentAsync(_factory);
        await SeedIncidentAsync(_factory, linkedTo: primary);

        var res = await Send(HttpMethod.Get, "/api/incidents?pageSize=100");
        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        var ids = json.GetProperty("items").EnumerateArray().Select(i => i.GetProperty("id").GetGuid()).ToList();

        Assert.Contains(primary, ids);
        Assert.All(ids, id => Assert.NotEqual(Guid.Empty, id));
        Assert.DoesNotContain(json.GetProperty("items").EnumerateArray(),
            i => i.GetProperty("linkedIncidentId").ValueKind != JsonValueKind.Null);
    }

    [Fact]
    public async Task List_StatusFilter_IsCaseInsensitive()
    {
        var held = await SeedIncidentAsync(_factory, status: "OnHold");
        var res = await Send(HttpMethod.Get, "/api/incidents?status=onhold&pageSize=100");
        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        var ids = json.GetProperty("items").EnumerateArray().Select(i => i.GetProperty("id").GetGuid());
        Assert.Contains(held, ids);
    }

    [Fact]
    public async Task GetById_UnknownId_Returns404()
    {
        var res = await Send(HttpMethod.Get, $"/api/incidents/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    // ── Reject ───────────────────────────────────────────────────────────────
    [Fact]
    public async Task Reject_WithoutReason_Returns400_AndDoesNotChangeStatus()
    {
        var id = await SeedIncidentAsync(_factory);
        var res = await Send(HttpMethod.Post, $"/api/incidents/{id}/reject", new { reason = "  " });
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Equal("Reported", (await LoadAsync(_factory, id)).Status);
    }

    [Fact]
    public async Task Reject_Valid_SetsStatusReason_AndWritesAuditLog()
    {
        var id = await SeedIncidentAsync(_factory);
        var res = await Send(HttpMethod.Post, $"/api/incidents/{id}/reject", new { reason = "Photo is unrelated" });
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var saved = await LoadAsync(_factory, id);
        Assert.Equal("Rejected", saved.Status);
        Assert.Equal("Photo is unrelated", saved.RejectionReason);
        Assert.Contains(await LogsAsync(_factory, id), l => l.Note.Contains("Photo is unrelated"));
    }

    [Fact]
    public async Task Reject_AlreadyRejected_Returns409()
    {
        var id = await SeedIncidentAsync(_factory, status: "Rejected");
        var res = await Send(HttpMethod.Post, $"/api/incidents/{id}/reject", new { reason = "again" });
        Assert.Equal(HttpStatusCode.Conflict, res.StatusCode);
    }

    [Fact]
    public async Task Reject_UnknownIncident_Returns404()
    {
        var res = await Send(HttpMethod.Post, $"/api/incidents/{Guid.NewGuid()}/reject", new { reason = "x" });
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    // ── Hold ─────────────────────────────────────────────────────────────────
    [Fact]
    public async Task Hold_WithoutReason_Succeeds_AndSetsOnHold()
    {
        var id = await SeedIncidentAsync(_factory);
        var res = await Send(HttpMethod.Post, $"/api/incidents/{id}/hold", new { });
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.Equal("OnHold", (await LoadAsync(_factory, id)).Status);
        Assert.Contains(await LogsAsync(_factory, id), l => l.Note.Contains("on hold"));
    }

    [Fact]
    public async Task Hold_OnMissionApproved_Returns409()
    {
        var id = await SeedIncidentAsync(_factory, status: "MissionApproved");
        var res = await Send(HttpMethod.Post, $"/api/incidents/{id}/hold", new { reason = "x" });
        Assert.Equal(HttpStatusCode.Conflict, res.StatusCode);
    }

    // ── Unlink (undo a wrong Dedup Agent match) ──────────────────────────────
    [Fact]
    public async Task Unlink_NotLinked_Returns400()
    {
        var id = await SeedIncidentAsync(_factory);
        var res = await Send(HttpMethod.Post, $"/api/incidents/{id}/unlink");
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Unlink_Linked_ClearsAllDedupFields_AndLogs()
    {
        var primary = await SeedIncidentAsync(_factory);
        var dup = await SeedIncidentAsync(_factory, linkedTo: primary);

        var res = await Send(HttpMethod.Post, $"/api/incidents/{dup}/unlink");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var saved = await LoadAsync(_factory, dup);
        Assert.Null(saved.LinkedIncidentId);
        Assert.Null(saved.DedupConfidence);
        Assert.Null(saved.DedupReasoning);
        Assert.Contains(await LogsAsync(_factory, dup), l => l.Note.Contains("unlinked"));
    }

    // ── Citizen "My Reports" display status ──────────────────────────────────
    [Fact]
    public async Task MyReports_MergedDuplicate_ShowsConfirmedMergedStatus()
    {
        var citizen = Guid.NewGuid();
        var primary = await SeedIncidentAsync(_factory);
        var dup = await SeedIncidentAsync(_factory, linkedTo: primary, reportedBy: citizen);
        var plain = await SeedIncidentAsync(_factory, reportedBy: citizen);

        var res = await Send(HttpMethod.Get, $"/api/incidents/my-reports?reportedByUserId={citizen}");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var items = (await res.Content.ReadFromJsonAsync<JsonElement>()).EnumerateArray().ToList();

        Assert.Equal(2, items.Count);
        var merged = items.Single(i => i.GetProperty("id").GetGuid() == dup);
        Assert.StartsWith("Confirmed", merged.GetProperty("displayStatus").GetString());
        var normal = items.Single(i => i.GetProperty("id").GetGuid() == plain);
        Assert.Equal("Reported", normal.GetProperty("displayStatus").GetString());
    }

    // ── Activity log ─────────────────────────────────────────────────────────
    [Fact]
    public async Task Logs_SearchAndIncidentFilter_Work()
    {
        var a = await SeedIncidentAsync(_factory);
        var b = await SeedIncidentAsync(_factory);
        await Send(HttpMethod.Post, $"/api/incidents/{a}/reject", new { reason = "zebra-marker" });
        await Send(HttpMethod.Post, $"/api/incidents/{b}/hold", new { reason = "other" });

        var res = await Send(HttpMethod.Get, "/api/incidents/logs?search=ZEBRA-MARKER");
        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, json.GetProperty("total").GetInt32());

        var scoped = await Send(HttpMethod.Get, $"/api/incidents/logs?incidentId={b}");
        var scopedJson = await scoped.Content.ReadFromJsonAsync<JsonElement>();
        Assert.All(scopedJson.GetProperty("items").EnumerateArray(),
            l => Assert.Equal(b, l.GetProperty("incidentId").GetGuid()));
    }

    [Fact]
    public async Task Logs_ShowWhoDidWhat_ForOfficerActions()
    {
        var id = await SeedIncidentAsync(_factory);
        await Send(HttpMethod.Post, $"/api/incidents/{id}/hold", new { reason = "triage" });

        var res = await Send(HttpMethod.Get, $"/api/incidents/logs?incidentId={id}");
        var items = (await res.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("items").EnumerateArray().ToList();

        var held = items.Single(l => l.GetProperty("action").GetString() == "Held");
        Assert.Equal("officer", held.GetProperty("actorType").GetString());
        Assert.Equal("DisasterOfficer", held.GetProperty("actorRole").GetString());
        Assert.DoesNotContain("[by:", held.GetProperty("note").GetString());
    }

    // ── Cross-module contract with Recovery ──────────────────────────────────
    [Fact]
    public async Task DamageReportContract_UnknownIncident_Returns404_OnSingularRoute()
    {
        var res = await Send(HttpMethod.Get, $"/api/incident/{Guid.NewGuid()}/damage-report");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }
}