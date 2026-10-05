using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;
using static Aegis.Tests.IncidentTestSupport;
using System.Net.Http.Json;

namespace Aegis.Tests;

/// <summary>Role-based authorization tests for officer-only Incident actions.</summary>
public class IncidentAuthorizationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    public IncidentAuthorizationTests(WebApplicationFactory<Program> baseFactory)
    {
        _factory = CreateFactory(baseFactory);
        _client = _factory.CreateClient();
    }

    public static IEnumerable<object[]> OfficerOnlyPosts() => new[]
    {
        new object[] { "reject", "{\"reason\":\"x\"}" },
        new object[] { "hold", "{}" },
        new object[] { "unlink", "{}" },
        new object[] { "assess", "{}" },
        new object[] { "approve", "{}" },
    };

    private async Task<HttpResponseMessage> Post(string action, string? token)
    {
        var id = await SeedIncidentAsync(_factory);
        var req = new HttpRequestMessage(HttpMethod.Post, $"/api/incidents/{id}/{action}");
        if (token is not null)
            req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        req.Content = new StringContent("{}", System.Text.Encoding.UTF8, "application/json");
        return await _client.SendAsync(req);
    }

    [Theory]
    [MemberData(nameof(OfficerOnlyPosts))]
    public async Task OfficerActions_Anonymous_Return401(string action, string _)
    {
        var res = await Post(action, null);
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Theory]
    [MemberData(nameof(OfficerOnlyPosts))]
    public async Task OfficerActions_Citizen_Return403(string action, string _)
    {
        var res = await Post(action, Token("Citizen"));
        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    [Theory]
    [InlineData("DisasterOfficer")]
    [InlineData("Admin")]
    public async Task Reject_OfficerAndAdmin_AreAllowed(string role)
    {
        var id = await SeedIncidentAsync(_factory);
        var res = await SendAsync(_client, HttpMethod.Post, $"/api/incidents/{id}/reject", Token(role), new { reason = "not real" });
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }

    [Fact]
    public async Task ActivityLog_Citizen_Returns403()
    {
        var res = await SendAsync(_client, HttpMethod.Get, "/api/incidents/logs", Token("Citizen"));
        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    [Theory]
    [InlineData("/api/incidents")]
    [InlineData("/api/incidents/00000000-0000-0000-0000-000000000001")]
    [InlineData("/api/incidents/00000000-0000-0000-0000-000000000001/related-reports")]
    public async Task IncidentReads_Anonymous_Return401(string url)
    {
        var res = await SendAsync(_client, HttpMethod.Get, url);
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Theory]
    [InlineData("/api/incidents")]
    [InlineData("/api/incidents/00000000-0000-0000-0000-000000000001")]
    [InlineData("/api/incidents/00000000-0000-0000-0000-000000000001/related-reports")]
    public async Task IncidentReads_Citizen_Return403(string url)
    {
        var res = await SendAsync(_client, HttpMethod.Get, url, Token("Citizen"));
        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    private async Task<(Guid id, Guid owner)> SeedApproved()
    {
        var owner = Guid.NewGuid();
        var id = await SeedIncidentAsync(_factory, status: "MissionApproved", reportedBy: owner);
        return (id, owner);
    }

    [Fact]
    public async Task Close_Anonymous_Returns401()
    {
        var (id, _) = await SeedApproved();
        var res = await SendAsync(_client, HttpMethod.Post, $"/api/incidents/{id}/close");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Close_OtherCitizen_Returns403()
    {
        var (id, _) = await SeedApproved();
        var res = await SendAsync(_client, HttpMethod.Post, $"/api/incidents/{id}/close", Token("Citizen"));
        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    [Fact]
    public async Task Close_OwnerCitizen_OnApprovedMission_ClosesIncident()
    {
        var (id, owner) = await SeedApproved();
        var res = await SendAsync(_client, HttpMethod.Post, $"/api/incidents/{id}/close", Token("Citizen", owner));
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var check = await SendAsync(_client, HttpMethod.Get, $"/api/incidents/{id}", Token("DisasterOfficer"));
        var json = await check.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        Assert.Equal("Closed", json.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Close_Officer_OnApprovedMission_Returns200()
    {
        var (id, _) = await SeedApproved();
        var res = await SendAsync(_client, HttpMethod.Post, $"/api/incidents/{id}/close", Token("DisasterOfficer"));
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }

    [Fact]
    public async Task Close_NotApproved_Returns409_AndUnknownReturns404()
    {
        var owner = Guid.NewGuid();
        var id = await SeedIncidentAsync(_factory, status: "Reported", reportedBy: owner);
        var conflict = await SendAsync(_client, HttpMethod.Post, $"/api/incidents/{id}/close", Token("Citizen", owner));
        Assert.Equal(HttpStatusCode.Conflict, conflict.StatusCode);

        var missing = await SendAsync(_client, HttpMethod.Post, $"/api/incidents/{Guid.NewGuid()}/close", Token("DisasterOfficer"));
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
    }

    [Fact]
    public async Task Rescreen_Anonymous_Returns401()
    {
        var res = await Post("rescreen", null);
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Rescreen_Citizen_Returns403()
    {
        var res = await Post("rescreen", Token("Citizen"));
        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    [Fact]
    public async Task Rescreen_Officer_Returns202_AndUnknownIncident404()
    {
        var res = await Post("rescreen", Token("DisasterOfficer"));
        Assert.Equal(HttpStatusCode.Accepted, res.StatusCode);

        var missing = await SendAsync(_client, HttpMethod.Post, $"/api/incidents/{Guid.NewGuid()}/rescreen", Token("DisasterOfficer"));
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
    }

    [Fact]
    public async Task NearbyEndpoint_RemainsAnonymous_ForInternalDedupAgent()
    {
        var res = await _client.GetAsync("/api/incidents/nearby?lat=6.5&lng=79.9&radiusKm=10&hours=24");
        Assert.NotEqual(HttpStatusCode.Unauthorized, res.StatusCode);
        Assert.NotEqual(HttpStatusCode.Forbidden, res.StatusCode);
    }

    [Fact]
    public async Task DamageReportContract_RemainsAnonymous_ForRecoveryModule()
    {
        var res = await _client.GetAsync($"/api/incident/{Guid.NewGuid()}/damage-report");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode); // 404, not 401: Recovery calls this without a token
    }

        [Fact]
    public async Task CreateIncident_Anonymous_Returns401()
    {
        var res = await SendAsync(_client, HttpMethod.Post, "/api/incidents", null,
            new { disasterType = "Flood", severityReported = "High", description = "x" });
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task CreateIncident_ReporterIdComesFromToken_NotFromBody()
    {
        var realUser = Guid.NewGuid();
        var spoofed = Guid.NewGuid();
        var res = await SendAsync(_client, HttpMethod.Post, "/api/incidents", Token("Citizen", realUser),
            new { disasterType = "Flood", severityReported = "High", description = "x", reportedByUserId = spoofed });
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        Assert.Equal(realUser, body.GetProperty("reportedByUserId").GetGuid());
    }

    [Fact]
    public async Task MyReports_OtherUsersId_Returns403_ForCitizen()
    {
        var res = await SendAsync(_client, HttpMethod.Get,
            $"/api/incidents/my-reports?reportedByUserId={Guid.NewGuid()}", Token("Citizen"));
        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    [Fact]
    public async Task MyReports_OwnId_Returns200()
    {
        var me = Guid.NewGuid();
        var res = await SendAsync(_client, HttpMethod.Get,
            $"/api/incidents/my-reports?reportedByUserId={me}", Token("Citizen", me));
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }
}