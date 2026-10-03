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
using Aegis.Shared.Auth.Data;
using Aegis.Shared.Auth.DTOs;
using Aegis.Shared.Auth.Entities;
using Aegis.Shared.Auth.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace Aegis.Tests;

public class AdminUserManagementTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;
    private readonly string _testDbName = $"AdminUserTestsDb_{Guid.NewGuid()}";

    public AdminUserManagementTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureServices(services =>
            {
                var descriptorsToRemove = services.Where(d =>
                    d.ServiceType == typeof(DbContextOptions<AuthDbContext>) ||
                    d.ServiceType == typeof(AuthDbContext) ||
                    d.ServiceType.FullName?.Contains("AuthDbContext") == true).ToList();

                foreach (var descriptor in descriptorsToRemove)
                {
                    services.Remove(descriptor);
                }

                var inMemoryProvider = new ServiceCollection()
                    .AddEntityFrameworkInMemoryDatabase()
                    .BuildServiceProvider();

                services.AddDbContext<AuthDbContext>(options =>
                {
                    options.UseInMemoryDatabase(_testDbName);
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

    private static HttpRequestMessage CreateAuthRequest(HttpMethod method, string url, string token, HttpContent? content = null)
    {
        var request = new HttpRequestMessage(method, url) { Content = content };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return request;
    }

    private async Task SeedUserAsync(User user)
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AuthDbContext>();
        db.Users.Add(user);
        await db.SaveChangesAsync();
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Public Registration: Always Citizen, Cannot Inject Role
    // ──────────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task Register_AlwaysCreatesCitizen_EvenIfMaliciousRequestInjectsRole()
    {
        var email = $"malicious_{Guid.NewGuid()}@example.com";
        var payload = new
        {
            email = email,
            password = "SecurePassword123!",
            fullName = "Malicious Applicant",
            district = "Colombo",
            phoneNumber = "+94771234567",
            role = "Admin" // Attempt to inject Admin role
        };

        var response = await _client.PostAsJsonAsync("/api/auth/register", payload);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var authResp = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(authResp);
        Assert.Equal(Roles.Citizen, authResp.User.Role);

        // Verify in database directly
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AuthDbContext>();
        var userInDb = await db.Users.FirstOrDefaultAsync(u => u.Email == email.ToLowerInvariant());
        Assert.NotNull(userInDb);
        Assert.Equal(Roles.Citizen, userInDb.Role);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. GET /api/auth/admin/users: RBAC Authorization
    // ──────────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task GetAdminUsers_Unauthenticated_ReturnsUnauthorized()
    {
        var response = await _client.GetAsync("/api/auth/admin/users");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData(Roles.Citizen)]
    [InlineData(Roles.Responder)]
    [InlineData(Roles.DisasterOfficer)]
    public async Task GetAdminUsers_NonAdminRoles_ReturnForbidden(string role)
    {
        var token = GenerateTestToken(role, Guid.NewGuid().ToString());
        var request = CreateAuthRequest(HttpMethod.Get, "/api/auth/admin/users", token);

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetAdminUsers_Admin_ReturnsOkWithUserList()
    {
        var adminId = Guid.NewGuid();
        var adminUser = new User
        {
            Id = adminId,
            Email = $"admin_{Guid.NewGuid()}@aegis.lk",
            FullName = "Lead Administrator",
            Role = Roles.Admin,
            PasswordHash = "hashed_pw",
            CreatedAt = DateTime.UtcNow
        };
        await SeedUserAsync(adminUser);

        var token = GenerateTestToken(Roles.Admin, adminId.ToString());
        var request = CreateAuthRequest(HttpMethod.Get, "/api/auth/admin/users", token);

        var response = await _client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var users = await response.Content.ReadFromJsonAsync<List<UserProfileResponse>>();
        Assert.NotNull(users);
        Assert.Contains(users, u => u.Id == adminId);

        // Verify PasswordHash is NOT exposed in the JSON response
        var rawJson = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("PasswordHash", rawJson, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task GetAdminUsers_FilterBySearchAndRoleAndIsActive()
    {
        var uniqueTag = Guid.NewGuid().ToString()[..8];
        var user1 = new User
        {
            Email = $"filter_do_{uniqueTag}@aegis.lk",
            FullName = $"Officer {uniqueTag}",
            Role = Roles.DisasterOfficer,
            District = "Kandy",
            IsActive = true,
            PasswordHash = "pw_hash",
            CreatedAt = DateTime.UtcNow.AddMinutes(-10)
        };
        var user2 = new User
        {
            Email = $"filter_resp_{uniqueTag}@aegis.lk",
            FullName = $"Responder {uniqueTag}",
            Role = Roles.Responder,
            District = "Colombo",
            IsActive = false,
            PasswordHash = "pw_hash",
            CreatedAt = DateTime.UtcNow.AddMinutes(-5)
        };
        await SeedUserAsync(user1);
        await SeedUserAsync(user2);

        var adminToken = GenerateTestToken(Roles.Admin, Guid.NewGuid().ToString());

        // Filter by role
        var reqRole = CreateAuthRequest(HttpMethod.Get, $"/api/auth/admin/users?role={Roles.DisasterOfficer}", adminToken);
        var resRole = await _client.SendAsync(reqRole);
        var listRole = await resRole.Content.ReadFromJsonAsync<List<UserProfileResponse>>();
        Assert.NotNull(listRole);
        Assert.All(listRole, u => Assert.Equal(Roles.DisasterOfficer, u.Role));

        // Filter by search
        var reqSearch = CreateAuthRequest(HttpMethod.Get, $"/api/auth/admin/users?search={uniqueTag}", adminToken);
        var resSearch = await _client.SendAsync(reqSearch);
        var listSearch = await resSearch.Content.ReadFromJsonAsync<List<UserProfileResponse>>();
        Assert.NotNull(listSearch);
        Assert.Equal(2, listSearch.Count(u => u.Email.Contains(uniqueTag)));

        // Filter by isActive
        var reqActive = CreateAuthRequest(HttpMethod.Get, $"/api/auth/admin/users?search={uniqueTag}&isActive=false", adminToken);
        var resActive = await _client.SendAsync(reqActive);
        var listActive = await resActive.Content.ReadFromJsonAsync<List<UserProfileResponse>>();
        Assert.NotNull(listActive);
        Assert.Single(listActive);
        Assert.False(listActive[0].IsActive);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. POST /api/auth/admin/users: Staff/Admin Provisioning
    // ──────────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task PostAdminUser_Admin_SucceedsAndHashesPassword()
    {
        var adminToken = GenerateTestToken(Roles.Admin, Guid.NewGuid().ToString());
        var newEmail = $"new_officer_{Guid.NewGuid()}@aegis.lk";
        var payload = new CreateStaffUserRequest
        {
            Email = newEmail,
            Password = "InitialPassword123!",
            FullName = "New Field Officer",
            Role = Roles.DisasterOfficer,
            District = "Ratnapura",
            PhoneNumber = "+94711223344"
        };

        var request = CreateAuthRequest(HttpMethod.Post, "/api/auth/admin/users", adminToken, JsonContent.Create(payload));
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var created = await response.Content.ReadFromJsonAsync<UserProfileResponse>();
        Assert.NotNull(created);
        Assert.Equal(newEmail.ToLowerInvariant(), created.Email);
        Assert.Equal(Roles.DisasterOfficer, created.Role);
        Assert.True(created.IsActive);

        // Verify password hash in DB
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AuthDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();
        var userInDb = await db.Users.FirstOrDefaultAsync(u => u.Email == newEmail.ToLowerInvariant());
        Assert.NotNull(userInDb);
        Assert.NotEqual("InitialPassword123!", userInDb.PasswordHash);
        var verify = hasher.VerifyHashedPassword(userInDb, userInDb.PasswordHash, "InitialPassword123!");
        Assert.Equal(PasswordVerificationResult.Success, verify);

        // Verify response body does not contain PasswordHash
        var rawJson = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("PasswordHash", rawJson, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData(Roles.Citizen)]
    [InlineData(Roles.DisasterOfficer)]
    [InlineData(Roles.Responder)]
    public async Task PostAdminUser_NonAdmin_ReturnsForbidden(string callerRole)
    {
        var token = GenerateTestToken(callerRole, Guid.NewGuid().ToString());
        var payload = new CreateStaffUserRequest
        {
            Email = $"unauth_{Guid.NewGuid()}@aegis.lk",
            Password = "Password123!",
            FullName = "Unauthorized Staff",
            Role = Roles.Responder
        };

        var request = CreateAuthRequest(HttpMethod.Post, "/api/auth/admin/users", token, JsonContent.Create(payload));
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task PostAdminUser_DuplicateEmail_Rejected()
    {
        var existingEmail = $"existing_{Guid.NewGuid()}@aegis.lk";
        await SeedUserAsync(new User
        {
            Email = existingEmail,
            FullName = "Existing User",
            Role = Roles.Citizen,
            PasswordHash = "hash"
        });

        var adminToken = GenerateTestToken(Roles.Admin, Guid.NewGuid().ToString());
        var payload = new CreateStaffUserRequest
        {
            Email = existingEmail.ToUpperInvariant(), // Test case normalization
            Password = "Password123!",
            FullName = "Duplicate User",
            Role = Roles.Responder
        };

        var request = CreateAuthRequest(HttpMethod.Post, "/api/auth/admin/users", adminToken, JsonContent.Create(payload));
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task PostAdminUser_InvalidRole_Rejected()
    {
        var adminToken = GenerateTestToken(Roles.Admin, Guid.NewGuid().ToString());
        var payload = new CreateStaffUserRequest
        {
            Email = $"invalid_role_{Guid.NewGuid()}@aegis.lk",
            Password = "Password123!",
            FullName = "Invalid Role User",
            Role = "SuperAdmin"
        };

        var request = CreateAuthRequest(HttpMethod.Post, "/api/auth/admin/users", adminToken, JsonContent.Create(payload));
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. PUT /api/auth/admin/users/{id}: Update User Profile
    // ──────────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task PutAdminUser_Admin_SucceedsAndUpdatesTimestamp()
    {
        var userId = Guid.NewGuid();
        var originalUser = new User
        {
            Id = userId,
            Email = $"original_{Guid.NewGuid()}@aegis.lk",
            FullName = "Original Name",
            Role = Roles.Citizen,
            District = "Colombo",
            PasswordHash = "original_hash",
            CreatedAt = DateTime.UtcNow.AddDays(-1),
            UpdatedAt = null
        };
        await SeedUserAsync(originalUser);

        var adminToken = GenerateTestToken(Roles.Admin, Guid.NewGuid().ToString());
        var updatePayload = new UpdateAdminUserRequest
        {
            FullName = "Updated Name Perera",
            Email = $"updated_{Guid.NewGuid()}@aegis.lk",
            Role = Roles.Responder,
            District = "Galle",
            PhoneNumber = "+94779998877",
            NewPassword = "NewSecretPassword123!"
        };

        var request = CreateAuthRequest(HttpMethod.Put, $"/api/auth/admin/users/{userId}", adminToken, JsonContent.Create(updatePayload));
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var updated = await response.Content.ReadFromJsonAsync<UserProfileResponse>();
        Assert.NotNull(updated);
        Assert.Equal("Updated Name Perera", updated.FullName);
        Assert.Equal(updatePayload.Email.ToLowerInvariant(), updated.Email);
        Assert.Equal(Roles.Responder, updated.Role);
        Assert.Equal("Galle", updated.District);
        Assert.Equal("+94779998877", updated.PhoneNumber);
        Assert.NotNull(updated.UpdatedAt);

        // Verify password was reset in DB
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AuthDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();
        var userInDb = await db.Users.FindAsync(userId);
        Assert.NotNull(userInDb);
        var verify = hasher.VerifyHashedPassword(userInDb, userInDb.PasswordHash, "NewSecretPassword123!");
        Assert.Equal(PasswordVerificationResult.Success, verify);

        // Verify PasswordHash not exposed
        var rawJson = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("PasswordHash", rawJson, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task PutAdminUser_InvalidRole_Rejected()
    {
        var userId = Guid.NewGuid();
        await SeedUserAsync(new User
        {
            Id = userId,
            Email = $"role_test_{Guid.NewGuid()}@aegis.lk",
            FullName = "User Role Test",
            Role = Roles.Citizen,
            PasswordHash = "hash"
        });

        var adminToken = GenerateTestToken(Roles.Admin, Guid.NewGuid().ToString());
        var updatePayload = new UpdateAdminUserRequest
        {
            FullName = "User Role Test",
            Email = $"role_test_{Guid.NewGuid()}@aegis.lk",
            Role = "NonExistentRole"
        };

        var request = CreateAuthRequest(HttpMethod.Put, $"/api/auth/admin/users/{userId}", adminToken, JsonContent.Create(updatePayload));
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task PutAdminUser_DuplicateEmail_Rejected()
    {
        var existingEmail = $"user_a_{Guid.NewGuid()}@aegis.lk";
        var targetUserEmail = $"user_b_{Guid.NewGuid()}@aegis.lk";
        var targetUserId = Guid.NewGuid();

        await SeedUserAsync(new User { Email = existingEmail, FullName = "User A", Role = Roles.Citizen, PasswordHash = "hash" });
        await SeedUserAsync(new User { Id = targetUserId, Email = targetUserEmail, FullName = "User B", Role = Roles.Citizen, PasswordHash = "hash" });

        var adminToken = GenerateTestToken(Roles.Admin, Guid.NewGuid().ToString());
        var updatePayload = new UpdateAdminUserRequest
        {
            FullName = "User B Updated",
            Email = existingEmail, // Duplicate of User A
            Role = Roles.Citizen
        };

        var request = CreateAuthRequest(HttpMethod.Put, $"/api/auth/admin/users/{targetUserId}", adminToken, JsonContent.Create(updatePayload));
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5. PATCH /api/auth/admin/users/{id}/status: Activate / Deactivate
    // ──────────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task PatchStatus_AdminCanDeactivateAndReactivateOtherUser()
    {
        var targetUserId = Guid.NewGuid();
        await SeedUserAsync(new User
        {
            Id = targetUserId,
            Email = $"target_{Guid.NewGuid()}@aegis.lk",
            FullName = "Target User",
            Role = Roles.Responder,
            IsActive = true,
            PasswordHash = "hash",
            CreatedAt = DateTime.UtcNow.AddHours(-1)
        });

        var adminToken = GenerateTestToken(Roles.Admin, Guid.NewGuid().ToString());

        // Deactivate
        var deactReq = CreateAuthRequest(HttpMethod.Patch, $"/api/auth/admin/users/{targetUserId}/status", adminToken,
            JsonContent.Create(new SetUserStatusRequest { IsActive = false }));
        var deactRes = await _client.SendAsync(deactReq);
        Assert.Equal(HttpStatusCode.OK, deactRes.StatusCode);

        var deactUser = await deactRes.Content.ReadFromJsonAsync<UserProfileResponse>();
        Assert.NotNull(deactUser);
        Assert.False(deactUser.IsActive);
        Assert.NotNull(deactUser.UpdatedAt);

        // Reactivate
        var reactReq = CreateAuthRequest(HttpMethod.Patch, $"/api/auth/admin/users/{targetUserId}/status", adminToken,
            JsonContent.Create(new SetUserStatusRequest { IsActive = true }));
        var reactRes = await _client.SendAsync(reactReq);
        Assert.Equal(HttpStatusCode.OK, reactRes.StatusCode);

        var reactUser = await reactRes.Content.ReadFromJsonAsync<UserProfileResponse>();
        Assert.NotNull(reactUser);
        Assert.True(reactUser.IsActive);
    }

    [Fact]
    public async Task PatchStatus_AdminCannotDeactivateThemselves()
    {
        var adminId = Guid.NewGuid();
        await SeedUserAsync(new User
        {
            Id = adminId,
            Email = $"self_admin_{Guid.NewGuid()}@aegis.lk",
            FullName = "Self Admin",
            Role = Roles.Admin,
            IsActive = true,
            PasswordHash = "hash"
        });

        // Admin token matches the target user id
        var adminToken = GenerateTestToken(Roles.Admin, adminId.ToString());

        var req = CreateAuthRequest(HttpMethod.Patch, $"/api/auth/admin/users/{adminId}/status", adminToken,
            JsonContent.Create(new SetUserStatusRequest { IsActive = false }));
        var response = await _client.SendAsync(req);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        // Verify status remains active in DB
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AuthDbContext>();
        var userInDb = await db.Users.FindAsync(adminId);
        Assert.NotNull(userInDb);
        Assert.True(userInDb.IsActive);
    }

    [Fact]
    public async Task PatchStatus_CannotDeactivateLastActiveAdmin()
    {
        var soleAdminId = Guid.NewGuid();
        await SeedUserAsync(new User
        {
            Id = soleAdminId,
            Email = $"sole_admin_{Guid.NewGuid()}@aegis.lk",
            FullName = "Sole Admin",
            Role = Roles.Admin,
            IsActive = true,
            PasswordHash = "hash"
        });

        // Another admin context (e.g. CLI or separate service token) trying to deactivate sole admin
        var otherAdminToken = GenerateTestToken(Roles.Admin, Guid.NewGuid().ToString());

        var req = CreateAuthRequest(HttpMethod.Patch, $"/api/auth/admin/users/{soleAdminId}/status", otherAdminToken,
            JsonContent.Create(new SetUserStatusRequest { IsActive = false }));
        var response = await _client.SendAsync(req);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
