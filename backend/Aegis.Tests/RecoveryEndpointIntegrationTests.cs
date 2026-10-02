using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Aegis.Recovery.Data;
using Aegis.Recovery.Dtos;
using Aegis.Recovery.Models;
using Aegis.Shared.Auth.Data;
using Aegis.Shared.Auth.Entities;
using Aegis.Shared.Auth.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace Aegis.Tests;

public class RecoveryEndpointIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;
    private readonly string _testDbName = $"RecoveryIntegrationDb_{Guid.NewGuid()}";

    public RecoveryEndpointIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureServices(services =>
            {
                var descriptorsToRemove = services.Where(d =>
                    d.ServiceType == typeof(DbContextOptions<RecoveryDbContext>) ||
                    d.ServiceType == typeof(RecoveryDbContext) ||
                    d.ServiceType == typeof(DbContextOptions<AuthDbContext>) ||
                    d.ServiceType == typeof(AuthDbContext) ||
                    d.ServiceType.FullName?.Contains("RecoveryDbContext") == true ||
                    d.ServiceType.FullName?.Contains("AuthDbContext") == true).ToList();

                foreach (var descriptor in descriptorsToRemove)
                {
                    services.Remove(descriptor);
                }

                var inMemoryProvider = new ServiceCollection()
                    .AddEntityFrameworkInMemoryDatabase()
                    .BuildServiceProvider();

                services.AddDbContext<RecoveryDbContext>(options =>
                {
                    options.UseInMemoryDatabase(_testDbName);
                    options.UseInternalServiceProvider(inMemoryProvider);
                });

                services.AddDbContext<AuthDbContext>(options =>
                {
                    options.UseInMemoryDatabase($"AuthDb_{_testDbName}");
                    options.UseInternalServiceProvider(inMemoryProvider);
                });
            });
        });

        _client = _factory.CreateClient();
    }

    private static string GenerateTestToken(string role, string? userId = null, string? name = null)
    {
        var signingKey = JwtTokenService.DefaultDevSigningKey;
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(signingKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.Role, role),
            new("role", role),
        };

        if (userId != null)
        {
            claims.Add(new(ClaimTypes.NameIdentifier, userId));
            claims.Add(new("sub", userId));
        }

        if (name != null)
        {
            claims.Add(new(ClaimTypes.Name, name));
            claims.Add(new("name", name));
        }

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddHours(2),
            Issuer = "Aegis.Api",
            Audience = "Aegis.Client",
            SigningCredentials = credentials
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    private static HttpRequestMessage CreateAuthenticatedRequest(HttpMethod method, string url, string token, HttpContent? content = null)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        if (content != null)
        {
            request.Content = content;
        }
        return request;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Shelter HTTP Endpoints
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetShelters_PublicAnonymous_ReturnsOkWithList()
    {
        var response = await _client.GetAsync("/api/recovery/shelters");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetShelterById_UnknownId_ReturnsNotFound()
    {
        var response = await _client.GetAsync($"/api/recovery/shelters/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task PostShelters_WithoutToken_ReturnsUnauthorized()
    {
        var payload = new CreateShelterRequest("Central Shelter", "Main St", "Colombo", 6.9271, 79.8612, 100, "John", "0771112233", "Water, Food");
        var response = await _client.PostAsJsonAsync("/api/recovery/shelters", payload);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task PostShelters_WithCitizenRole_ReturnsForbidden()
    {
        var token = GenerateTestToken(Roles.Citizen, Guid.NewGuid().ToString());
        var payload = new CreateShelterRequest("Central Shelter", "Main St", "Colombo", 6.9271, 79.8612, 100, "John", "0771112233", "Water, Food");
        var request = CreateAuthenticatedRequest(HttpMethod.Post, "/api/recovery/shelters", token, JsonContent.Create(payload));

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PostShelters_WithDisasterOfficer_CreatesShelterAndReturnsCreated()
    {
        var token = GenerateTestToken(Roles.DisasterOfficer, Guid.NewGuid().ToString());
        var payload = new CreateShelterRequest("Officer Shelter", "Beach Road", "Galle", 6.0535, 80.2210, 150, "Kamal", "0779998877", "Medical");
        var request = CreateAuthenticatedRequest(HttpMethod.Post, "/api/recovery/shelters", token, JsonContent.Create(payload));

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var created = await response.Content.ReadFromJsonAsync<ShelterDto>();
        Assert.NotNull(created);
        Assert.Equal("Officer Shelter", created.Name);
        Assert.Equal(150, created.Capacity);
        Assert.Equal("Active", created.Status);
    }

    [Fact]
    public async Task PutShelterOccupancy_WithResponderRole_UpdatesOccupancyAndFullStatus()
    {
        var shelterId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecoveryDbContext>();
            db.Shelters.Add(new Shelter
            {
                Id = shelterId,
                Name = "Gampaha School",
                Location = "High Street",
                District = "Gampaha",
                Capacity = 80,
                CurrentOccupancy = 20,
                Status = "Active",
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        var token = GenerateTestToken(Roles.Responder, Guid.NewGuid().ToString());
        var updatePayload = new UpdateShelterOccupancyRequest(80, "Active");
        var request = CreateAuthenticatedRequest(HttpMethod.Put, $"/api/recovery/shelters/{shelterId}/occupancy", token, JsonContent.Create(updatePayload));

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var updated = await response.Content.ReadFromJsonAsync<ShelterDto>();
        Assert.NotNull(updated);
        Assert.Equal(80, updated.CurrentOccupancy);
        Assert.Equal("Full", updated.Status);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. Aid Requests Endpoints & RBAC Ownership
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAidRequests_WithoutToken_ReturnsUnauthorized()
    {
        var response = await _client.GetAsync("/api/recovery/aid-requests");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task PostAndGetAidRequests_Citizen_OnlySeesOwnSubmittedRecords()
    {
        var citizen1Id = Guid.NewGuid();
        var citizen2Id = Guid.NewGuid();

        var tokenCitizen1 = GenerateTestToken(Roles.Citizen, citizen1Id.ToString(), "Citizen One");
        var tokenCitizen2 = GenerateTestToken(Roles.Citizen, citizen2Id.ToString(), "Citizen Two");
        var tokenOfficer = GenerateTestToken(Roles.DisasterOfficer, Guid.NewGuid().ToString(), "Officer Silva");

        // Citizen 1 creates a request
        var req1 = new CreateAidRequest("Perera", "0771234567", "Colombo", "Medical", 4, "High", null, "Immediate insulin needed");
        var postReq1 = CreateAuthenticatedRequest(HttpMethod.Post, "/api/recovery/aid-requests", tokenCitizen1, JsonContent.Create(req1));
        var postRes1 = await _client.SendAsync(postReq1);
        Assert.Equal(HttpStatusCode.Created, postRes1.StatusCode);

        // Citizen 2 creates a request
        var req2 = new CreateAidRequest("Silva", "0779876543", "Galle", "Food", 5, "Medium", null, "Food pack for 5 days");
        var postReq2 = CreateAuthenticatedRequest(HttpMethod.Post, "/api/recovery/aid-requests", tokenCitizen2, JsonContent.Create(req2));
        var postRes2 = await _client.SendAsync(postReq2);
        Assert.Equal(HttpStatusCode.Created, postRes2.StatusCode);

        // Citizen 1 queries aid requests
        var getReq1 = CreateAuthenticatedRequest(HttpMethod.Get, "/api/recovery/aid-requests", tokenCitizen1);
        var getRes1 = await _client.SendAsync(getReq1);
        Assert.Equal(HttpStatusCode.OK, getRes1.StatusCode);
        var doc1 = await getRes1.Content.ReadFromJsonAsync<JsonElement>();
        var items1 = doc1.GetProperty("items").EnumerateArray().ToList();
        Assert.All(items1, item => Assert.Equal("Medical", item.GetProperty("aidType").GetString()));

        // Officer queries aid requests and sees all items
        var getReqOfficer = CreateAuthenticatedRequest(HttpMethod.Get, "/api/recovery/aid-requests", tokenOfficer);
        var getResOfficer = await _client.SendAsync(getReqOfficer);
        Assert.Equal(HttpStatusCode.OK, getResOfficer.StatusCode);
        var docOfficer = await getResOfficer.Content.ReadFromJsonAsync<JsonElement>();
        var totalOfficer = docOfficer.GetProperty("total").GetInt32();
        Assert.True(totalOfficer >= 2);
    }

    [Fact]
    public async Task PutAidRequestStatus_WithResponder_UpdatesStatus()
    {
        var aidReqId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecoveryDbContext>();
            db.AidRequests.Add(new AidRequest
            {
                Id = aidReqId,
                VictimName = "Sunil",
                ContactPhone = "0712223344",
                District = "Kalutara",
                AidType = "Shelter",
                FamilySize = 3,
                Urgency = "High",
                Status = "Pending",
                Notes = "Clean drinking water needed",
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        var token = GenerateTestToken(Roles.Responder, Guid.NewGuid().ToString());
        var patchPayload = new UpdateAidRequestStatus("Fulfilled", null, "Assigned 100L bottled water");
        var request = CreateAuthenticatedRequest(HttpMethod.Put, $"/api/recovery/aid-requests/{aidReqId}/status", token, JsonContent.Create(patchPayload));

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var updated = await response.Content.ReadFromJsonAsync<AidRequestDto>();
        Assert.NotNull(updated);
        Assert.Equal("Fulfilled", updated.Status);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. Donations Endpoints
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task PostDonation_WithOfficer_CreatesDonation()
    {
        var token = GenerateTestToken(Roles.DisasterOfficer, Guid.NewGuid().ToString());
        var payload = new CreateDonationRequest("Anonymous Donor", "0770001122", "Financial", 50000m, "Flood relief fund", null, "Received");
        var request = CreateAuthenticatedRequest(HttpMethod.Post, "/api/recovery/donations", token, JsonContent.Create(payload));

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var created = await response.Content.ReadFromJsonAsync<DonationDto>();
        Assert.NotNull(created);
        Assert.Equal(50000m, created.AmountOrQuantity);
        Assert.Equal("Received", created.AllocationStatus);
    }

    [Fact]
    public async Task GetDonations_WithoutToken_ReturnsUnauthorized()
    {
        var response = await _client.GetAsync("/api/recovery/donations");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetDonations_WithOfficer_ReturnsOk()
    {
        var token = GenerateTestToken(Roles.DisasterOfficer, Guid.NewGuid().ToString());
        var request = CreateAuthenticatedRequest(HttpMethod.Get, "/api/recovery/donations", token);
        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. Recovery Plans Lifecycle & AI Workflow Trace Endpoints
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task PostPlanApprove_WithoutToken_ReturnsUnauthorized()
    {
        var response = await _client.PostAsync($"/api/recovery/plan/{Guid.NewGuid()}/approve", null);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task PostPlanApprove_WithCitizen_ReturnsForbidden()
    {
        var token = GenerateTestToken(Roles.Citizen, Guid.NewGuid().ToString());
        var payload = new ApprovePlanRequest("Approve", "Citizen cannot review plans");
        var request = CreateAuthenticatedRequest(HttpMethod.Post, $"/api/recovery/plan/{Guid.NewGuid()}/approve", token, JsonContent.Create(payload));
        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PostPlanApprove_WithDisasterOfficer_SetsApprovedStatusAndOfficerName()
    {
        var planId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecoveryDbContext>();
            db.RecoveryPlans.Add(new RecoveryPlan
            {
                Id = planId,
                PlanName = "Kalutara Rehabilitation Plan",
                Status = "PendingApproval",
                EstimatedTotalBudget = 2500000m,
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        var officerId = Guid.NewGuid();
        var token = GenerateTestToken(Roles.DisasterOfficer, officerId.ToString(), "Officer Bandara");
        var payload = new ApprovePlanRequest("Approve", "Approved according to district recovery budget guidelines.", "Officer Bandara");
        var request = CreateAuthenticatedRequest(HttpMethod.Post, $"/api/recovery/plan/{planId}/approve", token, JsonContent.Create(payload));

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var approved = await response.Content.ReadFromJsonAsync<RecoveryPlanDetailDto>();
        Assert.NotNull(approved);
        Assert.Equal("Approved", approved.Status);
        Assert.NotNull(approved.ReviewedAt);
        Assert.Contains("Officer Bandara", approved.ReviewedBy);
    }

    [Fact]
    public async Task PostPlanReject_WithDisasterOfficer_SetsRejectedStatusAndNotes()
    {
        var planId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecoveryDbContext>();
            db.RecoveryPlans.Add(new RecoveryPlan
            {
                Id = planId,
                PlanName = "Matara Bridge Rebuild Plan",
                Status = "PendingApproval",
                EstimatedTotalBudget = 40000000m,
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        var token = GenerateTestToken(Roles.DisasterOfficer, Guid.NewGuid().ToString(), "Officer Perera");
        var payload = new ApprovePlanRequest("Reject", "Budget allocation exceeds district limit. Please re-evaluate.", "Officer Perera");
        var request = CreateAuthenticatedRequest(HttpMethod.Post, $"/api/recovery/plan/{planId}/approve", token, JsonContent.Create(payload));

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var rejected = await response.Content.ReadFromJsonAsync<RecoveryPlanDetailDto>();
        Assert.NotNull(rejected);
        Assert.Equal("Rejected", rejected.Status);
        Assert.Equal("Budget allocation exceeds district limit. Please re-evaluate.", rejected.ReviewNotes);
    }

    [Fact]
    public async Task GetWorkflowTrace_WithDisasterOfficer_Returns4AgentStepTrace()
    {
        var planId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecoveryDbContext>();
            var plan = new RecoveryPlan
            {
                Id = planId,
                PlanName = "Ratnapura Landslide Recovery",
                Status = "Approved",
                EstimatedTotalBudget = 15000000m,
                CreatedAt = DateTime.UtcNow
            };
            db.RecoveryPlans.Add(plan);

            db.RecoveryWorkflowLogs.Add(new RecoveryWorkflowLog
            {
                Id = Guid.NewGuid(),
                RecoveryPlanId = planId,
                ExecutionStatus = "Approved",
                TotalDurationMs = 2840,
                AgentStepsJson = "[{\"agentName\":\"Agent 1: Planner\",\"role\":\"Planner\",\"inputSummary\":\"disaster data\",\"outputSummary\":\"3 phases\",\"durationMs\":120,\"status\":\"success\"},{\"agentName\":\"Agent 2: Infrastructure\",\"role\":\"Analysis\",\"inputSummary\":\"assets\",\"outputSummary\":\"ranked\",\"durationMs\":150,\"status\":\"success\"},{\"agentName\":\"Agent 3: NGO Matcher\",\"role\":\"Matching\",\"inputSummary\":\"tasks\",\"outputSummary\":\"assigned\",\"durationMs\":300,\"status\":\"success\"},{\"agentName\":\"Agent 4: Guardrail\",\"role\":\"Validation\",\"inputSummary\":\"budget\",\"outputSummary\":\"approved\",\"durationMs\":80,\"status\":\"success\"}]",
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        var token = GenerateTestToken(Roles.DisasterOfficer, Guid.NewGuid().ToString());
        var request = CreateAuthenticatedRequest(HttpMethod.Get, $"/api/recovery/workflows/{planId}/trace", token);

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var trace = await response.Content.ReadFromJsonAsync<WorkflowTraceDto>();
        Assert.NotNull(trace);
        Assert.Equal("Approved", trace.ExecutionStatus);
        Assert.Equal(2840, trace.TotalDurationMs);
        Assert.Equal(4, trace.AgentSteps.Count);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5. Compensations Review Endpoints
    // ──────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task PutCompensationApprove_WithDisasterOfficer_SetsApprovedAmount()
    {
        var claimId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<RecoveryDbContext>();
            db.Compensations.Add(new Compensation
            {
                Id = claimId,
                ApplicantName = "Sunil Perera",
                NIC = "199012345678",
                DamageCategory = "Total House Loss",
                ClaimAmount = 500000m,
                ApprovedAmount = 0m,
                Status = "Submitted",
                VerificationNotes = "Pending assessment",
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }

        var token = GenerateTestToken(Roles.DisasterOfficer, Guid.NewGuid().ToString(), "Officer Silva");
        var reviewPayload = new ApproveCompensationRequest(450000m, "Approved", "Damage verified by field assessment officer.", "Officer Silva");
        var request = CreateAuthenticatedRequest(HttpMethod.Put, $"/api/recovery/compensations/{claimId}/approve", token, JsonContent.Create(reviewPayload));

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var reviewed = await response.Content.ReadFromJsonAsync<CompensationDto>();
        Assert.NotNull(reviewed);
        Assert.Equal("Approved", reviewed.Status);
        Assert.Equal(450000m, reviewed.ApprovedAmount);
        Assert.Contains("Officer Silva", reviewed.ApprovedBy);
    }
}
