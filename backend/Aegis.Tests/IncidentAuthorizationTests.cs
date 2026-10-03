using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;
using static Aegis.Tests.IncidentTestSupport;

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
}