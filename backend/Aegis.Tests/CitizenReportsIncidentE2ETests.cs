using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Aegis.Incident.Data;
using Aegis.Shared.Auth.Data;
using Aegis.Shared.Auth.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace Aegis.Tests;

/// <summary>
/// End-to-End integration test: exercises the full citizen reporting lifecycle
/// in a single realistic workflow using an in-memory database and the real JWT
/// middleware pipeline.
///
/// Workflow under test:
///   Step 1 – Citizen registers a new account           POST /api/auth/register
///   Step 2 – Citizen logs in with those credentials   POST /api/auth/login
///   Step 3 – Citizen fetches their own profile        GET  /api/auth/me
///   Step 4 – Citizen submits a disaster report        POST /api/incidents
///   Step 5 – Officer lists incidents (sees the new one)  GET  /api/incidents
///   Step 6 – Officer retrieves the specific incident  GET  /api/incidents/{id}
///   Step 7 – Officer places it on hold                POST /api/incidents/{id}/hold
///   Step 8 – Citizen checks their own reports         GET  /api/incidents/my-reports
///   Step 9 – Officer rejects it (invalid photo etc.)  POST /api/incidents/{id}/reject
///   Step 10– Verify final state persisted correctly   GET  /api/incidents/{id}
/// </summary>
public class CitizenReportsIncidentE2ETests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public CitizenReportsIncidentE2ETests(WebApplicationFactory<Program> baseFactory)
    {
        _factory = IncidentTestSupport.CreateFactory(baseFactory);
    }

    // ─── Shared test state (populated as the workflow progresses) ────────────
    private string? _citizenToken;
    private string? _officerToken;
    private Guid   _incidentId;

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private HttpClient NewClient() => _factory.CreateClient();

    private static HttpClient Authed(HttpClient client, string token)
    {
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private static string OfficerToken() =>
        IncidentTestSupport.Token("DisasterOfficer");

    // ─────────────────────────────────────────────────────────────────────────
    // THE SINGLE WORKFLOW TEST (all steps must pass in order)
    // ─────────────────────────────────────────────────────────────────────────

    [Fact(DisplayName = "Citizen registers → logs in → reports incident → officer triages it (full E2E workflow)")]
    public async Task FullCitizenOfficerWorkflow_Succeeds()
    {
        var client = NewClient();

        // ── Step 1: Citizen registers ─────────────────────────────────────────
        var email    = $"e2e.citizen.{Guid.NewGuid():N}@example.com";
        const string password = "Aegis@E2E!";
        const string fullName = "E2E Test Citizen";

        var regRes = await client.PostAsJsonAsync("/api/auth/register", new
        {
            fullName,
            email,
            password,
            district    = "Colombo",
            phoneNumber = "+94771234567"
        });

        Assert.Equal(HttpStatusCode.Created, regRes.StatusCode);
        var regBody = await regRes.Content.ReadFromJsonAsync<JsonElement>();
        _citizenToken = regBody.GetProperty("token").GetString();
        Assert.False(string.IsNullOrEmpty(_citizenToken),
            "Registration must return a non-empty JWT token");

        var citizenId = regBody.GetProperty("user").GetProperty("id").GetString();
        Assert.Equal("Citizen", regBody.GetProperty("user").GetProperty("role").GetString());

        // ── Step 2: Citizen logs in with the same credentials ─────────────────
        var loginRes = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email,
            password
        });

        Assert.Equal(HttpStatusCode.OK, loginRes.StatusCode);
        var loginBody = await loginRes.Content.ReadFromJsonAsync<JsonElement>();
        var loginToken = loginBody.GetProperty("token").GetString();
        Assert.False(string.IsNullOrEmpty(loginToken),
            "Login must return a non-empty JWT token");

        // Use the login token going forward (proves both registration & login paths)
        _citizenToken = loginToken;

        // ── Step 3: Citizen fetches their own profile ─────────────────────────
        var meClient = Authed(NewClient(), _citizenToken!);
        var meRes    = await meClient.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.OK, meRes.StatusCode);
        var meBody = await meRes.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(email, meBody.GetProperty("email").GetString());
        Assert.Equal("Citizen", meBody.GetProperty("role").GetString());
        Assert.Equal("Colombo", meBody.GetProperty("district").GetString());

        // ── Step 4: Citizen submits an incident report ────────────────────────
        var reportClient = Authed(NewClient(), _citizenToken!);
        var reportRes = await reportClient.PostAsJsonAsync("/api/incidents", new
        {
            disasterType     = "Flood",
            description      = "Water rising rapidly near the main road — E2E test report",
            severityReported = "High",
            latitude         = 6.9271,
            longitude        = 79.8612
        });

        Assert.Equal(HttpStatusCode.Created, reportRes.StatusCode);
        var reportBody = await reportRes.Content.ReadFromJsonAsync<JsonElement>();
        _incidentId = reportBody.GetProperty("id").GetGuid();
        Assert.NotEqual(Guid.Empty, _incidentId);
        Assert.Equal("Reported", reportBody.GetProperty("status").GetString());
        Assert.Equal("Flood",    reportBody.GetProperty("disasterType").GetString());

        // ── Step 5: Officer lists incidents (paginated) ───────────────────────
        _officerToken = OfficerToken();
        var officerClient = Authed(NewClient(), _officerToken);
        var listRes  = await officerClient.GetAsync("/api/incidents?pageSize=100");

        Assert.Equal(HttpStatusCode.OK, listRes.StatusCode);
        var listBody = await listRes.Content.ReadFromJsonAsync<JsonElement>();
        var ids = listBody.GetProperty("items")
                          .EnumerateArray()
                          .Select(i => i.GetProperty("id").GetGuid())
                          .ToList();
        Assert.Contains(_incidentId, ids);

        // ── Step 6: Officer retrieves the specific incident ───────────────────
        var getRes = await officerClient.GetAsync($"/api/incidents/{_incidentId}");
        Assert.Equal(HttpStatusCode.OK, getRes.StatusCode);
        var getBody = await getRes.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(_incidentId, getBody.GetProperty("id").GetGuid());
        Assert.Equal("Reported",  getBody.GetProperty("status").GetString());

        // ── Step 7: Officer places the incident on hold ───────────────────────
        var holdRes = await officerClient.PostAsJsonAsync(
            $"/api/incidents/{_incidentId}/hold",
            new { reason = "Awaiting clearer photo evidence" });

        Assert.Equal(HttpStatusCode.OK, holdRes.StatusCode);

        // Verify status changed in DB
        using var verifyHoldScope = _factory.Services.CreateScope();
        var db = verifyHoldScope.ServiceProvider.GetRequiredService<IncidentDbContext>();
        var held = await db.Incidents.AsNoTracking().FirstAsync(i => i.Id == _incidentId);
        Assert.Equal("OnHold", held.Status);

        // ── Step 8: Citizen views their own reports ────────────────────────────
        var myClient = Authed(NewClient(), _citizenToken!);
        var myRes    = await myClient.GetAsync(
            $"/api/incidents/my-reports?reportedByUserId={citizenId}");

        Assert.Equal(HttpStatusCode.OK, myRes.StatusCode);
        var myReports = await myRes.Content.ReadFromJsonAsync<JsonElement>();
        var myList    = myReports.EnumerateArray().ToList();
        Assert.True(myList.Count >= 1, "Citizen should see at least one report");
        Assert.Contains(myList, r => r.GetProperty("id").GetGuid() == _incidentId);

        // ── Step 9: Officer rejects the on-hold incident ──────────────────────
        var rejectRes = await officerClient.PostAsJsonAsync(
            $"/api/incidents/{_incidentId}/reject",
            new { reason = "Submitted photo does not match described flood area — E2E test" });

        Assert.Equal(HttpStatusCode.OK, rejectRes.StatusCode);

        // ── Step 10: Verify final persisted state ─────────────────────────────
        using var finalScope = _factory.Services.CreateScope();
        var finalDb   = finalScope.ServiceProvider.GetRequiredService<IncidentDbContext>();
        var finalInc  = await finalDb.Incidents.AsNoTracking().FirstAsync(i => i.Id == _incidentId);

        Assert.Equal("Rejected", finalInc.Status);
        Assert.Equal("Submitted photo does not match described flood area — E2E test",
                     finalInc.RejectionReason);

        // Verify audit log recorded both the hold AND the rejection
        var logs = await finalDb.MissionLogs
                                .AsNoTracking()
                                .Where(l => l.IncidentId == _incidentId)
                                .ToListAsync();
        Assert.True(logs.Count >= 2, "At least a 'held' and a 'rejected' log entry must exist");
        Assert.Contains(logs, l => l.Note.Contains("on hold"));
        Assert.Contains(logs, l => l.Note.Contains("rejected") || l.Note.Contains("Rejected"));
    }

    // ─── Auxiliary: Second registration with same email must be rejected ──────

    [Fact(DisplayName = "Duplicate email registration is rejected with 400")]
    public async Task Register_DuplicateEmail_Returns400()
    {
        var email = $"dup.{Guid.NewGuid():N}@aegis.lk";
        var client = NewClient();

        await client.PostAsJsonAsync("/api/auth/register", new
        {
            fullName = "First",
            email,
            password = "Pass@1234",
            district = "Kandy"
        });

        var dupRes = await client.PostAsJsonAsync("/api/auth/register", new
        {
            fullName = "Second",
            email,
            password = "Pass@5678",
            district = "Galle"
        });

        Assert.Equal(HttpStatusCode.BadRequest, dupRes.StatusCode);
        var body = await dupRes.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Contains("already exists", body.GetProperty("error").GetString(),
                         StringComparison.OrdinalIgnoreCase);
    }

    // ─── Auxiliary: Unauthenticated incident submission must be rejected ──────

    [Fact(DisplayName = "Creating an incident without a JWT token returns 401")]
    public async Task CreateIncident_NoToken_Returns401()
    {
        var client = NewClient(); // no auth header
        var res = await client.PostAsJsonAsync("/api/incidents", new
        {
            disasterType     = "Landslide",
            description      = "Should be rejected",
            severityReported = "Low",
            latitude         = 7.2906,
            longitude        = 80.6337
        });

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    // ─── Auxiliary: Wrong password login must be rejected ────────────────────

    [Fact(DisplayName = "Login with wrong password returns 401")]
    public async Task Login_WrongPassword_Returns401()
    {
        var email = $"wrongpw.{Guid.NewGuid():N}@aegis.lk";
        var client = NewClient();

        await client.PostAsJsonAsync("/api/auth/register", new
        {
            fullName = "Test User",
            email,
            password = "CorrectPassword@1",
            district = "Colombo"
        });

        var badLogin = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email,
            password = "WrongPassword@2"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, badLogin.StatusCode);
    }
}
